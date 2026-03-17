# Cognito MCP — Overview

## What it does

This MCP server generates AWS CloudFormation templates for three Cognito resource types:

| Resource                       | CloudFormation Type                  | Output file                       |
|-------------------------------|--------------------------------------|-----------------------------------|
| User Pool                     | `AWS::Cognito::UserPool`             | `cognito-userpool.yaml`           |
| User Pool Client (App Client) | `AWS::Cognito::UserPoolClient`       | `cognito-userpool-client.yaml`    |
| User Pool Domain              | `AWS::Cognito::UserPoolDomain`       | `cognito-userpool-domain.yaml`    |

Each output is a standalone CloudFormation template that can be deployed directly or merged into a larger stack.

## Design pattern: describe → configure

Each resource has two tools:

- **describe** — accepts a list of field names and returns detailed documentation (summary, explanation, and example value for each field). Call this when you are unsure what a parameter does or what values it accepts.
- **configure** — accepts configuration values and returns a complete CloudFormation YAML template. Only fields you explicitly provide are included in the output.

This two-step pattern keeps the configure tools flexible while giving users a built-in reference for every parameter.

## Tool discovery

A seventh tool, `auth.help`, serves as in-tool documentation. It accepts an optional `topic` parameter and returns:

- `overview` (default) — a summary table of all 7 tools
- `pool` — parameters and usage for the User Pool tools
- `client` — parameters and usage for the User Pool Client tools
- `domain` — parameters and usage for the User Pool Domain tools
- `workflow` — a step-by-step guide for building a full Cognito stack

## Output format

All configure tools return plain text containing a YAML CloudFormation template. The structure is always:

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  <ResourceLogicalId>:
    Type: AWS::<ResourceType>
    Properties:
      # only the fields you specified
```

Fields are only emitted when explicitly provided — there are no hidden defaults injected into the template.

## Session management

Each HTTP connection to `/mcp` creates an isolated MCP server instance with its own session ID (returned in the `mcp-session-id` response header). Subsequent requests from the same client reuse the session. Sessions are held in memory; restarting the server clears all sessions.

## Authentication

If the `MCP_API_KEY` environment variable is set, all requests to `/mcp` must include a matching `x-api-key` header. Requests without the key or with a wrong key receive a `401` response. Authentication is skipped entirely when `MCP_API_KEY` is not set.
