import { tasks } from "../store.js";

// Prompts are reusable templates — Claude can invoke them by name
export function registerTaskPrompts(server) {

  server.prompt(
    "daily-standup",
    "Generate a daily standup summary from current tasks",
    [],
    async () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Here are my current tasks:\n${JSON.stringify(tasks, null, 2)}\n\nPlease give me a concise daily standup summary: what's done, what's in progress, and any blockers.`
        }
      }]
    })
  );

  server.prompt(
    "prioritize",
    "Suggest a priority order for pending tasks",
    [],
    async () => {
      const pending = tasks.filter(t => !t.done);
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Here are my pending tasks:\n${JSON.stringify(pending, null, 2)}\n\nPlease suggest the best order to tackle these and explain why.`
          }
        }]
      };
    }
  );
}