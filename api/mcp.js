import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

/* ---------------- TASK STORE ---------------- */

let tasks = [];

/* ---------------- MCP SERVER ---------------- */

const server = new McpServer({
  name: "task-server",
  version: "1.0.0"
});

/* ---------------- TOOLS ---------------- */

server.tool(
  "addTask",
  "Add a task",
  { title: z.string() },
  async ({ title }) => {

    const task = {
      id: crypto.randomUUID(),
      title
    };

    tasks.push(task);

    return {
      content: [
        { type: "text", text: JSON.stringify(task) }
      ]
    };
  }
);

server.tool(
  "listTasks",
  "List tasks",
  {},
  async () => {

    return {
      content: [
        { type: "text", text: JSON.stringify(tasks) }
      ]
    };
  }
);

/* ---------------- TRANSPORT ---------------- */

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID()
});

/* connect server to transport */

await server.connect(transport);

/* ---------------- VERCEL HANDLER ---------------- */

export default async function handler(req, res) {

  try {

    await transport.handleRequest(req, res);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

}