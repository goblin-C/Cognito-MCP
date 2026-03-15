import { z } from "zod";

export default async function handler(req, res) {

  console.log("==== MCP REQUEST RECEIVED ====");

  const body =
    typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

  console.log("Body:", body);

  // ---- tool implementation ----

  const helloTool = async ({ name }) => {
    return {
      content: [
        {
          type: "text",
          text: `Hello ${name}`
        }
      ]
    };
  };

  // ---- tools/list ----

  if (body.method === "tools/list") {

    return res.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        tools: [
          {
            name: "hello",
            description: "Test MCP tool",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" }
              }
            }
          }
        ]
      }
    });

  }

  // ---- tools/call ----

  if (body.method === "tools/call") {

    const { name, arguments: args } = body.params;

    if (name === "hello") {

      const result = await helloTool(args);

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