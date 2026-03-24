import { z } from "zod";
import { buildYaml } from "../utils/helpers.js";

// ────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────

/**
 * Wrapper around server.server.elicitInput that handles decline/cancel.
 * Returns the accepted content or null if the user cancelled.
 * Throws a clear error if the MCP client does not support elicitation.
 */
async function elicit(server, message, schema) {
  let result;
  try {
    result = await server.server.elicitInput({
      mode: "form",
      message,
      requestedSchema: {
        type: "object",
        properties: schema.properties,
        required: schema.required ?? [],
      },
    });
  } catch (err) {
    if (err.message?.includes("elicitation")) {
      throw new Error(
        "Your MCP client does not support form elicitation. " +
          "Use the non-interactive tools instead (auth.configure-pool, auth.configure-client, auth.configure-domain) " +
          "or try a client that supports MCP elicitation."
      );
    }
    throw err;
  }

  if (result.action === "accept" && result.content) return result.content;
  return null;
}

/** Wrap buildYaml output in a CloudFormation template. */
function wrapCfTemplate(description, resourceId, resourceType, propsYaml) {
  return [
    "AWSTemplateFormatVersion: '2010-09-09'",
    `Description: ${description}`,
    "",
    "Resources:",
    `  ${resourceId}:`,
    `    Type: ${resourceType}`,
    "    Properties:",
    propsYaml
      .split("\n")
      .map((l) => `      ${l}`)
      .join("\n"),
  ].join("\n");
}

// ────────────────────────────────────────────────────────────────
// auth.interactive-pool
// ────────────────────────────────────────────────────────────────

export function registerInteractivePoolTool(server) {
  server.tool(
    "auth.interactive-pool",
    "Interactively set up a Cognito User Pool through step-by-step forms. Asks you questions about sign-in, password policy, MFA, and email — then generates the CloudFormation YAML. No prior Cognito knowledge needed.",
    {},
    async () => {
      try {
        // ── Step 1: Basics ──────────────────────────────────────
        const basics = await elicit(
          server,
          "Step 1 of 3 — User Pool Basics\n\nLet's start with the fundamentals of your User Pool.",
          {
            properties: {
              UserPoolName: {
                type: "string",
                title: "Pool Name",
                description: "A name for your User Pool (e.g. MyAppUserPool)",
                minLength: 1,
              },
              UsernameAttributes: {
                type: "array",
                title: "Sign-in Method",
                description:
                  "How should users sign in? Select one or both.",
                items: {
                  type: "string",
                  enum: ["email", "phone_number"],
                },
                minItems: 1,
                maxItems: 2,
              },
              AutoVerifiedAttributes: {
                type: "array",
                title: "Auto-verify",
                description:
                  "Which attributes should be auto-verified on sign-up?",
                items: {
                  type: "string",
                  enum: ["email", "phone_number"],
                },
              },
            },
            required: ["UserPoolName", "UsernameAttributes"],
          }
        );

        if (!basics) {
          return {
            content: [{ type: "text", text: "User Pool setup cancelled." }],
          };
        }

        // ── Step 2: Password & MFA ──────────────────────────────
        const security = await elicit(
          server,
          "Step 2 of 3 — Password Policy & MFA\n\nConfigure how strict passwords should be and whether to require MFA.",
          {
            properties: {
              PasswordMinimumLength: {
                type: "integer",
                title: "Minimum Password Length",
                description: "How many characters minimum? (6–99)",
                minimum: 6,
                maximum: 99,
                default: 8,
              },
              PasswordRequireUppercase: {
                type: "boolean",
                title: "Require Uppercase Letter",
                default: true,
              },
              PasswordRequireLowercase: {
                type: "boolean",
                title: "Require Lowercase Letter",
                default: true,
              },
              PasswordRequireNumbers: {
                type: "boolean",
                title: "Require a Digit",
                default: true,
              },
              PasswordRequireSymbols: {
                type: "boolean",
                title: "Require a Symbol",
                default: false,
              },
              MfaConfiguration: {
                type: "string",
                title: "Multi-Factor Authentication",
                description:
                  "OFF = no MFA, OPTIONAL = users can opt in, ON = required for all users",
                oneOf: [
                  { const: "OFF", title: "OFF — No MFA" },
                  {
                    const: "OPTIONAL",
                    title: "OPTIONAL — Users can enable TOTP",
                  },
                  { const: "ON", title: "ON — MFA required (TOTP)" },
                ],
                default: "OFF",
              },
            },
          }
        );

        if (!security) {
          return {
            content: [{ type: "text", text: "User Pool setup cancelled." }],
          };
        }

        // ── Step 3: Email Configuration ─────────────────────────
        const email = await elicit(
          server,
          "Step 3 of 3 — Email Configuration\n\nHow should Cognito send verification and password-reset emails?",
          {
            properties: {
              EmailSendingAccount: {
                type: "string",
                title: "Email Sender",
                description:
                  "COGNITO_DEFAULT uses Cognito's built-in email (limited to 50/day). DEVELOPER uses your own SES identity (higher limits, custom From address).",
                oneOf: [
                  {
                    const: "COGNITO_DEFAULT",
                    title: "COGNITO_DEFAULT — Built-in (50 emails/day limit)",
                  },
                  {
                    const: "DEVELOPER",
                    title: "DEVELOPER — Use Amazon SES (custom From address)",
                  },
                ],
                default: "COGNITO_DEFAULT",
              },
              FromEmailAddress: {
                type: "string",
                title: "From Email Address",
                description:
                  "Only needed if you chose DEVELOPER above. Must be a verified SES identity.",
                format: "email",
              },
              SourceArn: {
                type: "string",
                title: "SES Source ARN",
                description:
                  "Only needed if you chose DEVELOPER above. The ARN of your verified SES identity.",
              },
            },
          }
        );

        if (!email) {
          return {
            content: [{ type: "text", text: "User Pool setup cancelled." }],
          };
        }

        // ── Build the CloudFormation properties ─────────────────
        const props = {
          UserPoolName: basics.UserPoolName,
        };

        if (basics.UsernameAttributes) {
          props.UsernameAttributes = basics.UsernameAttributes;
        }
        if (
          basics.AutoVerifiedAttributes &&
          basics.AutoVerifiedAttributes.length > 0
        ) {
          props.AutoVerifiedAttributes = basics.AutoVerifiedAttributes;
        }

        // Password policy
        const pp = {};
        if (security.PasswordMinimumLength !== undefined)
          pp.MinimumLength = security.PasswordMinimumLength;
        if (security.PasswordRequireUppercase !== undefined)
          pp.RequireUppercase = security.PasswordRequireUppercase;
        if (security.PasswordRequireLowercase !== undefined)
          pp.RequireLowercase = security.PasswordRequireLowercase;
        if (security.PasswordRequireNumbers !== undefined)
          pp.RequireNumbers = security.PasswordRequireNumbers;
        if (security.PasswordRequireSymbols !== undefined)
          pp.RequireSymbols = security.PasswordRequireSymbols;
        if (Object.keys(pp).length > 0) {
          props.Policies = { PasswordPolicy: pp };
        }

        // MFA
        const mfa = security.MfaConfiguration ?? "OFF";
        props.MfaConfiguration = mfa;
        if (mfa !== "OFF") {
          props.EnabledMfas = ["SOFTWARE_TOKEN_MFA"];
        }

        // Email
        const emailSender = email.EmailSendingAccount ?? "COGNITO_DEFAULT";
        if (emailSender === "DEVELOPER") {
          const emailCfg = { EmailSendingAccount: "DEVELOPER" };
          if (email.FromEmailAddress) emailCfg.From = email.FromEmailAddress;
          if (email.SourceArn) emailCfg.SourceArn = email.SourceArn;
          props.EmailConfiguration = emailCfg;
        }

        // Account recovery
        props.AccountRecoverySetting = {
          RecoveryMechanisms: [{ Name: "verified_email", Priority: 1 }],
        };

        const yaml = buildYaml(props);
        const cfTemplate = wrapCfTemplate(
          "Cognito User Pool generated by cognito-mcp (interactive)",
          "CognitoUserPool",
          "AWS::Cognito::UserPool",
          yaml
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Here is your Cognito User Pool CloudFormation configuration:\n\n\`\`\`yaml\n${cfTemplate}\n\`\`\`\n\n` +
                "Save this as `cognito-userpool.yaml` in your project.\n\n" +
                "**Next:** Run `auth.interactive-client` to set up an App Client for this pool.",
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Interactive setup failed: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

// ────────────────────────────────────────────────────────────────
// auth.interactive-client
// ────────────────────────────────────────────────────────────────

export function registerInteractiveClientTool(server) {
  server.tool(
    "auth.interactive-client",
    "Interactively set up a Cognito User Pool Client through step-by-step forms. Asks you about auth flows, OAuth settings, callbacks, and token config — then generates the CloudFormation YAML.",
    {},
    async () => {
      try {
        // ── Step 1: Basics ──────────────────────────────────────
        const basics = await elicit(
          server,
          "Step 1 of 3 — Client Basics\n\nProvide the client name and the User Pool to attach it to.",
          {
            properties: {
              ClientName: {
                type: "string",
                title: "Client Name",
                description:
                  "A name for this client (e.g. MyAppWebClient)",
                minLength: 1,
              },
              UserPoolId: {
                type: "string",
                title: "User Pool ID",
                description:
                  "The ID of the User Pool (format: us-east-1_xxxxxxxx). Get this from your pool's CloudFormation stack outputs.",
                minLength: 1,
              },
              GenerateSecret: {
                type: "boolean",
                title: "Generate Client Secret",
                description:
                  "Enable for server-side apps. Disable for browser/mobile SPAs.",
                default: false,
              },
            },
            required: ["ClientName", "UserPoolId"],
          }
        );

        if (!basics) {
          return {
            content: [{ type: "text", text: "Client setup cancelled." }],
          };
        }

        // ── Step 2: Auth Flows & OAuth ──────────────────────────
        const oauth = await elicit(
          server,
          "Step 2 of 3 — Authentication & OAuth\n\nChoose how users will authenticate and which OAuth settings to enable.",
          {
            properties: {
              ExplicitAuthFlows: {
                type: "array",
                title: "Auth Flows",
                description:
                  "Which authentication flows should this client support?",
                items: {
                  type: "string",
                  enum: [
                    "ALLOW_USER_SRP_AUTH",
                    "ALLOW_REFRESH_TOKEN_AUTH",
                    "ALLOW_USER_PASSWORD_AUTH",
                    "ALLOW_CUSTOM_AUTH",
                  ],
                },
                minItems: 1,
              },
              AllowedOAuthFlows: {
                type: "array",
                title: "OAuth Grant Types",
                description:
                  "Which OAuth flows to allow? 'code' is recommended for most apps.",
                items: {
                  type: "string",
                  enum: ["code", "implicit", "client_credentials"],
                },
                minItems: 1,
              },
              AllowedOAuthScopes: {
                type: "array",
                title: "OAuth Scopes",
                description:
                  "Which scopes to request? openid + email + profile covers most use cases.",
                items: {
                  type: "string",
                  enum: [
                    "openid",
                    "email",
                    "profile",
                    "phone",
                    "aws.cognito.signin.user.admin",
                  ],
                },
                minItems: 1,
              },
              SupportedIdentityProviders: {
                type: "array",
                title: "Identity Providers",
                description:
                  "Which sign-in providers should this client support?",
                items: {
                  type: "string",
                  enum: [
                    "COGNITO",
                    "Google",
                    "Facebook",
                    "LoginWithAmazon",
                    "SignInWithApple",
                  ],
                },
                minItems: 1,
              },
            },
          }
        );

        if (!oauth) {
          return {
            content: [{ type: "text", text: "Client setup cancelled." }],
          };
        }

        // ── Step 3: Callback URLs & Tokens ──────────────────────
        const urls = await elicit(
          server,
          "Step 3 of 3 — Callback URLs & Token Settings\n\nWhere should users be redirected after sign-in/sign-out, and how long should tokens last?",
          {
            properties: {
              CallbackURL: {
                type: "string",
                title: "Callback URL",
                description:
                  "Where to redirect after sign-in (e.g. https://myapp.com/callback). Add more later with auth.modify-config.",
                format: "uri",
              },
              LogoutURL: {
                type: "string",
                title: "Logout URL",
                description:
                  "Where to redirect after sign-out (e.g. https://myapp.com/logout)",
                format: "uri",
              },
              AccessTokenValidity: {
                type: "integer",
                title: "Access Token Validity (hours)",
                description: "How many hours access tokens are valid (default: 1)",
                minimum: 1,
                maximum: 24,
                default: 1,
              },
              IdTokenValidity: {
                type: "integer",
                title: "ID Token Validity (hours)",
                description: "How many hours ID tokens are valid (default: 1)",
                minimum: 1,
                maximum: 24,
                default: 1,
              },
              RefreshTokenValidity: {
                type: "integer",
                title: "Refresh Token Validity (days)",
                description:
                  "How many days refresh tokens are valid (default: 30)",
                minimum: 1,
                maximum: 3650,
                default: 30,
              },
            },
          }
        );

        if (!urls) {
          return {
            content: [{ type: "text", text: "Client setup cancelled." }],
          };
        }

        // ── Build the CloudFormation properties ─────────────────
        const props = {
          ClientName: basics.ClientName,
          UserPoolId: basics.UserPoolId,
        };

        if (basics.GenerateSecret !== undefined) {
          props.GenerateSecret = basics.GenerateSecret;
        }

        if (oauth.ExplicitAuthFlows && oauth.ExplicitAuthFlows.length > 0) {
          props.ExplicitAuthFlows = oauth.ExplicitAuthFlows;
        }

        // OAuth
        const hasOAuth =
          oauth.AllowedOAuthFlows && oauth.AllowedOAuthFlows.length > 0;
        if (hasOAuth) {
          props.AllowedOAuthFlowsUserPoolClient = true;
          props.AllowedOAuthFlows = oauth.AllowedOAuthFlows;
        }
        if (oauth.AllowedOAuthScopes && oauth.AllowedOAuthScopes.length > 0) {
          props.AllowedOAuthScopes = oauth.AllowedOAuthScopes;
        }
        if (
          oauth.SupportedIdentityProviders &&
          oauth.SupportedIdentityProviders.length > 0
        ) {
          props.SupportedIdentityProviders = oauth.SupportedIdentityProviders;
        }

        // URLs
        if (urls.CallbackURL) {
          props.CallbackURLs = [urls.CallbackURL];
        }
        if (urls.LogoutURL) {
          props.LogoutURLs = [urls.LogoutURL];
        }

        // Token validity
        const tokenUnits = {};
        if (urls.AccessTokenValidity !== undefined) {
          props.AccessTokenValidity = urls.AccessTokenValidity;
          tokenUnits.AccessToken = "hours";
        }
        if (urls.IdTokenValidity !== undefined) {
          props.IdTokenValidity = urls.IdTokenValidity;
          tokenUnits.IdToken = "hours";
        }
        if (urls.RefreshTokenValidity !== undefined) {
          props.RefreshTokenValidity = urls.RefreshTokenValidity;
          tokenUnits.RefreshToken = "days";
        }
        if (Object.keys(tokenUnits).length > 0) {
          props.TokenValidityUnits = tokenUnits;
        }

        props.PreventUserExistenceErrors = "ENABLED";

        const yaml = buildYaml(props);
        const cfTemplate = wrapCfTemplate(
          "Cognito User Pool Client generated by cognito-mcp (interactive)",
          "CognitoUserPoolClient",
          "AWS::Cognito::UserPoolClient",
          yaml
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Here is your Cognito User Pool Client CloudFormation configuration:\n\n\`\`\`yaml\n${cfTemplate}\n\`\`\`\n\n` +
                "Save this as `cognito-userpool-client.yaml` in your project.\n\n" +
                "**Next:** Run `auth.interactive-domain` to set up a hosted UI domain.",
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Interactive setup failed: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

// ────────────────────────────────────────────────────────────────
// auth.interactive-domain
// ────────────────────────────────────────────────────────────────

export function registerInteractiveDomainTool(server) {
  server.tool(
    "auth.interactive-domain",
    "Interactively set up a Cognito User Pool Domain through a simple form. Asks you about domain type, prefix, and hosted UI version — then generates the CloudFormation YAML.",
    {},
    async () => {
      try {
        // ── Step 1: Domain type ─────────────────────────────────
        const domainType = await elicit(
          server,
          "Step 1 of 2 — Domain Type\n\nChoose how you want to host the Cognito sign-in UI.",
          {
            properties: {
              domainType: {
                type: "string",
                title: "Domain Type",
                description:
                  "Cognito-managed gives you a free subdomain (e.g. myapp.auth.us-east-1.amazoncognito.com). Custom domain uses your own domain (requires ACM certificate).",
                oneOf: [
                  {
                    const: "cognito",
                    title: "Cognito-managed domain (free, simpler setup)",
                  },
                  {
                    const: "custom",
                    title: "Custom domain (e.g. auth.myapp.com)",
                  },
                ],
                default: "cognito",
              },
              UserPoolId: {
                type: "string",
                title: "User Pool ID",
                description:
                  "The ID of the User Pool (format: us-east-1_xxxxxxxx)",
                minLength: 1,
              },
            },
            required: ["domainType", "UserPoolId"],
          }
        );

        if (!domainType) {
          return {
            content: [{ type: "text", text: "Domain setup cancelled." }],
          };
        }

        // ── Step 2: Domain details (varies by type) ─────────────
        const isCustom = domainType.domainType === "custom";

        const detailsSchema = isCustom
          ? {
              properties: {
                Domain: {
                  type: "string",
                  title: "Custom Domain",
                  description:
                    "Your full custom domain (e.g. auth.myapp.com). Must have a CNAME record pointing to the Cognito CloudFront distribution.",
                  minLength: 1,
                },
                CertificateArn: {
                  type: "string",
                  title: "ACM Certificate ARN",
                  description:
                    "The ARN of an ACM certificate in us-east-1 covering your custom domain.",
                  minLength: 1,
                },
                ManagedLoginVersion: {
                  type: "integer",
                  title: "Hosted UI Version",
                  description:
                    "1 = classic hosted UI, 2 = new managed login (requires ESSENTIALS or PLUS tier)",
                  minimum: 1,
                  maximum: 2,
                  default: 1,
                },
              },
              required: ["Domain", "CertificateArn"],
            }
          : {
              properties: {
                Domain: {
                  type: "string",
                  title: "Domain Prefix",
                  description:
                    "A globally unique prefix (lowercase, letters/numbers/hyphens). Your sign-in URL will be: <prefix>.auth.<region>.amazoncognito.com",
                  minLength: 1,
                },
                ManagedLoginVersion: {
                  type: "integer",
                  title: "Hosted UI Version",
                  description:
                    "1 = classic hosted UI, 2 = new managed login (requires ESSENTIALS or PLUS tier)",
                  minimum: 1,
                  maximum: 2,
                  default: 1,
                },
              },
              required: ["Domain"],
            };

        const details = await elicit(
          server,
          isCustom
            ? "Step 2 of 2 — Custom Domain Details\n\nProvide your custom domain and ACM certificate."
            : "Step 2 of 2 — Cognito Domain Prefix\n\nChoose a prefix for your hosted sign-in page.",
          detailsSchema
        );

        if (!details) {
          return {
            content: [{ type: "text", text: "Domain setup cancelled." }],
          };
        }

        // ── Build the CloudFormation properties ─────────────────
        const props = {
          Domain: details.Domain,
          UserPoolId: domainType.UserPoolId,
        };

        if (details.ManagedLoginVersion !== undefined) {
          props.ManagedLoginVersion = details.ManagedLoginVersion;
        }

        if (isCustom && details.CertificateArn) {
          props.CustomDomainConfig = {
            CertificateArn: details.CertificateArn,
          };
        }

        const yaml = buildYaml(props);
        const cfTemplate = wrapCfTemplate(
          "Cognito User Pool Domain generated by cognito-mcp (interactive)",
          "CognitoUserPoolDomain",
          "AWS::Cognito::UserPoolDomain",
          yaml
        );

        const domainUrl = isCustom
          ? details.Domain
          : `${details.Domain}.auth.<region>.amazoncognito.com`;

        return {
          content: [
            {
              type: "text",
              text:
                `Here is your Cognito User Pool Domain CloudFormation configuration:\n\n\`\`\`yaml\n${cfTemplate}\n\`\`\`\n\n` +
                `Save this as \`cognito-userpool-domain.yaml\` in your project.\n\n` +
                `Your hosted UI will be available at: \`https://${domainUrl}/login\`\n\n` +
                "**Done!** You now have all the templates needed for a complete Cognito stack.",
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Interactive setup failed: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
