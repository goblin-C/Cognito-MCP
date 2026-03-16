import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { authMiddleware } from "./src/middleware/auth.js";
import { mcpRoute } from "./src/routes/mcp.js";

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