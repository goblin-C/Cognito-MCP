import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

  try {

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const response = await server.handle(body);

    res.status(200).json(response);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
}