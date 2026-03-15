import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { registerTaskTools }     from "./src/tools/tasks.js";
import { registerTaskResources } from "./src/resources/tasks.js";
import { registerTaskPrompts }   from "./src/prompts/tasks.js";

const API_KEY = process.env.MCP_API_KEY;

/* ── Auth ────────────────────────────────────────────────── */

function requireApiKey(req, res, next) {
  if (!API_KEY) return next();
  const key = req.headers["x-api-key"];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized — invalid or missing x-api-key" });
  }
  next();
}

/* ── Express ─────────────────────────────────────────────── */

const app = express();

app.get("/health", (_req, res) => res.send("ok"));
app.get("/version", (_req, res) => res.json({ version: "4", transport: "streamable-http" }));

/* ── Single MCP endpoint ─────────────────────────────────── */

// One transport instance shared across all sessions
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});

const mcpServer = new McpServer({ name: "cognito-mcp", version: "1.0.0" });
registerTaskTools(mcpServer);
registerTaskResources(mcpServer);
registerTaskPrompts(mcpServer);
await mcpServer.connect(transport);

// All MCP traffic — init, tool calls, responses — goes through POST /mcp
app.post("/mcp", requireApiKey, express.json(), async (req, res) => {
  await transport.handleRequest(req, res);
});

// GET /mcp for server-initiated messages (optional but recommended)
app.get("/mcp", requireApiKey, async (req, res) => {
  await transport.handleRequest(req, res);
});

// DELETE /mcp for session cleanup
app.delete("/mcp", requireApiKey, async (req, res) => {
  await transport.handleRequest(req, res);
});

/* ── Start ───────────────────────────────────────────────── */

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`MCP cognito-mcp running on port ${PORT}`));