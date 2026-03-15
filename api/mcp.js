import { McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { generateCognitoYaml } from "../lib/generateCognitoYaml.js";

const server = new McpServer(
  {
    name: "cognito-configurator",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.tool(
  "configure_cognito_user_pool",
  {
    userPoolName: z.string(),
    mfaConfiguration: z.string(),
    usernameAttribute: z.string(),
    autoVerify: z.string()
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

  const response = await server.handle(req.body);

  res.status(200).json(response);

}