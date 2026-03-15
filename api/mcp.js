import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export default async function handler(req, res) {

  console.log("==== MCP REQUEST RECEIVED ====");

  const body =
    typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

  console.log("Body:", body);

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
    async ({ name }) => ({
      content: [
        {
          type: "text",
          text: `Hello ${name}`
        }
      ]
    })
  );

  // JSON-RPC handling manually

  if (body.method === "tools/list") {

    return res.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        tools: [
          {
            name: "hello",
            description: "Test MCP tool"
          }
        ]
      }
    });

  }

  if (body.method === "tools/call") {

    const { name, arguments: args } = body.params;

    if (name === "hello") {

      const result = await server._tools.get("hello").handler(args);

      return res.json({
        jsonrpc: "2.0",
        id: body.id,
        result
      });

    }

  }

  res.status(400).json({
    error: "Unknown method"
  });

}