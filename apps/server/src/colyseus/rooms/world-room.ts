import { Room, type Client } from 'colyseus';
import { runtimeConfig } from '@pokecheetos/config';
import { loadCompiledMap } from '@pokecheetos/maps';
import type {
  Direction,
  GuestBootstrapResponse,
  MoveIntentCommand,
  NpcInteractCommand,
  NpcDialogueEvent,
  RoomErrorEvent,
  MapTransitionEvent
} from '@pokecheetos/shared';
import { isTileVisible } from '@pokecheetos/shared';
import { createNpcInteractionService, type NpcInteractionService } from '../../services/npc-interaction-service';
import { createPresenceService, type PresenceService } from '../../services/presence-service';
import {
  createWorldSimulationService,
  type WorldSimulationService
} from '../../services/world-simulation-service';
import { PlayerState } from '../schema/player-state';
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

type ReconnectReservation = {
  expiresAt: number;
  player: {
    guestId: string;
    displayName: string;
    mapId: string;
    tileX: number;
    tileY: number;
    direction: Direction;
  };
};

type WorldRoomDependencies = {
  npcInteractionService?: NpcInteractionService;
  worldSimulationService?: Pick<WorldSimulationService, 'simulateStep'>;
  presenceService?: Pick<PresenceService, 'register' | 'unregister'>;
  clientRegistry?: Map<string, RegisteredClientConnection>;
  loadMapById?: (mapId: string) => ReturnType<typeof loadCompiledMap>;
};

type RegisteredClientConnection = {
  leave: (code?: number, data?: string) => void;
  removePlayerState: () => void;
};

const defaultPresenceService = createPresenceService();
const defaultClientRegistry = new Map<string, RegisteredClientConnection>();

export class WorldRoom extends Room<WorldState> {
  private readonly npcInteractionService: NpcInteractionService;
  private readonly worldSimulationService: Pick<WorldSimulationService, 'simulateStep'>;
  private readonly presenceService: Pick<PresenceService, 'register' | 'unregister'>;
  private readonly loadMapById: (mapId: string) => ReturnType<typeof loadCompiledMap>;
  private readonly clientRegistry: Map<string, RegisteredClientConnection>;
  private readonly movementInputs = new Map<string, MovementInputState>();
  private readonly visibilityByClient = new Map<string, Set<string>>();
  private readonly reconnectReservations = new Map<string, ReconnectReservation>();

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
    this.presenceService = dependencies.presenceService ?? defaultPresenceService;
    this.loadMapById = dependencies.loadMapById ?? loadCompiledMap;
    this.clientRegistry = dependencies.clientRegistry ?? defaultClientRegistry;
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

  onJoin(client: Pick<Client, 'sessionId' | 'leave'>, options: GuestBootstrapResponse): void {
    this.cleanupExpiredReconnectReservations();

    const registration = this.presenceService.register({
      connectionId: client.sessionId,
      guestId: options.guestId,
      roomId: this.roomId
    });

    if (registration.displaced) {
      const displacedClient = this.clientRegistry.get(registration.displaced.connectionId);
      displacedClient?.removePlayerState();
      this.clientRegistry.delete(registration.displaced.connectionId);
      displacedClient?.leave(4000, 'duplicate guest connection');
    }

    this.state.players.set(client.sessionId, this.resolveJoinPlayerState(options));
    this.clientRegistry.set(client.sessionId, {
      leave: (code?: number, data?: string) => client.leave(code, data),
      removePlayerState: () => this.removePlayerState(client.sessionId)
    });
  }

  onLeave(client: Pick<Client, 'sessionId'>, consented?: boolean): void {
    this.cleanupExpiredReconnectReservations();

    if (!consented) {
      this.reserveForReconnect(client.sessionId);
    }

    this.presenceService.unregister(client.sessionId);
    this.removePlayerState(client.sessionId);
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

  private resolveJoinPlayerState(identity: GuestBootstrapResponse): PlayerState {
    const reservation = this.reconnectReservations.get(identity.guestId);
    if (!reservation) {
      return this.createPlayerState(identity);
    }

    this.reconnectReservations.delete(identity.guestId);
    const player = new PlayerState();
    player.guestId = reservation.player.guestId;
    player.displayName = reservation.player.displayName;
    player.mapId = reservation.player.mapId;
    player.tileX = reservation.player.tileX;
    player.tileY = reservation.player.tileY;
    player.direction = reservation.player.direction;
    return player;
  }

  private createPlayerState(identity: GuestBootstrapResponse): PlayerState {
    const player = new PlayerState();
    player.guestId = identity.guestId;
    player.displayName = identity.displayName;
    player.mapId = identity.mapId;
    player.tileX = identity.tileX;
    player.tileY = identity.tileY;
    player.direction = 'down';
    return player;
  }

  private reserveForReconnect(clientSessionId: string): void {
    const player = this.state.players.get(clientSessionId);
    if (!player) {
      return;
    }

    this.reconnectReservations.set(player.guestId, {
      expiresAt: Date.now() + runtimeConfig.reconnectWindowMs,
      player: {
        guestId: player.guestId,
        displayName: player.displayName,
        mapId: player.mapId,
        tileX: player.tileX,
        tileY: player.tileY,
        direction: player.direction
      }
    });
  }

  private cleanupExpiredReconnectReservations(): void {
    const now = Date.now();

    for (const [guestId, reservation] of this.reconnectReservations.entries()) {
      if (reservation.expiresAt <= now) {
        this.reconnectReservations.delete(guestId);
      }
    }
  }

  private removePlayerState(clientSessionId: string): void {
    this.movementInputs.delete(clientSessionId);
    this.visibilityByClient.delete(clientSessionId);
    this.state.players.delete(clientSessionId);
    this.clientRegistry.delete(clientSessionId);

    for (const visibleSet of this.visibilityByClient.values()) {
      visibleSet.delete(clientSessionId);
    }
  }
}
