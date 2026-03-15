import { tasks } from "../store.js";

// Resources expose data that Claude can read without calling a tool
export function registerTaskResources(server) {

  server.resource(
    "tasks://all",
    "All tasks",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(tasks, null, 2)
      }]
    })
  );

  server.resource(
    "tasks://pending",
    "Pending (not done) tasks",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(tasks.filter(t => !t.done), null, 2)
      }]
    })
  );
}