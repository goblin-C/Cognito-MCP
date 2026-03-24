import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import crypto from "node:crypto";
import { sessions } from "../sessions/sessionStore.js";

// Tools import
import { registerUserPoolDescribeTool, registerUserPoolConfigTool } from "../tools/generateUserPoolConfig.js";
import { registerUserClientDescribeTool, registerUserClientConfigTool } from "../tools/generateUserClientConfig.js";
import { registerUserPoolDomainDescribeTool, registerUserPoolDomainTool } from "../tools/generateUserPoolDomain.js";
import { registerIdentityProviderDescribeTool, registerIdentityProviderConfigTool } from "../tools/generateIdentityProvider.js";
import { registerSetupBasicTool } from "../tools/setupBasicAuth.js";
import { registerModifyConfigTool } from "../tools/modifyConfig.js";
import { registerInteractivePoolTool, registerInteractiveClientTool, registerInteractiveDomainTool } from "../tools/interactiveSetup.js";
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

    registerIdentityProviderDescribeTool(mcpServer);
    registerIdentityProviderConfigTool(mcpServer);

    registerSetupBasicTool(mcpServer);
    registerModifyConfigTool(mcpServer);

    registerInteractivePoolTool(mcpServer);
    registerInteractiveClientTool(mcpServer);
    registerInteractiveDomainTool(mcpServer);

    registerHelpTool(mcpServer);

    await mcpServer.connect(transport);
  }

  await transport.handleRequest(req, res);
}