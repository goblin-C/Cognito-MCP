import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { generateCognitoYaml } from "../lib/generateCognitoYaml.js";

const server = new McpServer({
  name: "cognito-configurator",
  version: "1.0.0"
});

server.tool(
  "configure_cognito_user_pool",
  {
    description: "Generate a Cognito User Pool CloudFormation template",
    inputSchema: {
      userPoolName: z.string(),
      mfaConfiguration: z.string(),
      usernameAttribute: z.string(),
      autoVerify: z.string()
    }
  },
  async ({ userPoolName, mfaConfiguration, usernameAttribute, autoVerify }) => {

    const yaml = generateCognitoYaml({
      userPoolName,
      mfaConfiguration,
      usernameAttribute,
      autoVerify
    });

    return {
      content: [
        {
          type: "text",
          text: yaml
        }
      ]
    };
  }
);

export default async function handler(req, res) {

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID()
  });

  await server.connect(transport);

  await transport.handleRequest(req, res);
}