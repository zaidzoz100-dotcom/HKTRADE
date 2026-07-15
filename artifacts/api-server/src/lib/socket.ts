import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { PriceSnapshot } from "./priceFeed";
import { logger } from "./logger";

/**
 * Server-push layer for live price data. Design goal: adding more connected
 * clients must NOT increase load on upstream price APIs or on the server's
 * own CPU/DB usage. This is achieved by keeping a single upstream poll loop
 * (see `priceFeed.ts`) that fetches once per tick regardless of how many
 * clients are connected, then fanning that one result out to every socket
 * with a single `io.emit()` broadcast — O(1) upstream cost, O(n) cheap
 * in-memory writes for the broadcast itself.
 */

let io: SocketIOServer | null = null;
let connectedClients = 0;

const SOCKET_PATH = "/api/socket.io";

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: SOCKET_PATH,
    cors: { origin: true, credentials: true },
    // Keep the connection table lean under many concurrent users: drop
    // sockets that go quiet (tab backgrounded, network drop) instead of
    // holding them open indefinitely.
    pingInterval: 20_000,
    pingTimeout: 10_000,
  });

  io.on("connection", (socket) => {
    connectedClients++;
    logger.debug({ connectedClients }, "Socket client connected");

    // Push the latest known snapshot immediately on connect so a new client
    // sees data right away instead of waiting for the next poll tick.
    const snapshot = latestSnapshotForNewConnections?.();
    if (snapshot) {
      socket.emit("prices:update", snapshot);
    }

    socket.on("disconnect", () => {
      connectedClients--;
      logger.debug({ connectedClients }, "Socket client disconnected");
    });
  });

  logger.info({ path: SOCKET_PATH }, "Socket.io server initialized");
  return io;
}

// Set by priceFeed.ts so a freshly-connected socket can be caught up
// immediately without this module importing priceFeed (avoids a cycle).
let latestSnapshotForNewConnections: (() => PriceSnapshot | null) | null = null;

export function registerSnapshotProvider(fn: () => PriceSnapshot | null): void {
  latestSnapshotForNewConnections = fn;
}

/**
 * Broadcasts a price snapshot to every connected client in a single call.
 * Cost is independent of how many clients are connected — Socket.io's
 * `emit` does the fan-out internally without per-client server work on our
 * side (no loops, no per-user queries).
 */
export function broadcastPriceSnapshot(snapshot: PriceSnapshot): void {
  io?.emit("prices:update", snapshot);
}

export function getConnectedClientCount(): number {
  return connectedClients;
}
