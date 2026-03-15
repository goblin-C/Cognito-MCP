import crypto from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

export default async function handler(req, res) {

  console.log("==== MCP REQUEST RECEIVED ====");
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);

  try {

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    console.log("Body:", body);

    // Quick debug endpoint
    if (body?.debug === true) {
      return res.status(200).json({
        message: "Debug endpoint working",
        receivedBody: body
      });
    }

    const server = new McpServer({
      name: "cognito-configurator",
      version: "1.0.0"
    });

    server.tool(
      "hello",
      {
        description: "Test MCP tool",
        inputSchema: {
          name: z.string()
        }
      },
      async ({ name }) => {

        console.log("Tool called with:", name);

        return {
          content: [
            {
              type: "text",
              text: `Hello ${name}`
            }
          ]
        };
      }
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID()
    });

    await server.connect(transport);

    await transport.handleRequest(req, res);

  } catch (err) {

    console.error("MCP ERROR:", err);

    res.status(500).json({
      error: err.message
    });

  }
}