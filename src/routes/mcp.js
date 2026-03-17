import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { sessions } from "../sessions/sessionStore.js";

// Tools import
import { registerUserPoolDescribeTool, registerUserPoolConfigTool } from "../tools/generateUserPoolConfig.js";
import { registerUserClientDescribeTool, registerUserClientConfigTool } from "../tools/generateUserClientConfig.js";
import { registerUserPoolDomainDescribeTool, registerUserPoolDomainTool } from "../tools/generateUserPoolDomain.js";
import { registerHelpTool } from "../tools/help.js";

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
    registerUserPoolDescribeTool(mcpServer);
    registerUserPoolConfigTool(mcpServer);

    registerUserClientDescribeTool(mcpServer);
    registerUserClientConfigTool(mcpServer);
    
    registerUserPoolDomainDescribeTool(mcpServer);
    registerUserPoolDomainTool(mcpServer);

    registerHelpTool(mcpServer);

    await mcpServer.connect(transport);
  }

  await transport.handleRequest(req, res);
}