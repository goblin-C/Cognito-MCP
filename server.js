import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Readable } from "stream";
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

/* ── Raw body reader ─────────────────────────────────────── */

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

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
  if (url === "/mcp") {
    if (method === "POST") {
      try {
        const raw = await readBody(req);
        // SDK reads the stream directly — replay the consumed body as a new readable
        const readable = Readable.from([raw]);
        const fakeReq = Object.assign(readable, {
          headers: req.headers,
          method:  req.method,
          url:     req.url,
        });
        await transport.handleRequest(fakeReq, res);
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error: Invalid JSON" }, id: null }));
      }
      return;
    }

    res.writeHead(405, { Allow: "POST" }).end();
    return;
  }

  // 404
  res.writeHead(404).end();
});

/* ── Start ───────────────────────────────────────────────── */

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`MCP cognito-mcp running on port ${PORT}`));