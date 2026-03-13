import { Room, type Client } from 'colyseus';
import { runtimeConfig } from '@pokecheetos/config';
import { loadCompiledMap } from '@pokecheetos/maps';
import type { NpcInteractCommand, NpcDialogueEvent, RoomErrorEvent } from '@pokecheetos/shared';
import { createNpcInteractionService, type NpcInteractionService } from '../../services/npc-interaction-service';
import { WorldState } from '../schema/world-state';

export type WorldRoomOptions = Readonly<{
  mapId: string;
  roomId: string;
  maxClients: number;
}>;

export class WorldRoom extends Room<WorldState> {
  private readonly npcInteractionService: NpcInteractionService;

  constructor() {
    super();
    this.npcInteractionService = createNpcInteractionService({
      resolveDialogueLines: (textId) => [textId]
    });
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

    this.onMessage('npc_interact', (client: Client, message: NpcInteractCommand) => {
      this.handleNpcInteract(client, message.npcId);
    });
  }

  handleNpcInteract(client: Pick<Client, 'sessionId' | 'send'>, npcId: string): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      this.sendRoomError(client, 'No active player state for this client');
      return;
    }

    const compiledMap = loadCompiledMap(player.mapId || this.state.mapId);
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
