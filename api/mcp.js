import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/* ---------------- TASK STORE ---------------- */

let tasks = [];

/* ---------------- MCP SERVER ---------------- */

const server = new McpServer({
  name: "Task MCP Server",
  version: "1.0.0"
});

/* ---------------- TOOLS ---------------- */

server.tool(
  "addTask",
  "Add a new task",
  {
    title: z.string()
  },
  async ({ title }) => {

    const task = {
      id: crypto.randomUUID(),
      title
    };

    tasks.push(task);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(task)
        }
      ]
    };
  }
);

server.tool(
  "listTasks",
  "List all tasks",
  {},
  async () => {

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(tasks)
        }
      ]
    };
  }
);

server.tool(
  "removeTask",
  "Remove task",
  {
    id: z.string()
  },
  async ({ id }) => {

    tasks = tasks.filter(t => t.id !== id);

    return {
      content: [{ type: "text", text: "Task removed" }]
    };
  }
);

server.tool(
  "updateTask",
  "Update task",
  {
    id: z.string(),
    title: z.string()
  },
  async ({ id, title }) => {

    const task = tasks.find(t => t.id === id);

    if (task) task.title = title;

    return {
      content: [{ type: "text", text: "Task updated" }]
    };
  }
);

/* ---------------- RESOURCES ---------------- */

server.resource(
  "tasks",
  "tasks://all",
  async () => {

    return {
      contents: [
        {
          uri: "tasks://all",
          text: JSON.stringify(tasks)
        }
      ]
    };
  }
);

/* ---------------- PROMPTS ---------------- */

server.prompt(
  "summarizeTasks",
  "Summarize all tasks",
  async () => {

    return {
      messages: [
        {
          role: "user",
          content: `Summarize these tasks: ${JSON.stringify(tasks)}`
        }
      ]
    };
  }
);

/* ---------------- VERCEL HANDLER ---------------- */

export default async function handler(req, res) {

  try {

    if (req.method === "GET") {

      const response = await server.handleRequest();

      return res.status(200).json(response);

    }

    if (req.method === "POST") {

      const response = await server.handleRequest(req.body);

      return res.status(200).json(response);

    }

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

}