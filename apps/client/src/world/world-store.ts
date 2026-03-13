import type {
  MapTransitionEvent,
  NpcDialogueEvent,
  PlayerSnapshot,
  RoomErrorEvent
} from '@pokecheetos/shared';

export type WorldPlayerSnapshot = PlayerSnapshot;

export type VisibilityUpdate = {
  enter: WorldPlayerSnapshot[];
  leave: string[];
};

export type DialogueState = {
  npcId: string;
  lines: string[];
};

type WorldEvent = NpcDialogueEvent | MapTransitionEvent | RoomErrorEvent;

export class WorldStore {
  #localPlayer: WorldPlayerSnapshot | null = null;
  #visiblePlayers = new Map<string, WorldPlayerSnapshot>();
  #dialogue: DialogueState | null = null;

  setLocalPlayer(player: WorldPlayerSnapshot): void {
    this.#localPlayer = player;
  }

  getLocalPlayer(): WorldPlayerSnapshot | null {
    return this.#localPlayer;
  }

  applyVisibility(update: VisibilityUpdate): void {
    for (const leavingId of update.leave) {
      this.#visiblePlayers.delete(leavingId);
    }

    for (const enteringPlayer of update.enter) {
      if (enteringPlayer.id === this.#localPlayer?.id) {
        continue;
      }

      this.#visiblePlayers.set(enteringPlayer.id, enteringPlayer);
    }
  }

  getVisiblePlayers(): WorldPlayerSnapshot[] {
    return [...this.#visiblePlayers.values()];
  }

  handleEvent(event: WorldEvent): void {
    if (event.type === 'npc_dialogue') {
      this.#dialogue = {
        npcId: event.npcId,
        lines: [...event.lines]
      };
    }
  }

  getDialogue(): DialogueState | null {
    return this.#dialogue;
  }
}
