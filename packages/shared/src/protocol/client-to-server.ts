import type { Direction } from '../grid/direction';

export type MoveIntentCommand = {
  type: 'move_intent';
  direction: Direction;
  pressed: boolean;
};

export type NpcInteractCommand = {
  type: 'npc_interact';
  npcId: string;
};
