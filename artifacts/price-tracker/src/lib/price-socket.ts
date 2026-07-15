import { io, type Socket } from "socket.io-client";
import type { PriceSnapshot } from "@workspace/api-client-react";

// Socket.io path is namespaced under /api so it rides through the same
// proxy path already allowed for REST calls (see api-server's artifact.toml
// `paths = ["/api"]`) — no extra proxy configuration needed.
const SOCKET_PATH = "/api/socket.io";

let socket: Socket | null = null;

/**
 * Lazily creates a single shared socket connection for the whole app (one
 * WebSocket per browser tab, not one per component/hook instance).
 * `autoConnect: true` + Socket.io's built-in reconnection backoff means a
 * dropped connection (tab backgrounded, brief network loss) recovers on its
 * own without the app needing to manage retry logic.
 */
export function getPriceSocket(): Socket {
  if (!socket) {
    socket = io({
      path: SOCKET_PATH,
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }
  return socket;
}

export function onPriceUpdate(callback: (snapshot: PriceSnapshot) => void): () => void {
  const s = getPriceSocket();
  s.on("prices:update", callback);
  return () => {
    s.off("prices:update", callback);
  };
}
