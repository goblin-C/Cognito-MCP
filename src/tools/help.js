import { z } from "zod";

const HELP_CONTENT = {
  overview: `# Cognito MCP — Tool Overview

This MCP server generates AWS Cognito CloudFormation templates.
Each resource type has two tools: a **describe** tool to look up field documentation,
and a **configure** tool to generate the CloudFormation YAML.

## Available Tools

| Tool                  | Purpose                                              |
|-----------------------|------------------------------------------------------|
| auth.help             | This tool — get usage docs and guidance              |
| auth.describe-pool    | Look up documentation for a User Pool field          |
| auth.configure-pool   | Generate User Pool CloudFormation YAML               |
| auth.describe-client  | Look up documentation for a User Pool Client field   |
| auth.configure-client | Generate User Pool Client CloudFormation YAML        |
| auth.describe-domain  | Look up documentation for a User Pool Domain field   |
| auth.configure-domain | Generate User Pool Domain CloudFormation YAML        |

## Output Format

All configure tools return a complete AWS CloudFormation template as YAML text.
The template contains a single resource of the corresponding Cognito type.
Save each output to a .yaml file and deploy with the AWS CLI or include in a larger stack.

## Usage Pattern

1. Call a describe tool with a list of field names to understand what they do.
2. Call the configure tool with your chosen values to generate the YAML.

## Topics

Run auth.help with one of these topics for detailed guidance:
- **pool**     — User Pool tools (describe-pool, configure-pool)
- **client**   — User Pool Client tools (describe-client, configure-client)
- **domain**   — User Pool Domain tools (describe-domain, configure-domain)
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

  workflow: `# Full Cognito Stack — Recommended Workflow

Follow these steps in order. Each step depends on the previous one.

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

## Step 4: Deploy

Deploy each file using the AWS CLI:

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
\`\`\`

Or combine all three templates into a single CloudFormation stack.

---

## Tips

- Use \`auth.describe-pool\`, \`auth.describe-client\`, or \`auth.describe-domain\` at any point
  to get detailed documentation for a specific field before you use it.
- The Domain step must come after the Pool step (requires a valid UserPoolId).
- The Client step can be repeated to create multiple clients for the same pool
  (e.g. one for web, one for mobile, one for a backend service).`,
};

export function registerHelpTool(mcpServer) {
  mcpServer.tool(
    "auth.help",
    "Get documentation and usage guidance for the Cognito MCP server. Returns an overview of all available tools, their purpose, parameters, and the recommended workflow. Use the 'topic' parameter to focus on a specific area: 'pool', 'client', 'domain', or 'workflow'.",
    {
      topic: z
        .enum(["overview", "pool", "client", "domain", "workflow"])
        .optional()
        .describe(
          "Topic to get help on. Omit for a full overview. Options: overview | pool | client | domain | workflow"
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
