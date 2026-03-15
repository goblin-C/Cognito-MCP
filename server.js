import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { registerTaskTools }     from "./src/tools/tasks.js";
import { registerTaskResources } from "./src/resources/tasks.js";
import { registerTaskPrompts }   from "./src/prompts/tasks.js";

const API_KEY = process.env.MCP_API_KEY;

/* ── MCP server + transport ──────────────────────────────── */

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});

const mcpServer = new McpServer({ name: "cognito-mcp", version: "1.0.0" });
registerTaskTools(mcpServer);
registerTaskResources(mcpServer);
registerTaskPrompts(mcpServer);
await mcpServer.connect(transport);

/* ── Session store ───────────────────────────────────────── */

const sessions = new Map(); // sessionId → { transport, mcpServer }

/* ── Request handler ─────────────────────────────────────── */

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  // Health check
  if (method === "GET" && url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }

  // Auth
  if (API_KEY && req.headers["x-api-key"] !== API_KEY) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized — invalid or missing x-api-key" }));
    return;
  }

  // MCP endpoint
  if (url === "/mcp" && method === "POST") {
    const sessionId = req.headers["mcp-session-id"];

    let transport;

    if (sessionId && sessions.has(sessionId)) {
      // Existing session — reuse transport
      transport = sessions.get(sessionId).transport;
    } else {
      // New session — fresh transport + server per client
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      });
      const mcpServer = new McpServer({ name: "cognito-mcp", version: "1.0.0" });
      registerTaskTools(mcpServer);
      registerTaskResources(mcpServer);
      registerTaskPrompts(mcpServer);
      await mcpServer.connect(transport);

      // Store once the session ID is assigned (after connect)
      if (transport.sessionId) {
        sessions.set(transport.sessionId, { transport, mcpServer });
      }
    }

    await transport.handleRequest(req, res);
    return;
  }

  // 404
  res.writeHead(404).end();
});

/* ── Start ───────────────────────────────────────────────── */

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`MCP cognito-mcp running on port ${PORT}`));