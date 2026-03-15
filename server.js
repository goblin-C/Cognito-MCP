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

app.get("/sse", async (req, res) => {
  // Fresh McpServer per client connection — connect() can only be called once per instance
  const mcpServer = new McpServer({ name: "cognito-mcp", version: "1.0.0" });
  registerTaskTools(mcpServer);
  registerTaskResources(mcpServer);
  registerTaskPrompts(mcpServer);

  const transport = new SSEServerTransport("/messages", res);
  sessions[transport.sessionId] = transport;

  res.on("close", () => {
    delete sessions[transport.sessionId];
  });

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