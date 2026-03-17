import { z } from "zod";
import { buildYaml } from '../utils/helpers.js'

// ─────────────────────────────────────────────
// Rich docs for every configurable field.
// The LLM uses this to answer "what does X do?"
// before the user commits to a value.
// ─────────────────────────────────────────────
const FIELD_DOCS = {
  ClientName: {
    summary: "The name of the User Pool Client.",
    detail: "A descriptive label for this client. Helps distinguish between multiple clients on the same pool (e.g. web-app, mobile-app, backend-service).",
    example: "my-app-web-client",
  },
  UserPoolId: {
    summary: "The ID of the User Pool this client belongs to.",
    detail: "Returned after creating the User Pool. Format: region_xxxxxxxxx.",
    example: "us-east-1_AbCdEfGhI",
  },
  GenerateSecret: {
    summary: "Generate a client secret for this app client.",
    detail: "Required for server-side apps (e.g. Node.js backend). Must NOT be used in browser or mobile apps — secrets cannot be safely stored client-side.",
    example: false,
  },
  ExplicitAuthFlows: {
    summary: "Authentication flows to enable for this client.",
    detail:
      "ALLOW_USER_SRP_AUTH: secure remote password (recommended for client-side). ALLOW_USER_PASSWORD_AUTH: plain username+password (server-side only). ALLOW_REFRESH_TOKEN_AUTH: required for token refresh. ALLOW_CUSTOM_AUTH: enables Lambda-based custom auth. ALLOW_USER_AUTH: enables the choice-based auth flow. ALLOW_ADMIN_USER_PASSWORD_AUTH: admin-only flow using admin API.",
    example: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
  },
  AllowedOAuthFlowsUserPoolClient: {
    summary: "Enable OAuth 2.0 features for this client.",
    detail: "Must be true to use AllowedOAuthFlows, AllowedOAuthScopes, CallbackURLs, or hosted UI. Required for social/federated login.",
    example: true,
  },
  AllowedOAuthFlows: {
    summary: "OAuth 2.0 grant types: code | implicit | client_credentials.",
    detail:
      "'code' (authorization code) is recommended for web and mobile apps — tokens are never exposed in the URL. 'implicit' is legacy; avoid for new apps. 'client_credentials' is for machine-to-machine flows with no user context.",
    example: ["code"],
  },
  AllowedOAuthScopes: {
    summary: "OAuth scopes that the client is allowed to request.",
    detail:
      "Standard: openid, email, profile, phone, aws.cognito.signin.user.admin. Custom resource server scopes can also be added. 'openid' is required to receive an ID token.",
    example: ["openid", "email", "profile"],
  },
  CallbackURLs: {
    summary: "Allowed redirect URLs after a successful sign-in.",
    detail: "Cognito will only redirect to URLs in this list after authentication. Must be HTTPS in production. For local dev, http://localhost is allowed.",
    example: ["https://myapp.com/callback", "http://localhost:3000/callback"],
  },
  LogoutURLs: {
    summary: "Allowed redirect URLs after sign-out.",
    detail: "Cognito redirects to one of these after the hosted UI logout endpoint is called.",
    example: ["https://myapp.com/logout"],
  },
  DefaultRedirectURI: {
    summary: "The default callback URL used when none is specified in the request.",
    detail: "Must be one of the URLs listed in CallbackURLs.",
    example: "https://myapp.com/callback",
  },
  SupportedIdentityProviders: {
    summary: "Identity providers users can sign in with.",
    detail: "Use 'COGNITO' for the built-in user pool. Add 'Google', 'Facebook', 'LoginWithAmazon', or 'SignInWithApple' for social login. Custom SAML/OIDC providers use their configured name.",
    example: ["COGNITO", "Google"],
  },
  AccessTokenValidity: {
    summary: "How long access tokens remain valid.",
    detail: "Unit is set by TokenValidityUnits.AccessToken. Default unit is hours. Access tokens authorize API calls.",
    example: 1,
  },
  IdTokenValidity: {
    summary: "How long ID tokens remain valid.",
    detail: "Unit is set by TokenValidityUnits.IdToken. ID tokens carry user identity claims.",
    example: 1,
  },
  RefreshTokenValidity: {
    summary: "How long refresh tokens remain valid.",
    detail: "Unit is set by TokenValidityUnits.RefreshToken. Default unit is days. Refresh tokens are used to obtain new access/ID tokens without re-authentication.",
    example: 30,
  },
  AuthSessionValidity: {
    summary: "Minutes before an in-progress auth session expires (3–15).",
    detail: "Applies to the time a user has to complete a multi-step auth challenge (e.g. MFA entry).",
    example: 5,
  },
  TokenValidityUnits: {
    summary: "Units for AccessToken, IdToken, and RefreshToken validity values.",
    detail: "Options per token: seconds | minutes | hours | days. Allows mixing units across token types.",
    example: { AccessToken: "hours", IdToken: "hours", RefreshToken: "days" },
  },
  RefreshTokenRotationEnabled: {
    summary: "Issue a new refresh token each time the old one is used.",
    detail: "Improves security by invalidating the previous refresh token after each use. Requires RefreshTokenRetainedForDays to handle rotation grace periods.",
    example: true,
  },
  RefreshTokenRetainedForDays: {
    summary: "Days to honour a previous refresh token after it has been rotated.",
    detail: "Provides a grace period so clients that haven't yet received the new token can still exchange the old one. Set to 0 to disable the grace period.",
    example: 1,
  },
  ReadAttributes: {
    summary: "User pool attributes this client is allowed to read.",
    detail: "Standard attributes use their name (e.g. email, phone_number). Custom attributes are prefixed with 'custom:'.",
    example: ["email", "given_name", "custom:department"],
  },
  WriteAttributes: {
    summary: "User pool attributes this client is allowed to write.",
    detail: "Controls what the client can set during sign-up or profile update. Immutable attributes (e.g. sub) cannot be written.",
    example: ["email", "given_name"],
  },
  PreventUserExistenceErrors: {
    summary: "ENABLED hides whether an account exists during sign-in failures.",
    detail: "ENABLED returns a generic error for wrong username or password, preventing user enumeration attacks. LEGACY returns distinct errors for each case.",
    example: "ENABLED",
  },
  EnableTokenRevocation: {
    summary: "Allow refresh tokens to be revoked.",
    detail: "When enabled, calling the Revoke endpoint invalidates a refresh token and all access tokens issued from it. Recommended for logout-everywhere flows.",
    example: true,
  },
  EnablePropagateAdditionalUserContextData: {
    summary: "Pass extra user context (IP, device) to advanced security features.",
    detail: "Requires AdvancedSecurityMode AUDIT or ENFORCED on the User Pool. Improves risk scoring accuracy.",
    example: false,
  },
  ApplicationArn: {
    summary: "Pinpoint application ARN for event-based analytics.",
    detail: "Use either ApplicationArn or ApplicationId — not both. ApplicationArn automatically manages the IAM role.",
    example: "arn:aws:mobiletargeting:us-east-1:123456789:apps/abc123",
  },
  ApplicationId: {
    summary: "Pinpoint application ID for analytics.",
    detail: "Use with RoleArn and optionally ExternalId. Alternative to ApplicationArn when you manage the IAM role manually.",
    example: "abc123def456",
  },
  ExternalId: {
    summary: "External ID for the Pinpoint analytics IAM role trust policy.",
    example: "my-pinpoint-external-id",
  },
  RoleArn: {
    summary: "IAM role ARN granting Cognito permission to publish events to Pinpoint.",
    example: "arn:aws:iam::123456789:role/CognitoPinpointRole",
  },
  UserDataShared: {
    summary: "Share user data (e.g. email, phone) with Pinpoint for richer analytics.",
    detail: "When true, Cognito sends user attributes to Pinpoint alongside auth events.",
    example: false,
  },
};

/**
 * Tool: auth.describe-client
 *
 * Returns detailed documentation for one or more Cognito User Pool Client
 * configuration fields from the local FIELD_DOCS map.
 *
 * Use this before auth.configure-client whenever the user asks what a field
 * does or is unsure which option to pick. Do NOT guess — look up the field
 * first, then explain it to the user in plain language.
 */
export function registerUserClientDescribeTool(server) {
  server.tool(
    "auth.describe-client",
    `Return detailed documentation for one or more Cognito User Pool Client configuration fields.
Use this tool BEFORE calling auth.configure-client whenever the user asks what a field does,
is unsure which option to pick, or you need to present options clearly.
Do NOT guess — look up the field first, then explain it to the user in plain language.`,
    {
      fields: z
        .array(z.string())
        .describe("Field names to look up, e.g. ['ExplicitAuthFlows', 'AllowedOAuthFlows']"),
    },
    async ({ fields }) => {
      const results = fields.map((f) => {
        const doc = FIELD_DOCS[f];
        if (!doc) return `**${f}**: No documentation found.`;
        const lines = [`**${f}**: ${doc.summary}`];
        if (doc.detail) lines.push(`  → ${doc.detail}`);
        if (doc.example !== undefined) lines.push(`  Example: \`${JSON.stringify(doc.example)}\``);
        return lines.join("\n");
      });

      return {
        content: [{ type: "text", text: results.join("\n\n") }],
      };
    }
  );
}

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
