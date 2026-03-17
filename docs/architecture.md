# Architecture

## Request Flow

```
Developer / AI Agent
        │
        │  MCP tool calls over HTTP
        │  (x-api-key header if auth enabled)
        ▼
┌─────────────────────────────────────────┐
│         Cognito MCP Server              │
│                                         │
│  POST /mcp ──► Auth Middleware          │
│                     │                   │
│                     ▼                   │
│             Session Manager             │
│          (one MCP instance/session)     │
│                     │                   │
│                     ▼                   │
│  ┌──────────────────────────────────┐   │
│  │         MCP Tool Registry        │   │
│  │                                  │   │
│  │  auth.help                       │   │
│  │  auth.describe-pool              │   │
│  │  auth.configure-pool        ─────┼───┼──► cognito-userpool.yaml
│  │  auth.describe-client            │   │
│  │  auth.configure-client      ─────┼───┼──► cognito-userpool-client.yaml
│  │  auth.describe-domain            │   │
│  │  auth.configure-domain      ─────┼───┼──► cognito-userpool-domain.yaml
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Source Layout

```
cognito-mcp/
├── server.js                         # HTTP server, health check, routing
├── src/
│   ├── routes/
│   │   └── mcp.js                    # Session management, tool registration
│   ├── middleware/
│   │   └── auth.js                   # API key validation
│   ├── sessions/
│   │   └── sessionStore.js           # In-memory session map
│   ├── tools/
│   │   ├── help.js                   # auth.help — in-tool documentation
│   │   ├── generateUserPoolConfig.js # auth.describe-pool + auth.configure-pool
│   │   ├── generateUserClientConfig.js # auth.describe-client + auth.configure-client
│   │   └── generateUserPoolDomain.js # auth.describe-domain + auth.configure-domain
│   └── utils/
│       └── helpers.js                # buildYaml() — JS object → YAML string
└── docs/
    ├── overview.md
    ├── usage.md
    └── architecture.md   ← this file
```

## Key Design Decisions

**Describe + Configure pairing**
Each Cognito resource has a describe tool (field-level docs) and a configure tool (YAML generation). This lets an agent look up exactly what a field does before committing to a value — no hallucinated defaults.

**Sparse output**
Configure tools only emit fields that were explicitly provided. There are no hidden defaults injected into the output YAML. What you pass in is what appears in the template.

**Session-scoped MCP servers**
Each HTTP session gets its own `McpServer` instance. This isolates state between concurrent users and follows the MCP streaming transport pattern.

**Pure YAML builder**
`buildYaml()` in `helpers.js` is a dependency-free recursive serializer. It handles nested objects, arrays, and strings requiring quotes — without pulling in the `yaml` package (which is installed but unused).
