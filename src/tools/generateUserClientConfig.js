import { z } from "zod";
import { buildYaml } from '../utils/helpers.js'

/**
 * Tool: auth.configure-client
 *
 * Collects AWS Cognito User Pool Client configuration from the developer and
 * returns a CloudFormation YAML string (AWS::Cognito::UserPoolClient).
 *
 * Only fields explicitly provided are included in the output — no defaults
 * or empty values are written to the template.
 *
 * Output: cognito-userpool-client.yaml
 * Next step: run auth.configure-domain, then auth.plan
 */

export function registerUserClientConfigTool(server) {
  server.tool(
    "auth.configure-client",
    "Configure an AWS Cognito User Pool Client and return a CloudFormation YAML",
    {
      // ── Core
      ClientName: z.string().describe("Name of the User Pool Client"),
      UserPoolId: z.string().describe("ID of the User Pool this client belongs to"),
      GenerateSecret: z.boolean().optional().describe("Generate a client secret (required for server-side apps)"),

      // ── Auth flows
      ExplicitAuthFlows: z
        .array(
          z.enum([
            "ALLOW_USER_PASSWORD_AUTH",
            "ALLOW_USER_SRP_AUTH",
            "ALLOW_REFRESH_TOKEN_AUTH",
            "ALLOW_CUSTOM_AUTH",
            "ALLOW_USER_AUTH",
            "ALLOW_ADMIN_USER_PASSWORD_AUTH",
          ])
        )
        .optional()
        .describe("Authentication flows to enable for this client"),

      // ── OAuth
      AllowedOAuthFlowsUserPoolClient: z.boolean().optional().describe("Enable OAuth 2.0 features for this client"),
      AllowedOAuthFlows: z
        .array(z.enum(["code", "implicit", "client_credentials"]))
        .optional()
        .describe("OAuth 2.0 grant types allowed"),
      AllowedOAuthScopes: z
        .array(z.string())
        .optional()
        .describe("OAuth scopes (e.g. openid, email, profile, aws.cognito.signin.user.admin)"),
      CallbackURLs: z.array(z.string().url()).optional().describe("Allowed redirect/callback URLs after sign-in"),
      LogoutURLs: z.array(z.string().url()).optional().describe("Allowed redirect URLs after sign-out"),
      DefaultRedirectURI: z.string().url().optional().describe("Default redirect URI (must be in CallbackURLs)"),
      SupportedIdentityProviders: z
        .array(z.string())
        .optional()
        .describe("Identity providers (e.g. COGNITO, Google, Facebook, LoginWithAmazon)"),

      // ── Token validity
      AccessTokenValidity: z.number().int().min(1).optional().describe("Access token validity duration"),
      IdTokenValidity: z.number().int().min(1).optional().describe("ID token validity duration"),
      RefreshTokenValidity: z.number().int().min(1).optional().describe("Refresh token validity duration"),
      AuthSessionValidity: z.number().int().min(3).max(15).optional().describe("Auth session validity in minutes (3–15)"),
      TokenValidityUnits: z
        .object({
          AccessToken: z.enum(["seconds", "minutes", "hours", "days"]).optional(),
          IdToken: z.enum(["seconds", "minutes", "hours", "days"]).optional(),
          RefreshToken: z.enum(["seconds", "minutes", "hours", "days"]).optional(),
        })
        .optional()
        .describe("Units for token validity values"),

      // ── Refresh token rotation
      RefreshTokenRotationEnabled: z.boolean().optional().describe("Enable refresh token rotation"),
      RefreshTokenRetainedForDays: z.number().int().min(0).optional().describe("Days to retain revoked refresh tokens when rotation is enabled"),

      // ── Attributes
      ReadAttributes: z.array(z.string()).optional().describe("User pool attributes the client can read"),
      WriteAttributes: z.array(z.string()).optional().describe("User pool attributes the client can write"),

      // ── Security
      PreventUserExistenceErrors: z
        .enum(["ENABLED", "LEGACY"])
        .optional()
        .describe("ENABLED hides whether a user account exists during sign-in errors"),
      EnableTokenRevocation: z.boolean().optional().describe("Enable refresh token revocation"),
      EnablePropagateAdditionalUserContextData: z
        .boolean()
        .optional()
        .describe("Propagate additional user context data for advanced security"),

      // ── Pinpoint analytics
      ApplicationArn: z.string().optional().describe("Pinpoint application ARN for analytics"),
      ApplicationId: z.string().optional().describe("Pinpoint application ID for analytics"),
      ExternalId: z.string().optional().describe("External ID for the Pinpoint analytics IAM role"),
      RoleArn: z.string().optional().describe("IAM role ARN granting Cognito access to Pinpoint"),
      UserDataShared: z.boolean().optional().describe("Share user data with Pinpoint analytics"),
    },

    async (params) => {
      const {
        ClientName, UserPoolId, GenerateSecret,
        ExplicitAuthFlows,
        AllowedOAuthFlowsUserPoolClient, AllowedOAuthFlows, AllowedOAuthScopes,
        CallbackURLs, LogoutURLs, DefaultRedirectURI, SupportedIdentityProviders,
        AccessTokenValidity, IdTokenValidity, RefreshTokenValidity, AuthSessionValidity, TokenValidityUnits,
        RefreshTokenRotationEnabled, RefreshTokenRetainedForDays,
        ReadAttributes, WriteAttributes,
        PreventUserExistenceErrors, EnableTokenRevocation, EnablePropagateAdditionalUserContextData,
        ApplicationArn, ApplicationId, ExternalId, RoleArn, UserDataShared,
      } = params;

      const props = {};

      props.ClientName = ClientName;
      props.UserPoolId = UserPoolId;
      if (GenerateSecret !== undefined) props.GenerateSecret = GenerateSecret;
      if (ExplicitAuthFlows?.length) props.ExplicitAuthFlows = ExplicitAuthFlows;

      // OAuth
      if (AllowedOAuthFlowsUserPoolClient !== undefined) props.AllowedOAuthFlowsUserPoolClient = AllowedOAuthFlowsUserPoolClient;
      if (AllowedOAuthFlows?.length) props.AllowedOAuthFlows = AllowedOAuthFlows;
      if (AllowedOAuthScopes?.length) props.AllowedOAuthScopes = AllowedOAuthScopes;
      if (CallbackURLs?.length) props.CallbackURLs = CallbackURLs;
      if (LogoutURLs?.length) props.LogoutURLs = LogoutURLs;
      if (DefaultRedirectURI) props.DefaultRedirectURI = DefaultRedirectURI;
      if (SupportedIdentityProviders?.length) props.SupportedIdentityProviders = SupportedIdentityProviders;

      // Token validity
      if (AccessTokenValidity !== undefined) props.AccessTokenValidity = AccessTokenValidity;
      if (IdTokenValidity !== undefined) props.IdTokenValidity = IdTokenValidity;
      if (RefreshTokenValidity !== undefined) props.RefreshTokenValidity = RefreshTokenValidity;
      if (AuthSessionValidity !== undefined) props.AuthSessionValidity = AuthSessionValidity;
      if (TokenValidityUnits && Object.values(TokenValidityUnits).some((v) => v !== undefined)) {
        props.TokenValidityUnits = Object.fromEntries(
          Object.entries(TokenValidityUnits).filter(([, v]) => v !== undefined)
        );
      }

      // Refresh token rotation
      if (RefreshTokenRotationEnabled !== undefined) {
        props.RefreshTokenRotation = {
          Feature: RefreshTokenRotationEnabled ? "ENABLED" : "DISABLED",
          ...(RefreshTokenRetainedForDays !== undefined && { RetainedForDays: RefreshTokenRetainedForDays }),
        };
      }

      // Attributes
      if (ReadAttributes?.length) props.ReadAttributes = ReadAttributes;
      if (WriteAttributes?.length) props.WriteAttributes = WriteAttributes;

      // Security
      if (PreventUserExistenceErrors) props.PreventUserExistenceErrors = PreventUserExistenceErrors;
      if (EnableTokenRevocation !== undefined) props.EnableTokenRevocation = EnableTokenRevocation;
      if (EnablePropagateAdditionalUserContextData !== undefined)
        props.EnablePropagateAdditionalUserContextData = EnablePropagateAdditionalUserContextData;

      // Pinpoint analytics
      const hasAnalytics = [ApplicationArn, ApplicationId, ExternalId, RoleArn, UserDataShared].some((v) => v !== undefined);
      if (hasAnalytics) {
        props.AnalyticsConfiguration = {
          ...(ApplicationArn && { ApplicationArn }),
          ...(ApplicationId && { ApplicationId }),
          ...(ExternalId && { ExternalId }),
          ...(RoleArn && { RoleArn }),
          ...(UserDataShared !== undefined && { UserDataShared }),
        };
      }

      const yaml = buildYaml(props);

      const cfTemplate = [
        "AWSTemplateFormatVersion: '2010-09-09'",
        "Description: Cognito User Pool Client generated by cognito-mcp",
        "",
        "Resources:",
        "  CognitoUserPoolClient:",
        "    Type: AWS::Cognito::UserPoolClient",
        "    Properties:",
        yaml
          .split("\n")
          .map((l) => `      ${l}`)
          .join("\n"),
      ].join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Here is your Cognito User Pool Client CloudFormation configuration:\n\n\`\`\`yaml\n${cfTemplate}\n\`\`\`\n\nSave this as \`cognito-userpool-client.yaml\` in your project.`,
          },
        ],
      };
    }
  );
}
