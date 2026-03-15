
// eslint-disable-next-line @typescript-eslint/no-deprecated
import dotenv from "dotenv";
dotenv.config();
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerTaskTools }     from "./src/tools/tasks.js";
import { registerTaskResources } from "./src/resources/tasks.js";
import { registerTaskPrompts }   from "./src/prompts/tasks.js";

/* ── MCP server ─────────────────────────────────────────── */

const mcpServer = new McpServer({ name: "cognito-mcp", version: "1.0.0" });

registerTaskTools(mcpServer);
registerTaskResources(mcpServer);
registerTaskPrompts(mcpServer);

/* ── Session store (one SSEServerTransport per client) ──── */

const sessions = {};   // sessionId → transport

/* ── Express ────────────────────────────────────────────── */

const app = express();
app.use(express.json());

// Health check — Render pings this to keep the service alive
app.get("/health", (_req, res) => res.send("ok"));

// Client opens this endpoint to establish the SSE stream
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  sessions[transport.sessionId] = transport;

  res.on("close", () => {
    delete sessions[transport.sessionId];
  });

  await mcpServer.connect(transport);
});

// Client POSTs JSON-RPC messages here
app.post("/messages", async (req, res) => {
  const { sessionId } = req.query;
  const transport = sessions[sessionId];

  if (!transport) {
    return res.status(400).json({ error: "Unknown sessionId" });
  }

  await transport.handlePostMessage(req, res);
});

/* ── Start ───────────────────────────────────────────────── */

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`MCP task-server running on port ${PORT}`));