export type GuestBootstrapRequest = { guestToken?: string };

export type GuestBootstrapResponse = {
  guestId: string;
  guestToken: string;
  displayName: string;
  mapId: string;
  tileX: number;
  tileY: number;
  roomIdHint: string;
};

export type GuestBootstrapErrorResponse = {
  code: 'bootstrap_failed';
  message: string;
};
