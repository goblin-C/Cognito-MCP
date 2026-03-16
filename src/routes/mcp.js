import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { sessions } from "../sessions/sessionStore.js";

// Tools import
import { registerUserPoolConfigTool } from "../tools/generateUserPoolConfig.js";
import { registerUserClientConfigTool } from "../tools/generateUserClientConfig.js";

export async function mcpRoute(req, res) {
  const sessionId = req.headers["mcp-session-id"];
  
  // Check if it is a existing session or create a new session
  let transport;

  if (sessionId && sessions.has(sessionId)) {
    transport = sessions.get(sessionId).transport;
  } else {
    // Create a new transport and MCP server for each session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => {
        const id = crypto.randomUUID();
        sessions.set(id, { transport });
        return id;
      },
    });
    const mcpServer = new McpServer({ name: "cognito-mcp", version: "1.0.0" });

    // Register the Tool so that MCP can find this tool
    registerUserPoolConfigTool(mcpServer);
    registerUserClientConfigTool(mcpServer);
    
    await mcpServer.connect(transport);
  }

  await transport.handleRequest(req, res);
}