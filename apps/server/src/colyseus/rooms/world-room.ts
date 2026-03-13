import { Room, type Client } from 'colyseus';
import { runtimeConfig } from '@pokecheetos/config';
import { loadCompiledMap } from '@pokecheetos/maps';
import type {
  Direction,
  MoveIntentCommand,
  NpcInteractCommand,
  NpcDialogueEvent,
  RoomErrorEvent,
  MapTransitionEvent
} from '@pokecheetos/shared';
import { isTileVisible } from '@pokecheetos/shared';
import { createNpcInteractionService, type NpcInteractionService } from '../../services/npc-interaction-service';
import {
  createWorldSimulationService,
  type WorldSimulationService
} from '../../services/world-simulation-service';
import { WorldState } from '../schema/world-state';

export type WorldRoomOptions = Readonly<{
  mapId: string;
  roomId: string;
  maxClients: number;
}>;

type MovementInputState = {
  heldDirection?: Direction;
  bufferedDirection?: Direction;
};

type WorldRoomDependencies = {
  npcInteractionService?: NpcInteractionService;
  worldSimulationService?: Pick<WorldSimulationService, 'simulateStep'>;
  loadMapById?: (mapId: string) => ReturnType<typeof loadCompiledMap>;
};

export class WorldRoom extends Room<WorldState> {
  private readonly npcInteractionService: NpcInteractionService;
  private readonly worldSimulationService: Pick<WorldSimulationService, 'simulateStep'>;
  private readonly loadMapById: (mapId: string) => ReturnType<typeof loadCompiledMap>;
  private readonly movementInputs = new Map<string, MovementInputState>();
  private readonly visibilityByClient = new Map<string, Set<string>>();

  constructor(dependencies: WorldRoomDependencies = {}) {
    super();
    this.npcInteractionService =
      dependencies.npcInteractionService ??
      createNpcInteractionService({
        resolveDialogueLines: (textId) => [textId]
      });
    this.worldSimulationService =
      dependencies.worldSimulationService ??
      createWorldSimulationService({
        updateLastKnownState() {
          // Persistence wiring will inject the real repository in a future room factory.
        },
        updateLastSeenAt() {
          // Persistence wiring will inject the real repository in a future room factory.
        }
      });
    this.loadMapById = dependencies.loadMapById ?? loadCompiledMap;
  }

  onCreate(options: WorldRoomOptions) {
    this.autoDispose = false;
    this.maxClients = options.maxClients;
    this.patchRate = Math.round(1_000 / runtimeConfig.serverTickRate);
    this.roomId = options.roomId;
    this.setState(
      new WorldState({
        mapId: options.mapId,
        roomId: options.roomId
      })
    );

    this.onMessage('move_intent', (client: Client, message: MoveIntentCommand) => {
      this.handleMoveIntent(client, message);
    });

    this.onMessage('npc_interact', (client: Client, message: NpcInteractCommand) => {
      this.handleNpcInteract(client, message.npcId);
    });

    this.setSimulationInterval(() => {
      for (const client of this.clients) {
        this.simulateStepForClient(client);
      }
    }, this.patchRate);
  }

  onLeave(client: Pick<Client, 'sessionId'>): void {
    this.movementInputs.delete(client.sessionId);
    this.visibilityByClient.delete(client.sessionId);

    for (const visibleSet of this.visibilityByClient.values()) {
      visibleSet.delete(client.sessionId);
    }
  }

  handleMoveIntent(
    client: Pick<Client, 'sessionId'>,
    command: Pick<MoveIntentCommand, 'direction' | 'pressed'>
  ): void {
    const current = this.movementInputs.get(client.sessionId) ?? {};

    if (command.pressed) {
      if (!current.heldDirection) {
        current.heldDirection = command.direction;
      } else if (current.heldDirection !== command.direction) {
        current.bufferedDirection = command.direction;
      }
    } else {
      if (current.heldDirection === command.direction) {
        current.heldDirection = undefined;
      }

      if (current.bufferedDirection === command.direction) {
        current.bufferedDirection = undefined;
      }
    }

    if (!current.heldDirection && !current.bufferedDirection) {
      this.movementInputs.delete(client.sessionId);
      return;
    }

    this.movementInputs.set(client.sessionId, current);
  }

  getMovementInput(clientSessionId: string): Readonly<MovementInputState> {
    return this.movementInputs.get(clientSessionId) ?? {};
  }

  consumeBufferedDirection(clientSessionId: string): void {
    const current = this.movementInputs.get(clientSessionId);
    if (!current?.bufferedDirection) {
      return;
    }

    current.heldDirection = current.bufferedDirection;
    current.bufferedDirection = undefined;
    this.movementInputs.set(clientSessionId, current);
  }

  simulateStepForClient(client: Pick<Client, 'sessionId' | 'send'>): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    const movementInput = this.getMovementInput(client.sessionId);
    const simulationResult = this.worldSimulationService.simulateStep({
      guestId: player.guestId,
      heldDirection: movementInput.heldDirection,
      bufferedDirection: movementInput.bufferedDirection,
      player: {
        mapId: player.mapId,
        tileX: player.tileX,
        tileY: player.tileY,
        direction: player.direction
      },
      compiledMap: this.loadMapById(player.mapId || this.state.mapId),
      loadMapById: this.loadMapById
    });

    player.mapId = simulationResult.player.mapId;
    player.tileX = simulationResult.player.tileX;
    player.tileY = simulationResult.player.tileY;
    player.direction = simulationResult.player.direction;

    if (simulationResult.consumedBufferedDirection) {
      this.consumeBufferedDirection(client.sessionId);
    }

    this.computeVisibilityDiff(client.sessionId);

    if (simulationResult.transition) {
      const transitionEvent: MapTransitionEvent = {
        type: 'map_transition',
        mapId: simulationResult.transition.mapId,
        roomIdHint: simulationResult.transition.roomIdHint
      };
      client.send(transitionEvent.type, transitionEvent);
    }
  }

  computeVisibilityDiff(clientSessionId: string): { entered: string[]; left: string[] } {
    const observer = this.state.players.get(clientSessionId);
    if (!observer) {
      this.visibilityByClient.delete(clientSessionId);
      return { entered: [], left: [] };
    }

    const visibleNow = new Set<string>();

    for (const [otherSessionId, otherPlayer] of this.state.players.entries()) {
      if (otherSessionId === clientSessionId) {
        continue;
      }

      if (otherPlayer.mapId !== observer.mapId) {
        continue;
      }

      if (
        isTileVisible(
          { tileX: observer.tileX, tileY: observer.tileY },
          { tileX: otherPlayer.tileX, tileY: otherPlayer.tileY },
          runtimeConfig.visibilityWindow
        )
      ) {
        visibleNow.add(otherSessionId);
      }
    }

    const previouslyVisible = this.visibilityByClient.get(clientSessionId) ?? new Set<string>();
    const entered = [...visibleNow].filter((id) => !previouslyVisible.has(id));
    const left = [...previouslyVisible].filter((id) => !visibleNow.has(id));

    this.visibilityByClient.set(clientSessionId, visibleNow);

    return { entered, left };
  }

  handleNpcInteract(client: Pick<Client, 'sessionId' | 'send'>, npcId: string): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      this.sendRoomError(client, 'No active player state for this client');
      return;
    }

    const compiledMap = this.loadMapById(player.mapId || this.state.mapId);
    const result = this.npcInteractionService.interact({
      compiledMap,
      npcId,
      player: {
        tileX: player.tileX,
        tileY: player.tileY,
        direction: player.direction
      }
    });

    if (!result.ok) {
      this.sendRoomError(client, result.message);
      return;
    }

    const dialogueEvent: NpcDialogueEvent = {
      type: 'npc_dialogue',
      npcId: result.npcId,
      lines: result.lines
    };
    client.send(dialogueEvent.type, dialogueEvent);
  }

  private sendRoomError(client: Pick<Client, 'send'>, message: string): void {
    const errorEvent: RoomErrorEvent = {
      type: 'room_error',
      code: 'invalid_interaction',
      message
    };
    client.send(errorEvent.type, errorEvent);
  }
}
