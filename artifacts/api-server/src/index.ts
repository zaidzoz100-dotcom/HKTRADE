import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initSocketServer } from "./lib/socket";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Socket.io needs the raw http.Server (not just the Express app) so it can
// hijack the upgrade handshake for WebSocket connections on the same port.
const httpServer = createServer(app);
initSocketServer(httpServer);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
