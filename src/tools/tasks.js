import { z } from "zod";
import { tasks, findById, removeById } from "../store.js";

// Register all task-related tools onto the MCP server instance
export function registerTaskTools(server) {

  server.tool(
    "addTask",
    "Add a new task",
    { title: z.string(), priority: z.enum(["low", "medium", "high"]).optional() },
    async ({ title, priority = "medium" }) => {
      const task = { id: crypto.randomUUID(), title, priority, done: false, createdAt: new Date().toISOString() };
      tasks.push(task);
      return { content: [{ type: "text", text: JSON.stringify(task) }] };
    }
  );

  server.tool(
    "listTasks",
    "List all tasks, optionally filter by done status",
    { done: z.boolean().optional() },
    async ({ done }) => {
      const result = done === undefined ? tasks : tasks.filter(t => t.done === done);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "updateTask",
    "Update a task's title, priority, or done status",
    {
      id: z.string(),
      title: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      done: z.boolean().optional()
    },
    async ({ id, ...updates }) => {
      const task = findById(id);
      if (!task) return { content: [{ type: "text", text: `Task ${id} not found` }], isError: true };
      Object.assign(task, updates);
      return { content: [{ type: "text", text: JSON.stringify(task) }] };
    }
  );

  server.tool(
    "deleteTask",
    "Delete a task by ID",
    { id: z.string() },
    async ({ id }) => {
      const removed = removeById(id);
      return { content: [{ type: "text", text: removed ? `Deleted ${id}` : `Task ${id} not found` }], isError: !removed };
    }
  );
}