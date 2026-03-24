# Cognito-MCP

An MCP server that generates AWS Cognito CloudFormation templates through natural language. Connect it to any MCP-compatible AI agent and ask it to configure your Cognito User Pool, Client, and Domain — it outputs deployment-ready YAML.

## Prerequisites

- Node.js 18+
- An AWS account (for deploying the generated templates)

## Setup

```bash
git clone <repo>
cd cognito-mcp
npm install
```

Create a `.env` file:

```env
PORT=8000
MCP_API_KEY=your-secret-key   # optional — omit to disable auth
```

Start the server:

```bash
node server.js
```

## Connect via MCP

Add this to your `mcp.json` (e.g. in Claude Desktop or a Claude Code project):

```json
{
  "mcpServers": {
    "cognito": {
      "url": "https://your-cognito-mcp.vercel.app/mcp"
    }
  }
}
```

If `MCP_API_KEY` is set, include the key as a header:

```json
{
  "mcpServers": {
    "cognito": {
      "url": "https://your-cognito-mcp.vercel.app/mcp",
      "headers": {
        "x-api-key": "your-secret-key-here"
      }
    }
  }
}
```

Replace `https://your-cognito-mcp.vercel.app` with your actual deployed server URL.

## Tools

| Tool                  | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `auth.help`           | Get usage docs and guidance (start here)             |
| `auth.describe-pool`  | Look up documentation for a User Pool field          |
| `auth.configure-pool` | Generate User Pool CloudFormation YAML               |
| `auth.describe-client`| Look up documentation for a User Pool Client field   |
| `auth.configure-client`| Generate User Pool Client CloudFormation YAML       |
| `auth.describe-domain`| Look up documentation for a User Pool Domain field   |
| `auth.configure-domain`| Generate User Pool Domain CloudFormation YAML       |

## Quick Start

Once connected, ask your AI agent:

> "Set up a Cognito User Pool with email sign-in, optional MFA, and an OAuth client for my web app."

The agent will call the tools in order and produce three files:

1. `cognito-userpool.yaml` — the User Pool
2. `cognito-userpool-client.yaml` — the App Client
3. `cognito-userpool-domain.yaml` — the Hosted UI domain

Deploy them with:

```bash
aws cloudformation deploy --template-file cognito-userpool.yaml --stack-name my-app-pool --region us-east-1
aws cloudformation deploy --template-file cognito-userpool-client.yaml --stack-name my-app-client --region us-east-1
aws cloudformation deploy --template-file cognito-userpool-domain.yaml --stack-name my-app-domain --region us-east-1
```

## Docs

- [Overview](docs/overview.md) — design and output format
- [Usage](docs/usage.md) — detailed usage examples
- [Architecture](docs/architecture.md) — how the server is structured
