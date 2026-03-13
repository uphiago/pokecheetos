import { Protocol, Room, type Client, type RoomException } from 'colyseus';
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
import { logger } from '../../logging/logger';
import { createNpcInteractionService, type NpcInteractionService } from '../../services/npc-interaction-service';
import { createPresenceService, type PresenceService } from '../../services/presence-service';
import {
  createWorldSimulationService,
  type WorldSimulationService
} from '../../services/world-simulation-service';
import type { ReturnTypeCreatePlayerRepository } from '../../services/types';
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
  playerRepository?: Pick<ReturnTypeCreatePlayerRepository, 'updateLastKnownState' | 'updateLastSeenAt'>;
  presenceService?: Pick<PresenceService, 'register' | 'unregister'>;
  clientRegistry?: Map<string, RegisteredClientConnection>;
  loadMapById?: (mapId: string) => ReturnType<typeof loadCompiledMap>;
};

type RegisteredClientConnection = {
  leave: (code?: number, data?: string) => void;
  removePlayerState: () => void;
};

type DiagnosticClient = Pick<Client, 'sessionId'> & {
  leave?: (code?: number, data?: string) => void;
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
  private readonly lastMovedAt = new Map<string, number>();
  private static readonly MOVE_DELAY_MS = 200; // ~5 tiles/sec (Pokémon feel)
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
      createWorldSimulationService(
        dependencies.playerRepository ?? {
          updateLastKnownState() {
            // Persistence wiring can inject the real repository in room factory composition.
          },
          updateLastSeenAt() {
            // Persistence wiring can inject the real repository in room factory composition.
          }
        }
      );
    this.presenceService = dependencies.presenceService ?? defaultPresenceService;
    this.loadMapById = dependencies.loadMapById ?? loadCompiledMap;
    this.clientRegistry = dependencies.clientRegistry ?? defaultClientRegistry;
  }

  onCreate(options: WorldRoomOptions) {
    const state = new WorldState();
    state.mapId = options.mapId;
    state.roomId = options.roomId;

    this.autoDispose = false;
    this.maxClients = options.maxClients;
    this.patchRate = Math.round(1_000 / runtimeConfig.serverTickRate);
    this.setState(state);

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

  async onJoin(client: Pick<Client, 'sessionId' | 'leave'>, options: GuestBootstrapResponse): Promise<void> {
    try {
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

      const playerState = this.resolveJoinPlayerState(options);
      this.state.players.set(client.sessionId, playerState);
      this.sanitizeSchemaPlayers();

      this.clientRegistry.set(client.sessionId, {
        leave: (code?: number, data?: string) => client.leave(code, data),
        removePlayerState: () => this.removePlayerState(client.sessionId)
      });
    } catch (error) {
      logger.error(
        {
          event: 'room_join_failed',
          phase: 'join',
          requestId: options.requestId,
          guestId: options.guestId,
          sessionId: client.sessionId,
          roomId: this.state?.roomId ?? this.roomId,
          mapId: options.mapId ?? this.state?.mapId,
          error
        },
        'room join failed'
      );
      this.safeLeaveClient(client, 'room join failed');
      throw error;
    }
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

    const now = Date.now();
    const lastMoved = this.lastMovedAt.get(client.sessionId) ?? 0;
    const movementReady = now - lastMoved >= WorldRoom.MOVE_DELAY_MS;
    const movementInput = this.getMovementInput(client.sessionId);

    if (!movementReady) {
      // Cooldown active: update facing direction only, skip movement simulation
      const facingDir = movementInput.heldDirection ?? movementInput.bufferedDirection;
      if (facingDir) player.direction = facingDir;
      return;
    }

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

    if (simulationResult.moved) {
      this.lastMovedAt.set(client.sessionId, now);
    }

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

  override sendFullState(client: Client): void {
    try {
      super.sendFullState(client);
    } catch (error) {
      const player = this.state.players.get(client.sessionId);

      logger.error(
        {
          event: 'room_full_state_failed',
          phase: 'serialize',
          guestId: player?.guestId,
          sessionId: client.sessionId,
          roomId: this.state?.roomId ?? this.roomId,
          mapId: player?.mapId ?? this.state?.mapId,
          error
        },
        'room full state serialization failed'
      );

      this.safeLeaveClient(client, 'room full state failed');
    }
  }

  override broadcastPatch(): boolean {
    try {
      return super.broadcastPatch();
    } catch (error) {
      logger.error(
        {
          event: 'room_state_patch_failed',
          phase: 'serialize',
          roomId: this.state?.roomId ?? this.roomId,
          mapId: this.state?.mapId,
          sessionIds: this.clients.map((client) => client.sessionId),
          guestIds: this.clients
            .map((client) => this.state.players.get(client.sessionId)?.guestId)
            .filter((guestId): guestId is string => Boolean(guestId)),
          error
        },
        'room state patch serialization failed'
      );

      for (const client of this.clients) {
        this.safeLeaveClient(client, 'room state patch failed');
      }

      return false;
    }
  }

  onUncaughtException(
    error: RoomException<this>,
    methodName: 'onCreate' | 'onAuth' | 'onJoin' | 'onLeave' | 'onDispose' | 'onMessage' | 'setSimulationInterval' | 'setInterval' | 'setTimeout'
  ): void {
    const context = this.buildExceptionContext(error, methodName);

    logger.error(
      {
        ...context,
        error: error.cause instanceof Error ? error.cause : error,
        exceptionName: error.name
      },
      context.message
    );

    if ('client' in error && error.client) {
      const reason = methodName === 'onJoin' ? 'room join failed' : 'room runtime failed';
      this.safeLeaveClient(error.client, reason);
    }
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
    player.guestId = reservation.player.guestId || identity.guestId;
    player.displayName = reservation.player.displayName || identity.displayName || 'Guest';
    player.mapId = reservation.player.mapId || identity.mapId || this.state.mapId || 'town';
    player.tileX = Number.isFinite(reservation.player.tileX) ? reservation.player.tileX : identity.tileX || 0;
    player.tileY = Number.isFinite(reservation.player.tileY) ? reservation.player.tileY : identity.tileY || 0;
    player.direction = reservation.player.direction || 'down';
    return player;
  }

  private createPlayerState(identity: GuestBootstrapResponse): PlayerState {
    const player = new PlayerState();
    player.guestId = identity.guestId;
    player.displayName = identity.displayName || 'Guest';
    player.mapId = identity.mapId || this.state.mapId || 'town';
    player.tileX = Number.isFinite(identity.tileX) ? identity.tileX : 0;
    player.tileY = Number.isFinite(identity.tileY) ? identity.tileY : 0;
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

  private safeLeaveClient(client: DiagnosticClient, reason: string): void {
    try {
      client.leave?.(Protocol.WS_CLOSE_WITH_ERROR, reason);
    } catch (error) {
      logger.error(
        {
          event: 'room_client_leave_failed',
          phase: 'leave',
          sessionId: client.sessionId,
          roomId: this.roomId,
          mapId: this.state?.mapId,
          error
        },
        'room client leave failed'
      );
    }
  }

  private buildExceptionContext(
    error: RoomException<this>,
    methodName: 'onCreate' | 'onAuth' | 'onJoin' | 'onLeave' | 'onDispose' | 'onMessage' | 'setSimulationInterval' | 'setInterval' | 'setTimeout'
  ): Record<string, unknown> & { message: string } {
    const context: Record<string, unknown> & { message: string } = {
      event: 'room_uncaught_exception',
      phase: 'lifecycle',
      roomId: this.roomId,
      mapId: this.state?.mapId,
      message: 'room lifecycle failed'
    };

    if (methodName === 'onJoin' && 'options' in error) {
      const joinOptions = error.options as Partial<GuestBootstrapResponse> | undefined;
      context.event = 'room_join_failed';
      context.phase = 'join';
      context.message = 'room join failed';
      context.requestId = joinOptions?.requestId;
      context.guestId = joinOptions?.guestId;
      context.mapId = joinOptions?.mapId ?? this.state?.mapId;
    } else if (methodName === 'onMessage' && 'type' in error) {
      const player = this.state.players.get(error.client.sessionId);
      context.event = 'room_message_failed';
      context.phase = error.type === 'npc_interact' ? 'interact' : 'simulate';
      context.message = 'room message failed';
      context.guestId = player?.guestId;
      context.sessionId = error.client.sessionId;
      context.messageType = error.type;
      context.mapId = player?.mapId ?? this.state?.mapId;
    } else if (methodName === 'setSimulationInterval') {
      context.event = 'room_simulation_failed';
      context.phase = 'simulate';
      context.message = 'room simulation failed';
      context.sessionIds = this.clients.map((client) => client.sessionId);
      context.guestIds = this.clients
        .map((client) => this.state.players.get(client.sessionId)?.guestId)
        .filter((guestId): guestId is string => Boolean(guestId));
    } else if (methodName === 'onLeave' && 'client' in error) {
      const player = this.state.players.get(error.client.sessionId);
      context.event = 'room_leave_failed';
      context.phase = 'leave';
      context.message = 'room leave failed';
      context.guestId = player?.guestId;
      context.sessionId = error.client.sessionId;
      context.mapId = player?.mapId ?? this.state?.mapId;
    }

    if ('client' in error && error.client && context.sessionId === undefined) {
      context.sessionId = error.client.sessionId;
    }

    return context;
  }

  private removePlayerState(clientSessionId: string): void {
    this.movementInputs.delete(clientSessionId);
    this.lastMovedAt.delete(clientSessionId);
    this.visibilityByClient.delete(clientSessionId);
    this.state.players.delete(clientSessionId);
    this.clientRegistry.delete(clientSessionId);

    for (const visibleSet of this.visibilityByClient.values()) {
      visibleSet.delete(clientSessionId);
    }
  }

  private sanitizeSchemaPlayers(): void {
    for (const [sessionId, player] of this.state.players.entries()) {
      if (player instanceof PlayerState) {
        continue;
      }

      this.state.players.delete(sessionId);
    }
  }
}
