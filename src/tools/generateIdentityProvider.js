import { z } from "zod";
import { buildYaml } from "../utils/helpers.js";

const FIELD_DOCS = {
  UserPoolId: {
    summary: "The ID of the User Pool to associate this identity provider with.",
    detail:
      "Returned after creating the User Pool. Format: region_xxxxxxxxx. " +
      "The identity provider will be available to all app clients in this pool that list it in SupportedIdentityProviders.",
    example: "us-east-1_AbCdEfGhI",
  },
  ProviderName: {
    summary: "A unique name for the identity provider.",
    detail:
      "For social providers use the canonical name: 'Google', 'Facebook', 'LoginWithAmazon', 'SignInWithApple'. " +
      "For OIDC or SAML providers use a descriptive custom name. " +
      "This name is referenced in the App Client's SupportedIdentityProviders list.",
    example: "Google",
  },
  ProviderType: {
    summary:
      "The type of identity provider: Google | Facebook | LoginWithAmazon | SignInWithApple | OIDC | SAML.",
    detail:
      "Determines which ProviderDetails fields are required. " +
      "For Google OAuth 2.0, use 'Google'. For enterprise SSO via SAML, use 'SAML'.",
    example: "Google",
  },
  ClientId: {
    summary: "The OAuth 2.0 client ID from the identity provider.",
    detail:
      "For Google: obtain this from Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs. " +
      "This becomes the client_id field in ProviderDetails.",
    example: "123456789012-abc123def456.apps.googleusercontent.com",
  },
  ClientSecret: {
    summary: "The OAuth 2.0 client secret from the identity provider.",
    detail:
      "For Google: obtain this from Google Cloud Console alongside the Client ID. " +
      "This becomes the client_secret field in ProviderDetails. Keep this value secret — consider using AWS Secrets Manager or SSM Parameter Store.",
    example: "GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx",
  },
  AuthorizeScopes: {
    summary: "Space-separated OAuth scopes to request from the provider.",
    detail:
      "For Google: 'openid email profile' covers standard user info (email address, name, profile picture). " +
      "Additional scopes grant access to more Google APIs but require explicit user consent and may trigger Google's app review process.",
    example: "openid email profile",
  },
  AttributeMapping: {
    summary:
      "Maps identity provider attributes to Cognito user pool attributes.",
    detail:
      "Keys are Cognito user pool attribute names (e.g. email, name, picture, username). " +
      "Values are the corresponding attribute names from the provider's token or userinfo response. " +
      "For Google: email → email, name → name, picture → picture, username → sub. " +
      "The 'username' mapping is required — it maps to the provider's unique user identifier.",
    example: { email: "email", name: "name", picture: "picture", username: "sub" },
  },
  IdpIdentifiers: {
    summary: "Optional list of domain identifiers for this provider.",
    detail:
      "Used for IdP-initiated sign-in. When a user signs in with an email matching an identifier domain, " +
      "Cognito can automatically route them to this provider. Typically a domain like 'gmail.com'.",
    example: ["gmail.com"],
  },
};

/**
 * Tool: auth.describe-provider
 *
 * Returns detailed documentation for one or more Cognito Identity Provider
 * configuration fields from the local FIELD_DOCS map.
 */
export function registerIdentityProviderDescribeTool(server) {
  server.tool(
    "auth.describe-provider",
    `Return detailed documentation for one or more Cognito Identity Provider configuration fields.
Use this tool BEFORE calling auth.configure-provider whenever the user asks what a field does,
is unsure which option to pick, or you need to present options clearly.
Do NOT guess — look up the field first, then explain it to the user in plain language.`,
    {
      fields: z
        .array(z.string())
        .describe(
          "Field names to look up, e.g. ['ClientId', 'AttributeMapping']"
        ),
    },
    async ({ fields }) => {
      const results = fields.map((f) => {
        const doc = FIELD_DOCS[f];
        if (!doc) return `**${f}**: No documentation found.`;
        const lines = [`**${f}**: ${doc.summary}`];
        if (doc.detail) lines.push(`  → ${doc.detail}`);
        if (doc.example !== undefined)
          lines.push(`  Example: \`${JSON.stringify(doc.example)}\``);
        return lines.join("\n");
      });

      return {
        content: [{ type: "text", text: results.join("\n\n") }],
      };
    }
  );
}

/**
 * Tool: auth.configure-provider
 *
 * Collects AWS Cognito Identity Provider configuration and returns a
 * CloudFormation YAML string (AWS::Cognito::UserPoolIdentityProvider).
 *
 * Defaults to Google OAuth with placeholder credentials.
 *
 * Output: cognito-identity-provider.yaml
 */
export function registerIdentityProviderConfigTool(server) {
  server.tool(
    "auth.configure-provider",
    "Configure an AWS Cognito User Pool Identity Provider (e.g. Google) and return a CloudFormation YAML template. Defaults to Google OAuth with placeholder credentials that must be replaced before deploying.",
    {
      UserPoolId: z
        .string()
        .describe("ID of the User Pool to associate this provider with"),
      ProviderName: z
        .string()
        .optional()
        .describe("Provider name (default: Google)"),
      ProviderType: z
        .enum([
          "Google",
          "Facebook",
          "LoginWithAmazon",
          "SignInWithApple",
          "OIDC",
          "SAML",
        ])
        .optional()
        .describe("Provider type (default: Google)"),
      ClientId: z
        .string()
        .optional()
        .describe(
          "OAuth client ID from the provider (default: YOUR_GOOGLE_CLIENT_ID)"
        ),
      ClientSecret: z
        .string()
        .optional()
        .describe(
          "OAuth client secret from the provider (default: YOUR_GOOGLE_CLIENT_SECRET)"
        ),
      AuthorizeScopes: z
        .string()
        .optional()
        .describe(
          "Space-separated OAuth scopes (default: openid email profile)"
        ),
      AttributeMapping: z
        .record(z.string())
        .optional()
        .describe(
          "Map of Cognito attributes to provider attributes (default: email, name, picture, username)"
        ),
      IdpIdentifiers: z
        .array(z.string())
        .optional()
        .describe("Optional domain identifiers for IdP-initiated sign-in"),
    },
    async ({
      UserPoolId,
      ProviderName,
      ProviderType,
      ClientId,
      ClientSecret,
      AuthorizeScopes,
      AttributeMapping,
      IdpIdentifiers,
    }) => {
      const resolvedName = ProviderName ?? "Google";
      const resolvedType = ProviderType ?? "Google";
      const resolvedClientId = ClientId ?? "YOUR_GOOGLE_CLIENT_ID";
      const resolvedClientSecret = ClientSecret ?? "YOUR_GOOGLE_CLIENT_SECRET";
      const resolvedScopes = AuthorizeScopes ?? "openid email profile";
      const resolvedMapping = AttributeMapping ?? {
        email: "email",
        name: "name",
        picture: "picture",
        username: "sub",
      };

      const props = {};
      props.UserPoolId = UserPoolId;
      props.ProviderName = resolvedName;
      props.ProviderType = resolvedType;
      props.ProviderDetails = {
        client_id: resolvedClientId,
        client_secret: resolvedClientSecret,
        authorize_scopes: resolvedScopes,
      };
      props.AttributeMapping = resolvedMapping;

      if (IdpIdentifiers && IdpIdentifiers.length > 0) {
        props.IdpIdentifiers = IdpIdentifiers;
      }

      const yaml = buildYaml(props);

      const cfTemplate = [
        "AWSTemplateFormatVersion: '2010-09-09'",
        "Description: Cognito Identity Provider generated by cognito-mcp",
        "",
        "Resources:",
        "  CognitoIdentityProvider:",
        "    Type: AWS::Cognito::UserPoolIdentityProvider",
        "    Properties:",
        yaml
          .split("\n")
          .map((l) => `      ${l}`)
          .join("\n"),
      ].join("\n");

      const hasPlaceholders =
        resolvedClientId === "YOUR_GOOGLE_CLIENT_ID" ||
        resolvedClientSecret === "YOUR_GOOGLE_CLIENT_SECRET";

      const notice = hasPlaceholders
        ? "\n\n**IMPORTANT:** Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_CLIENT_SECRET` with your actual Google OAuth credentials.\nSee `docs/google-social-login-guide.md` for step-by-step setup instructions."
        : "";

      return {
        content: [
          {
            type: "text",
            text:
              `Here is your Cognito Identity Provider CloudFormation configuration:\n\n\`\`\`yaml\n${cfTemplate}\n\`\`\`\n\nSave this as \`cognito-identity-provider.yaml\` in your project.` +
              notice +
              "\n\n**Next step:** Update your App Client's `SupportedIdentityProviders` to include `\"" +
              resolvedName +
              "\"` alongside `\"COGNITO\"`.",
          },
        ],
      };
    }
  );
}
