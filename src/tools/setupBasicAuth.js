import { z } from "zod";
import { buildYaml } from "../utils/helpers.js";

/**
 * Tool: auth.setup-basic
 *
 * Generates a complete, deployment-ready CloudFormation template containing:
 *   - AWS::Cognito::UserPool      (email sign-in, password policy, optional TOTP MFA)
 *   - AWS::Cognito::UserPoolClient (authorization-code OAuth flow)
 *   - AWS::Cognito::UserPoolDomain (Cognito hosted UI)
 *
 * Accepts minimal inputs and returns a single template with cross-resource
 * references (!Ref) and stack Outputs.
 *
 * Output: cognito-basic-auth-stack.yaml
 */
export function registerSetupBasicTool(server) {
  server.tool(
    "auth.setup-basic",
    "Generate a complete CloudFormation stack for basic username/password authentication with Cognito. Produces a single template with a User Pool (email sign-in, auto-verified email, configurable password policy, optional TOTP MFA), an App Client (authorization code flow with OAuth), and a Domain (hosted UI). Accepts minimal inputs and returns a deployment-ready template.",
    {
      appName: z
        .string()
        .describe("Application name — used to name all resources in the stack"),
      callbackURLs: z
        .array(z.string())
        .describe("OAuth callback URLs for sign-in redirects, e.g. ['https://myapp.com/callback']"),
      logoutURLs: z
        .array(z.string())
        .optional()
        .describe("OAuth logout redirect URLs"),
      mfaConfiguration: z
        .enum(["OFF", "OPTIONAL", "ON"])
        .optional()
        .describe("MFA enforcement level: OFF (default) | OPTIONAL | ON. When not OFF, TOTP (software token) MFA is enabled."),
      passwordMinimumLength: z
        .number()
        .int()
        .min(6)
        .max(99)
        .optional()
        .describe("Minimum password length, 6–99 (default: 8)"),
      passwordRequireUppercase: z
        .boolean()
        .optional()
        .describe("Require at least one uppercase letter (default: true)"),
      passwordRequireLowercase: z
        .boolean()
        .optional()
        .describe("Require at least one lowercase letter (default: true)"),
      passwordRequireNumbers: z
        .boolean()
        .optional()
        .describe("Require at least one digit (default: true)"),
      passwordRequireSymbols: z
        .boolean()
        .optional()
        .describe("Require at least one symbol (default: false)"),
      domainPrefix: z
        .string()
        .optional()
        .describe("Cognito domain prefix for the hosted UI (default: derived from appName, lowercased with hyphens)"),
    },
    async ({
      appName,
      callbackURLs,
      logoutURLs,
      mfaConfiguration,
      passwordMinimumLength,
      passwordRequireUppercase,
      passwordRequireLowercase,
      passwordRequireNumbers,
      passwordRequireSymbols,
      domainPrefix,
    }) => {
      // ── Derive defaults ──────────────────────────────────────────
      const mfa = mfaConfiguration ?? "OFF";
      const domain =
        domainPrefix ??
        appName
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

      // ── User Pool properties ─────────────────────────────────────
      const poolProps = {
        UserPoolName: `${appName}UserPool`,
        UsernameAttributes: ["email"],
        AutoVerifiedAttributes: ["email"],
        MfaConfiguration: mfa,
        Policies: {
          PasswordPolicy: {
            MinimumLength: passwordMinimumLength ?? 8,
            RequireUppercase: passwordRequireUppercase ?? true,
            RequireLowercase: passwordRequireLowercase ?? true,
            RequireNumbers: passwordRequireNumbers ?? true,
            RequireSymbols: passwordRequireSymbols ?? false,
          },
        },
        AccountRecoverySetting: {
          RecoveryMechanisms: [{ Name: "verified_email", Priority: 1 }],
        },
      };

      if (mfa !== "OFF") {
        poolProps.EnabledMfas = ["SOFTWARE_TOKEN_MFA"];
      }

      // ── Client properties (UserPoolId added manually as !Ref) ───
      const clientProps = {
        ClientName: `${appName}WebClient`,
        ExplicitAuthFlows: [
          "ALLOW_USER_SRP_AUTH",
          "ALLOW_REFRESH_TOKEN_AUTH",
        ],
        GenerateSecret: false,
        AllowedOAuthFlowsUserPoolClient: true,
        AllowedOAuthFlows: ["code"],
        AllowedOAuthScopes: ["openid", "email", "profile"],
        CallbackURLs: callbackURLs,
        SupportedIdentityProviders: ["COGNITO"],
        PreventUserExistenceErrors: "ENABLED",
      };

      if (logoutURLs && logoutURLs.length > 0) {
        clientProps.LogoutURLs = logoutURLs;
      }

      // ── Serialize sub-sections with buildYaml ────────────────────
      const indent = (yaml) =>
        yaml
          .split("\n")
          .map((l) => `      ${l}`)
          .join("\n");

      const poolYaml = indent(buildYaml(poolProps));
      const clientYaml = indent(buildYaml(clientProps));

      // ── Assemble the full CloudFormation template ────────────────
      // We inject !Ref and !Sub lines manually so buildYaml doesn't
      // quote the intrinsic-function syntax.
      const cfTemplate = [
        "AWSTemplateFormatVersion: '2010-09-09'",
        `Description: Complete basic auth stack for ${appName} — generated by cognito-mcp`,
        "",
        "Resources:",
        "",
        "  CognitoUserPool:",
        "    Type: AWS::Cognito::UserPool",
        "    Properties:",
        poolYaml,
        "",
        "  CognitoUserPoolClient:",
        "    Type: AWS::Cognito::UserPoolClient",
        "    DependsOn: CognitoUserPool",
        "    Properties:",
        "      UserPoolId: !Ref CognitoUserPool",
        clientYaml,
        "",
        "  CognitoUserPoolDomain:",
        "    Type: AWS::Cognito::UserPoolDomain",
        "    DependsOn: CognitoUserPool",
        "    Properties:",
        `      Domain: ${domain}`,
        "      UserPoolId: !Ref CognitoUserPool",
        "",
        "Outputs:",
        "  UserPoolId:",
        "    Description: Cognito User Pool ID",
        "    Value: !Ref CognitoUserPool",
        "  UserPoolClientId:",
        "    Description: Cognito User Pool Client ID",
        "    Value: !Ref CognitoUserPoolClient",
        "  CognitoDomain:",
        "    Description: Cognito hosted-UI domain",
        `    Value: !Sub '${domain}.auth.\${AWS::Region}.amazoncognito.com'`,
      ].join("\n");

      const mfaNote =
        mfa !== "OFF"
          ? `\n\n**MFA:** TOTP (software token) MFA is set to **${mfa}**. Users will be prompted to set up an authenticator app.`
          : "";

      return {
        content: [
          {
            type: "text",
            text:
              `Here is your complete Cognito basic-auth CloudFormation stack:\n\n\`\`\`yaml\n${cfTemplate}\n\`\`\`\n\n` +
              `Save this as \`cognito-basic-auth-stack.yaml\` and deploy with:\n` +
              "```bash\n" +
              "aws cloudformation deploy \\\n" +
              "  --template-file cognito-basic-auth-stack.yaml \\\n" +
              `  --stack-name ${domain}-auth \\\n` +
              "  --region us-east-1\n" +
              "```" +
              mfaNote +
              "\n\n**Next steps:**\n" +
              "- To add Google social login, use `auth.configure-provider`\n" +
              "- To modify this configuration later, use `auth.modify-config`\n" +
              "- For field-level documentation, use `auth.describe-pool` or `auth.describe-client`",
          },
        ],
      };
    }
  );
}
