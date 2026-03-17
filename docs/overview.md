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

## Authentication

Access to the server can be restricted with an API key. When the server is protected, MCP clients must include an `x-api-key` header in every request. See [Usage](usage.md) for how to configure this in your MCP client.
