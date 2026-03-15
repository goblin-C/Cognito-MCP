import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import { registerTaskTools }     from "./src/tools/tasks.js";
import { registerTaskResources } from "./src/resources/tasks.js";
import { registerTaskPrompts }   from "./src/prompts/tasks.js";

const sessions = {};

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.send("ok"));

// Cursor probes POST /sse first (Streamable HTTP). Return 405 so it
// immediately falls back to SSE without waiting for a timeout.
app.post("/sse", (_req, res) => {
  res.status(405).set("Allow", "GET").json({ error: "Method Not Allowed — use GET /sse for SSE or POST /messages for JSON-RPC" });
});

app.get("/sse", async (req, res) => {
  const mcpServer = new McpServer({ name: "cognito-mcp", version: "1.0.0" });
  registerTaskTools(mcpServer);
  registerTaskResources(mcpServer);
  registerTaskPrompts(mcpServer);

  const transport = new SSEServerTransport("/messages", res);

  // Store session and flush the endpoint event to the client BEFORE connecting.
  // Cursor POSTs to /messages almost immediately after receiving the sessionId —
  // the session must be in the map before that POST arrives.
  sessions[transport.sessionId] = transport;

  res.on("close", () => {
    delete sessions[transport.sessionId];
  });

  // connect() is async and takes a moment — by storing the session above first,
  // any incoming /messages POST will find the transport even if connect() is mid-flight.
  // handlePostMessage internally queues messages until the stream is ready.
  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  const { sessionId } = req.query;
  const transport = sessions[sessionId];

  if (!transport) {
    return res.status(400).json({ error: "Unknown sessionId" });
  }

  await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`MCP cognito-mcp running on port ${PORT}`));