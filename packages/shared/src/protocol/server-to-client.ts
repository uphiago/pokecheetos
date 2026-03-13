export type RoomErrorEvent = {
  type: 'room_error';
  code: 'room_join_failed' | 'room_full' | 'invalid_interaction';
  message: string;
};

export type NpcDialogueEvent = {
  type: 'npc_dialogue';
  npcId: string;
  lines: string[];
};

export type MapTransitionEvent = {
  type: 'map_transition';
  mapId: string;
  roomIdHint: string;
};
