import type { Direction } from '@pokecheetos/shared';
import { getNpcById, type CompiledMap } from '@pokecheetos/maps';

type PlayerState = Readonly<{
  tileX: number;
  tileY: number;
  direction: Direction;
}>;

type InteractionRequest = Readonly<{
  compiledMap: CompiledMap;
  npcId: string;
  player: PlayerState;
}>;

type SuccessfulInteraction = Readonly<{
  ok: true;
  npcId: string;
  textId: string;
  lines: string[];
}>;

type FailedInteraction = Readonly<{
  ok: false;
  code: 'npc_not_found' | 'npc_not_adjacent' | 'npc_wrong_facing';
  message: string;
}>;

export type NpcInteractionResult = SuccessfulInteraction | FailedInteraction;

export type NpcInteractionService = Readonly<{
  interact(request: InteractionRequest): NpcInteractionResult;
}>;

export function createNpcInteractionService(options?: {
  resolveDialogueLines?: (textId: string) => string[];
}): NpcInteractionService {
  const resolveDialogueLines = options?.resolveDialogueLines ?? ((textId: string) => [textId]);

  return {
    interact(request) {
      const npc = getNpcById(request.compiledMap, request.npcId);
      if (!npc) {
        return {
          ok: false,
          code: 'npc_not_found',
          message: `NPC ${request.npcId} was not found on map ${request.compiledMap.mapId}`
        };
      }

      const deltaX = Math.abs(request.player.tileX - npc.tileX);
      const deltaY = Math.abs(request.player.tileY - npc.tileY);
      const manhattanDistance = deltaX + deltaY;

      if (manhattanDistance !== 1) {
        return {
          ok: false,
          code: 'npc_not_adjacent',
          message: `NPC ${npc.id} is not adjacent to player`
        };
      }

      const facingTile = getFacingTile(request.player);
      if (facingTile.tileX !== npc.tileX || facingTile.tileY !== npc.tileY) {
        return {
          ok: false,
          code: 'npc_wrong_facing',
          message: `Player is not facing NPC ${npc.id}`
        };
      }

      return {
        ok: true,
        npcId: npc.id,
        textId: npc.textId,
        lines: resolveDialogueLines(npc.textId)
      };
    }
  };
}

function getFacingTile(player: PlayerState) {
  if (player.direction === 'up') {
    return { tileX: player.tileX, tileY: player.tileY - 1 };
  }
  if (player.direction === 'down') {
    return { tileX: player.tileX, tileY: player.tileY + 1 };
  }
  if (player.direction === 'left') {
    return { tileX: player.tileX - 1, tileY: player.tileY };
  }
  return { tileX: player.tileX + 1, tileY: player.tileY };
}
