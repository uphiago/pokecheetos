export type PresenceConnection = {
  connectionId: string;
  guestId: string;
  roomId: string;
};

export type PresenceRegistrationResult = {
  accepted: PresenceConnection;
  displaced?: PresenceConnection;
};

export type PresenceService = ReturnType<typeof createPresenceService>;

export function createPresenceService() {
  const byGuestId = new Map<string, PresenceConnection>();
  const byConnectionId = new Map<string, PresenceConnection>();

  return {
    register(connection: PresenceConnection): PresenceRegistrationResult {
      const displaced = byGuestId.get(connection.guestId);

      if (displaced) {
        byConnectionId.delete(displaced.connectionId);
      }

      byGuestId.set(connection.guestId, connection);
      byConnectionId.set(connection.connectionId, connection);

      return displaced?.connectionId === connection.connectionId
        ? { accepted: connection }
        : { accepted: connection, displaced };
    },

    unregister(connectionId: string): void {
      const connection = byConnectionId.get(connectionId);
      if (!connection) {
        return;
      }

      byConnectionId.delete(connectionId);

      if (byGuestId.get(connection.guestId)?.connectionId === connectionId) {
        byGuestId.delete(connection.guestId);
      }
    },

    getByGuestId(guestId: string): PresenceConnection | undefined {
      return byGuestId.get(guestId);
    },

    getByConnectionId(connectionId: string): PresenceConnection | undefined {
      return byConnectionId.get(connectionId);
    }
  };
}
