import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

export default async function handler(req, res) {

  try {

    // Create server per request
    const server = new McpServer({
      name: "cognito-configurator",
      version: "1.0.0"
    });

    // Register tool
    server.tool(
      "hello",
      {
        description: "Test MCP tool",
        inputSchema: {
          name: z.string()
        }
      },
      async ({ name }) => ({
        content: [
          {
            type: "text",
            text: `Hello ${name}`
          }
        ]
      })
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID()
    });

    await server.connect(transport);

    await transport.handleRequest(req, res);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

}