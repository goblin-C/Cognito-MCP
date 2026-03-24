import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { authMiddleware } from "./src/middleware/auth.js";
import { mcpRoute } from "./src/routes/mcp.js";

/**
 * Creating a simple HTTP server that listens for incoming requests and routes them to the appropriate handlers.
 * - GET /health: Health check endpoint that returns "ok" if the server is running.
 * - /mcp: All requests to this path are handled by the mcpRoute function, which manages MCP sessions and tools.
 * - All other paths return a 404 Not Found response.
 * The server uses an authentication middleware to protect the /mcp endpoint, ensuring that only authorized requests can access the MCP tools.
 * The authentication middleware checks for a valid API key in the request headers and returns a 401 Unauthorized response if the key is missing or invalid.
 */
const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === "GET" && url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }

  if (!authMiddleware(req, res)) return;

  if (url === "/mcp" && ["GET", "POST", "DELETE"].includes(method)) {
    await mcpRoute(req, res);
    return;
  }

  res.writeHead(404).end();
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`MCP cognito-mcp running on port ${PORT}`));