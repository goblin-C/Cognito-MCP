import { z } from "zod";

const HELP_CONTENT = {
  overview: `# Cognito MCP — Tool Overview

This MCP server generates AWS Cognito CloudFormation templates.
It provides quick-start tools, per-resource describe/configure pairs,
a configuration modifier, and Google social login support.

## Available Tools

| Tool                    | Purpose                                                |
|-------------------------|--------------------------------------------------------|
| auth.help               | This tool — get usage docs and guidance                |
| auth.setup-basic        | Generate a complete basic-auth stack in one call       |
| auth.describe-pool      | Look up documentation for a User Pool field            |
| auth.configure-pool     | Generate User Pool CloudFormation YAML                 |
| auth.describe-client    | Look up documentation for a User Pool Client field     |
| auth.configure-client   | Generate User Pool Client CloudFormation YAML          |
| auth.describe-domain    | Look up documentation for a User Pool Domain field     |
| auth.configure-domain   | Generate User Pool Domain CloudFormation YAML          |
| auth.describe-provider  | Look up documentation for an Identity Provider field   |
| auth.configure-provider | Generate Identity Provider CloudFormation YAML         |
| auth.modify-config      | Modify an existing CloudFormation YAML template        |
| auth.interactive-pool   | **Interactive** — set up a User Pool via guided forms  |
| auth.interactive-client | **Interactive** — set up an App Client via guided forms|
| auth.interactive-domain | **Interactive** — set up a Domain via guided forms     |

## Output Format

All configure tools return a complete AWS CloudFormation template as YAML text.
Save each output to a .yaml file and deploy with the AWS CLI or include in a larger stack.

## Usage Pattern

**Interactive (recommended for new users):** Use \`auth.interactive-pool\`, \`auth.interactive-client\`,
and \`auth.interactive-domain\` — they ask you step-by-step questions via forms so you don't need
to know any parameter names upfront.

**Quick start:** Call \`auth.setup-basic\` with just an app name and callback URLs
to get a complete, deployment-ready stack (User Pool + Client + Domain).

**Granular control:** Use the describe/configure pairs for individual resources.

**Iterate:** Use \`auth.modify-config\` to tweak any generated template without regenerating.

## Topics

Run auth.help with one of these topics for detailed guidance:
- **interactive** — Interactive form-based tools (recommended for new users)
- **setup**    — Quick-start setup tool (auth.setup-basic)
- **pool**     — User Pool tools (describe-pool, configure-pool)
- **client**   — User Pool Client tools (describe-client, configure-client)
- **domain**   — User Pool Domain tools (describe-domain, configure-domain)
- **provider** — Identity Provider tools (describe-provider, configure-provider)
- **modify**   — Configuration modifier (auth.modify-config)
- **google**   — Google social login setup guide
- **workflow** — Step-by-step guide to build a full Cognito stack`,

  pool: `# User Pool Tools

## auth.describe-pool

Look up documentation for one or more User Pool configuration fields before you configure them.

**Input:**
\`\`\`json
{ "fields": ["MfaConfiguration", "PasswordMinimumLength"] }
\`\`\`

Returns a summary, detailed explanation, and example value for each field.
Call this whenever you are unsure what a field does or what values it accepts.

---

## auth.configure-pool

Generate a CloudFormation template for \`AWS::Cognito::UserPool\`.

**Required:**
- \`UserPoolName\` (string) — Descriptive name for the pool

**Key optional parameters (grouped by concern):**

### Identity & Sign-in
| Parameter              | Type            | Description                                      |
|------------------------|-----------------|--------------------------------------------------|
| UsernameAttributes     | array           | Allow sign-in with email and/or phone_number     |
| AliasAttributes        | array           | Aliases for username-based pools                 |
| AutoVerifiedAttributes | array           | Auto-verify email and/or phone_number on sign-up |
| CaseSensitiveUsername  | boolean         | Enable case-sensitive username matching          |

### Password Policy
| Parameter                   | Type    | Description                              |
|-----------------------------|---------|------------------------------------------|
| PasswordMinimumLength       | number  | Min length (6–99)                        |
| PasswordRequireUppercase    | boolean | Require uppercase letter                 |
| PasswordRequireLowercase    | boolean | Require lowercase letter                 |
| PasswordRequireNumbers      | boolean | Require a digit                          |
| PasswordRequireSymbols      | boolean | Require a symbol                         |
| TemporaryPasswordValidityDays | number | Days before admin temp password expires  |

### MFA
| Parameter                       | Type   | Values                                     |
|---------------------------------|--------|--------------------------------------------|
| MfaConfiguration                | enum   | OFF \| ON \| OPTIONAL                      |
| EnabledMfas                     | array  | SMS_MFA, SOFTWARE_TOKEN_MFA, EMAIL_OTP     |
| ChallengeRequiredOnNewDevice    | boolean| Require MFA challenge on new devices       |

### Email
| Parameter              | Type   | Description                                    |
|------------------------|--------|------------------------------------------------|
| EmailSendingAccount    | enum   | COGNITO_DEFAULT \| DEVELOPER (use SES)         |
| FromEmailAddress       | string | From address (required for DEVELOPER)          |
| SourceArn              | string | SES source ARN (required for DEVELOPER)        |

### Lambda Triggers
| Parameter              | Type   | Description                              |
|------------------------|--------|------------------------------------------|
| PreSignUp              | string | Lambda ARN — runs before registration    |
| PostConfirmation       | string | Lambda ARN — runs after confirmation     |
| PreTokenGeneration     | string | Lambda ARN — customize token claims      |
| CustomMessage          | string | Lambda ARN — customize all Cognito messages |

For a full parameter list, ask: auth.describe-pool with the field name.

**Output file:** \`cognito-userpool.yaml\``,

  client: `# User Pool Client Tools

## auth.describe-client

Look up documentation for one or more User Pool Client configuration fields.

**Input:**
\`\`\`json
{ "fields": ["ExplicitAuthFlows", "AllowedOAuthFlows"] }
\`\`\`

Returns a summary, detailed explanation, and example value for each field.

---

## auth.configure-client

Generate a CloudFormation template for \`AWS::Cognito::UserPoolClient\`.

**Required:**
- \`ClientName\` (string) — Descriptive name for the client
- \`UserPoolId\` (string) — ID of the User Pool (format: \`region_xxxxxxxxx\`)

**Key optional parameters (grouped by concern):**

### Authentication Flows
| Parameter          | Type  | Common values                                                      |
|--------------------|-------|--------------------------------------------------------------------|
| ExplicitAuthFlows  | array | ALLOW_USER_SRP_AUTH, ALLOW_REFRESH_TOKEN_AUTH, ALLOW_CUSTOM_AUTH   |

Recommended for web/mobile: \`["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]\`
For server-side apps only: add \`ALLOW_USER_PASSWORD_AUTH\`

### OAuth 2.0
| Parameter                     | Type    | Description                                 |
|-------------------------------|---------|---------------------------------------------|
| AllowedOAuthFlowsUserPoolClient | boolean | Enable OAuth features                     |
| AllowedOAuthFlows             | array   | code \| implicit \| client_credentials      |
| AllowedOAuthScopes            | array   | openid, email, profile, phone, etc.         |
| CallbackURLs                  | array   | Allowed redirect URLs after sign-in         |
| LogoutURLs                    | array   | Allowed redirect URLs after sign-out        |
| SupportedIdentityProviders    | array   | COGNITO, Google, Facebook, etc.             |

### Token Validity
| Parameter              | Type   | Description                                 |
|------------------------|--------|---------------------------------------------|
| AccessTokenValidity    | number | Duration for access tokens                  |
| IdTokenValidity        | number | Duration for ID tokens                      |
| RefreshTokenValidity   | number | Duration for refresh tokens                 |
| TokenValidityUnits     | object | Units per token (seconds/minutes/hours/days)|

### Security
| Parameter                   | Type    | Description                                  |
|-----------------------------|---------|----------------------------------------------|
| GenerateSecret              | boolean | Generate client secret (server-side apps)    |
| PreventUserExistenceErrors  | enum    | ENABLED hides whether an account exists      |
| EnableTokenRevocation       | boolean | Allow refresh token revocation               |

**Output file:** \`cognito-userpool-client.yaml\``,

  domain: `# User Pool Domain Tools

## auth.describe-domain

Look up documentation for User Pool Domain configuration fields.

**Input:**
\`\`\`json
{ "fields": ["Domain", "ManagedLoginVersion"] }
\`\`\`

---

## auth.configure-domain

Generate a CloudFormation template for \`AWS::Cognito::UserPoolDomain\`.

**Required:**
- \`Domain\` (string) — Domain prefix or custom domain
- \`UserPoolId\` (string) — ID of the User Pool (format: \`region_xxxxxxxxx\`)

### Domain types

**Cognito-managed domain** (simpler setup):
- Provide just a prefix, e.g. \`"myapp"\`
- Results in: \`myapp.auth.us-east-1.amazoncognito.com\`
- Must be globally unique, lowercase, letters/numbers/hyphens only

**Custom domain** (e.g. \`auth.myapp.com\`):
- Provide the full domain name
- Also provide \`CertificateArn\` — an ACM certificate in \`us-east-1\` covering that domain
- Requires a CNAME DNS record pointing your domain to the CloudFront distribution Cognito returns

### Optional
| Parameter            | Type   | Description                                              |
|----------------------|--------|----------------------------------------------------------|
| ManagedLoginVersion  | number | 1 = original hosted UI, 2 = new managed login (ESSENTIALS/PLUS tier) |
| CertificateArn       | string | ACM certificate ARN in us-east-1 (custom domain only)   |

**Output file:** \`cognito-userpool-domain.yaml\``,

  interactive: `# Interactive Tools — Guided Form Setup

These tools use **MCP elicitation** to present step-by-step forms.
You don't need to know any Cognito parameter names — just answer the questions.

## Available Interactive Tools

| Tool                    | What it sets up                                  |
|-------------------------|--------------------------------------------------|
| auth.interactive-pool   | User Pool (sign-in, password policy, MFA, email) |
| auth.interactive-client | App Client (auth flows, OAuth, callbacks, tokens)|
| auth.interactive-domain | Domain (Cognito prefix or custom domain)         |

## How it works

1. Call any interactive tool with **no arguments**
2. The server presents a form for each step (2–3 steps per tool)
3. Fill in the form fields — they have descriptions, defaults, and dropdowns
4. The tool generates a CloudFormation YAML template from your answers

## Recommended order

1. \`auth.interactive-pool\` — creates the User Pool
2. \`auth.interactive-client\` — creates the App Client (needs the Pool ID)
3. \`auth.interactive-domain\` — creates the Domain (needs the Pool ID)

## When to use interactive vs. configure tools

- **Interactive** — when you're exploring or don't know exact parameter names
- **Configure** — when you already know what you want and can pass parameters directly
- **setup-basic** — when you want everything in a single template with sensible defaults

Both produce the same CloudFormation YAML output.`,

  setup: `# Quick Setup — auth.setup-basic

Generate a complete, deployment-ready CloudFormation stack with a single tool call.

## What it creates
- **User Pool** — email sign-in, auto-verified email, configurable password policy, optional TOTP MFA
- **App Client** — authorization code flow, OAuth scopes (openid, email, profile)
- **Domain** — Cognito hosted UI domain

All three resources are linked with \`!Ref\` and the template includes stack Outputs
(UserPoolId, UserPoolClientId, CognitoDomain).

## Required input
- \`appName\` (string) — your application name, used to name all resources
- \`callbackURLs\` (string[]) — OAuth callback URLs

## Optional
| Parameter                  | Type    | Default                     |
|----------------------------|---------|-----------------------------|
| mfaConfiguration           | enum    | OFF (options: OFF, OPTIONAL, ON) |
| passwordMinimumLength      | number  | 8                           |
| passwordRequireUppercase   | boolean | true                        |
| passwordRequireLowercase   | boolean | true                        |
| passwordRequireNumbers     | boolean | true                        |
| passwordRequireSymbols     | boolean | false                       |
| domainPrefix               | string  | derived from appName        |
| logoutURLs                 | string[]| —                           |

## Example
\`\`\`json
{
  "appName": "MyApp",
  "callbackURLs": ["https://myapp.com/callback", "http://localhost:3000/callback"],
  "mfaConfiguration": "OPTIONAL",
  "logoutURLs": ["https://myapp.com/logout"]
}
\`\`\`

**Output:** a single \`cognito-basic-auth-stack.yaml\` with all three resources and Outputs.

## Next steps
- Add Google social login: \`auth.configure-provider\`
- Tweak the generated template: \`auth.modify-config\`
- Look up individual fields: \`auth.describe-pool\` / \`auth.describe-client\``,

  provider: `# Identity Provider Tools

## auth.describe-provider

Look up documentation for one or more Identity Provider configuration fields.

**Input:**
\`\`\`json
{ "fields": ["ClientId", "AttributeMapping"] }
\`\`\`

Returns a summary, detailed explanation, and example value for each field.

---

## auth.configure-provider

Generate a CloudFormation template for \`AWS::Cognito::UserPoolIdentityProvider\`.
Defaults to Google OAuth with placeholder credentials.

**Required:**
- \`UserPoolId\` (string) — ID of the User Pool

**Optional (all have sensible defaults for Google):**

| Parameter        | Type   | Default                              |
|------------------|--------|--------------------------------------|
| ProviderName     | string | Google                               |
| ProviderType     | enum   | Google                               |
| ClientId         | string | YOUR_GOOGLE_CLIENT_ID (placeholder)  |
| ClientSecret     | string | YOUR_GOOGLE_CLIENT_SECRET (placeholder) |
| AuthorizeScopes  | string | openid email profile                 |
| AttributeMapping | object | email, name, picture, username → sub |
| IdpIdentifiers   | array  | —                                    |

**Example (minimal — generates Google IdP with placeholders):**
\`\`\`json
{ "UserPoolId": "us-east-1_xxxxxxxx" }
\`\`\`

After generating, replace the placeholder credentials with real Google OAuth
credentials. See \`auth.help\` topic **google** for a full setup guide.

**Output file:** \`cognito-identity-provider.yaml\``,

  modify: `# Modify Configuration — auth.modify-config

Iteratively refine a previously generated CloudFormation template without
regenerating it from scratch.

## Input
- \`existingYaml\` (string) — the full CloudFormation YAML template
- \`changes\` (array of objects):
  - \`path\` — dot-separated path to the field (e.g. \`Resources.CognitoUserPool.Properties.MfaConfiguration\`)
  - \`value\` — new value to set (omit when deleting)
  - \`action\` — \`set\` (default) or \`delete\`

## Example: Enable MFA on an existing pool
\`\`\`json
{
  "existingYaml": "<paste your YAML here>",
  "changes": [
    { "path": "Resources.CognitoUserPool.Properties.MfaConfiguration", "value": "ON" },
    { "path": "Resources.CognitoUserPool.Properties.EnabledMfas", "value": ["SOFTWARE_TOKEN_MFA"] }
  ]
}
\`\`\`

## Example: Add Google to SupportedIdentityProviders
\`\`\`json
{
  "existingYaml": "<paste your client YAML here>",
  "changes": [
    {
      "path": "Resources.CognitoUserPoolClient.Properties.SupportedIdentityProviders",
      "value": ["COGNITO", "Google"]
    }
  ]
}
\`\`\`

## Example: Remove a field
\`\`\`json
{
  "existingYaml": "<paste your YAML here>",
  "changes": [
    { "path": "Resources.CognitoUserPool.Properties.UserPoolAddOns", "action": "delete" }
  ]
}
\`\`\`

The tool creates intermediate objects automatically if a path doesn't exist yet.`,

  google: `# Google Social Login — Setup Guide

## Quick steps

1. **Generate the template** — call \`auth.configure-provider\` with just your \`UserPoolId\`.
   It produces a CloudFormation template with placeholder Google credentials.

2. **Get Google OAuth credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create or select a project
   - **APIs & Services → OAuth consent screen** — configure with \`amazoncognito.com\` as authorized domain
   - **APIs & Services → Credentials → Create OAuth client ID** (Web application)
   - Set **Authorized redirect URI** to:
     \`https://<domain-prefix>.auth.<region>.amazoncognito.com/oauth2/idpresponse\`
   - Copy the **Client ID** and **Client Secret**

3. **Replace placeholders** in the generated YAML:
   - \`YOUR_GOOGLE_CLIENT_ID\` → your actual Client ID
   - \`YOUR_GOOGLE_CLIENT_SECRET\` → your actual Client Secret

4. **Update your App Client** — add \`"Google"\` to \`SupportedIdentityProviders\`
   (use \`auth.modify-config\` or regenerate with \`auth.configure-client\`)

5. **Deploy** the identity provider template after your User Pool and Domain

## Full guide

See \`docs/google-social-login-guide.md\` for the complete step-by-step walkthrough
with troubleshooting tips.`,

  workflow: `# Full Cognito Stack — Recommended Workflow

## Quick Alternative

For a basic email/password setup, use \`auth.setup-basic\` — it generates a complete
stack (User Pool + Client + Domain) in a single call. See \`auth.help\` topic **setup**.

The step-by-step workflow below gives you full control over each resource.

---

## Step 1: Configure the User Pool

Call \`auth.configure-pool\` with your pool settings.

\`\`\`json
{
  "UserPoolName": "MyAppUserPool",
  "UsernameAttributes": ["email"],
  "AutoVerifiedAttributes": ["email"],
  "MfaConfiguration": "OPTIONAL",
  "EnabledMfas": ["SOFTWARE_TOKEN_MFA"],
  "PasswordMinimumLength": 8,
  "PasswordRequireUppercase": true,
  "PasswordRequireNumbers": true
}
\`\`\`

Save the output as: **\`cognito-userpool.yaml\`**

Deploy it and note the User Pool ID from the stack outputs (format: \`us-east-1_xxxxxxxx\`).

---

## Step 2: Configure the User Pool Client

Call \`auth.configure-client\` using the User Pool ID from Step 1.

\`\`\`json
{
  "ClientName": "MyAppWebClient",
  "UserPoolId": "us-east-1_xxxxxxxx",
  "ExplicitAuthFlows": ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
  "AllowedOAuthFlowsUserPoolClient": true,
  "AllowedOAuthFlows": ["code"],
  "AllowedOAuthScopes": ["openid", "email", "profile"],
  "CallbackURLs": ["https://myapp.com/callback"],
  "LogoutURLs": ["https://myapp.com/logout"],
  "SupportedIdentityProviders": ["COGNITO"]
}
\`\`\`

Save the output as: **\`cognito-userpool-client.yaml\`**

---

## Step 3: Configure the Domain (optional)

Required if you want to use Cognito's hosted UI or OAuth flows.
Call \`auth.configure-domain\` with the User Pool ID from Step 1.

\`\`\`json
{
  "Domain": "myapp-auth",
  "UserPoolId": "us-east-1_xxxxxxxx",
  "ManagedLoginVersion": 1
}
\`\`\`

Save the output as: **\`cognito-userpool-domain.yaml\`**

---

## Step 4: Add Google Social Login (optional)

Call \`auth.configure-provider\` with the User Pool ID from Step 1.

\`\`\`json
{
  "UserPoolId": "us-east-1_xxxxxxxx"
}
\`\`\`

This generates a template with placeholder Google credentials.
See \`auth.help\` topic **google** for how to obtain real credentials.

Save the output as: **\`cognito-identity-provider.yaml\`**

Remember to update your App Client's \`SupportedIdentityProviders\` to include \`"Google"\`.

---

## Step 5: Deploy

Deploy each file in order using the AWS CLI:

\`\`\`bash
aws cloudformation deploy \\
  --template-file cognito-userpool.yaml \\
  --stack-name my-app-userpool \\
  --region us-east-1

aws cloudformation deploy \\
  --template-file cognito-userpool-client.yaml \\
  --stack-name my-app-userpool-client \\
  --region us-east-1

aws cloudformation deploy \\
  --template-file cognito-userpool-domain.yaml \\
  --stack-name my-app-userpool-domain \\
  --region us-east-1

# Only if you configured a provider:
aws cloudformation deploy \\
  --template-file cognito-identity-provider.yaml \\
  --stack-name my-app-google-idp \\
  --region us-east-1
\`\`\`

---

## Tips

- Use \`auth.describe-pool\`, \`auth.describe-client\`, \`auth.describe-domain\`, or
  \`auth.describe-provider\` at any point to look up field documentation.
- Use \`auth.modify-config\` to tweak any generated template without starting over.
- The Domain step must come after the Pool step (requires a valid UserPoolId).
- The Client step can be repeated to create multiple clients for the same pool
  (e.g. one for web, one for mobile, one for a backend service).`,
};

export function registerHelpTool(mcpServer) {
  mcpServer.tool(
    "auth.help",
    "Get documentation and usage guidance for the Cognito MCP server. Returns an overview of all available tools, their purpose, parameters, and the recommended workflow. Use the 'topic' parameter to focus on a specific area.",
    {
      topic: z
        .enum(["overview", "interactive", "pool", "client", "domain", "provider", "setup", "modify", "google", "workflow"])
        .optional()
        .describe(
          "Topic to get help on. Omit for a full overview. Options: overview | interactive | setup | pool | client | domain | provider | modify | google | workflow"
        ),
    },
    async ({ topic }) => {
      const key = topic ?? "overview";
      const content = HELP_CONTENT[key];
      return {
        content: [{ type: "text", text: content }],
      };
    }
  );
}
