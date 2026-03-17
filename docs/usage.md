# Usage Guide

## 1. Connect to the server

Add the server to your MCP client configuration (`mcp.json`):

**Without API key:**
```json
{
  "mcpServers": {
    "cognito": {
      "url": "https://your-cognito-mcp.vercel.app/mcp"
    }
  }
}
```

**With API key** (when `MCP_API_KEY` is set on the server):
```json
{
  "mcpServers": {
    "cognito": {
      "url": "https://your-cognito-mcp.vercel.app/mcp",
      "headers": {
        "x-api-key": "your-secret-key"
      }
    }
  }
}
```

Replace `https://your-cognito-mcp.vercel.app` with your actual deployed server URL.

---

## 2. Discover the tools

Once connected, call `auth.help` with no arguments to get a full overview:

```json
{ "name": "auth.help", "arguments": {} }
```

To get focused help on a specific resource:

```json
{ "name": "auth.help", "arguments": { "topic": "pool" } }
{ "name": "auth.help", "arguments": { "topic": "client" } }
{ "name": "auth.help", "arguments": { "topic": "domain" } }
{ "name": "auth.help", "arguments": { "topic": "workflow" } }
```

---

## 3. Look up a field before using it

Before configuring, use a describe tool to understand any field:

```json
{
  "name": "auth.describe-pool",
  "arguments": {
    "fields": ["MfaConfiguration", "EnabledMfas", "PasswordMinimumLength"]
  }
}
```

Returns a summary, detailed explanation, and example value for each field.

---

## 4. Generate a User Pool

```json
{
  "name": "auth.configure-pool",
  "arguments": {
    "UserPoolName": "MyAppUserPool",
    "UsernameAttributes": ["email"],
    "AutoVerifiedAttributes": ["email"],
    "MfaConfiguration": "OPTIONAL",
    "EnabledMfas": ["SOFTWARE_TOKEN_MFA"],
    "PasswordMinimumLength": 8,
    "PasswordRequireUppercase": true,
    "PasswordRequireNumbers": true,
    "PasswordRequireSymbols": true
  }
}
```

Save the returned YAML as `cognito-userpool.yaml`.

---

## 5. Generate a User Pool Client

Use the User Pool ID from your deployed pool (format: `us-east-1_xxxxxxxx`):

```json
{
  "name": "auth.configure-client",
  "arguments": {
    "ClientName": "MyAppWebClient",
    "UserPoolId": "us-east-1_xxxxxxxx",
    "ExplicitAuthFlows": ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
    "AllowedOAuthFlowsUserPoolClient": true,
    "AllowedOAuthFlows": ["code"],
    "AllowedOAuthScopes": ["openid", "email", "profile"],
    "CallbackURLs": ["https://myapp.com/callback"],
    "LogoutURLs": ["https://myapp.com/logout"],
    "SupportedIdentityProviders": ["COGNITO"],
    "PreventUserExistenceErrors": "ENABLED",
    "EnableTokenRevocation": true
  }
}
```

Save the returned YAML as `cognito-userpool-client.yaml`.

---

## 6. Generate a Domain (optional)

Required for Cognito's hosted UI and OAuth redirect flows:

```json
{
  "name": "auth.configure-domain",
  "arguments": {
    "Domain": "myapp-auth",
    "UserPoolId": "us-east-1_xxxxxxxx",
    "ManagedLoginVersion": 1
  }
}
```

For a custom domain (e.g. `auth.myapp.com`):

```json
{
  "name": "auth.configure-domain",
  "arguments": {
    "Domain": "auth.myapp.com",
    "UserPoolId": "us-east-1_xxxxxxxx",
    "CertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/abc-..."
  }
}
```

Save the returned YAML as `cognito-userpool-domain.yaml`.

---

## 7. Deploy the templates

```bash
# Deploy in order — pool must exist before client and domain
aws cloudformation deploy \
  --template-file cognito-userpool.yaml \
  --stack-name my-app-pool \
  --region us-east-1

aws cloudformation deploy \
  --template-file cognito-userpool-client.yaml \
  --stack-name my-app-client \
  --region us-east-1

aws cloudformation deploy \
  --template-file cognito-userpool-domain.yaml \
  --stack-name my-app-domain \
  --region us-east-1
```

---

## Tips

- You can call `auth.configure-client` multiple times to create multiple clients for the same pool (web app, mobile app, backend service, etc.)
- All fields are optional except the required ones noted in the tool descriptions — only the fields you provide are included in the output YAML.
- Use `auth.help` with `topic: "workflow"` for the full recommended build order with example payloads.
