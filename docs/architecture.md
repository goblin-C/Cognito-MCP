# Architecture

## How it works

```
Developer / AI Agent
        │
        │  auth.help / auth.describe-* / auth.configure-*
        ▼
   Cognito MCP Server
        │
        ├── auth.configure-pool    → cognito-userpool.yaml
        ├── auth.configure-client  → cognito-userpool-client.yaml
        └── auth.configure-domain  → cognito-userpool-domain.yaml
```

The server exposes 7 tools over the MCP protocol. Each configure tool returns a complete AWS CloudFormation YAML template ready for deployment. Each describe tool returns field-level documentation to guide configuration.

## Tool groups

| Group   | Tools                                    | Output                              |
|---------|------------------------------------------|-------------------------------------|
| Help    | `auth.help`                              | Usage documentation                 |
| Pool    | `auth.describe-pool`, `auth.configure-pool` | `cognito-userpool.yaml`          |
| Client  | `auth.describe-client`, `auth.configure-client` | `cognito-userpool-client.yaml` |
| Domain  | `auth.describe-domain`, `auth.configure-domain` | `cognito-userpool-domain.yaml` |
