# nestjs-apcore Demo

A NestJS application showcasing how **nestjs-apcore** turns standard NestJS services into AI-perceivable MCP tools — without changing your business logic.

## Quick Start

### Local

```bash
# From the nestjs-apcore repo root
npm install
npm run build

cd examples/demo
npm install
npx tsx src/main.ts
```

- MCP Explorer: http://localhost:8000/explorer/
- REST API: http://localhost:3000/todos

### Docker

```bash
cd examples/demo
docker compose up --build
```

- MCP Explorer: http://localhost:8000/explorer/
- REST API: http://localhost:3000/todos

## What This Demo Shows

### Same Service, Two Protocols

`TodoService` is a regular NestJS `@Injectable()` with CRUD operations. By adding `@ApTool` decorators, each method becomes an MCP tool — while the same service instance also powers a REST API via `TodoController`.

```
                    ┌─────────────────────┐
  REST client  ───▶ │   TodoController    │
                    │   GET/POST/DELETE    │
                    └────────┬────────────┘
                             │  same instance
  AI/MCP client ───▶ ┌──────▼──────────────┐
                     │    TodoService       │
                     │  @ApTool decorated   │
                     └─────────────────────┘
```

### NestJS DI Works Naturally

`WeatherService` injects `GeoService` via standard NestJS constructor injection. The `@ApTool` scanner discovers these services after DI is fully resolved.

```typescript
@Injectable()
export class WeatherService {
  constructor(@Inject(GeoService) private readonly geo: GeoService) {}

  @ApTool({ description: 'Get current weather for a city' })
  current(inputs) {
    const location = this.geo.lookup(inputs.city);  // DI works as normal
    // ...
  }
}
```

## 9 MCP Tools

| Tool | Module | ACL (anonymous) | Description |
|------|--------|-----------------|-------------|
| `todo.list` | TodoModule | allowed | List todos, filter by completion status |
| `todo.add` | TodoModule | denied | Add a new todo |
| `todo.get` | TodoModule | allowed | Get a single todo by ID |
| `todo.update` | TodoModule | denied | Mark a todo as done or undone |
| `todo.delete` | TodoModule | denied | Delete a todo by ID |
| `todo.complete` | TodoModule | denied | Mark a todo as done (legacy) |
| `todo.remove` | TodoModule | denied | Delete a todo (legacy) |
| `weather.current` | WeatherModule | allowed | Current weather (mock data) |
| `weather.forecast` | WeatherModule | allowed | 3-day forecast (mock data) |

## REST Endpoints (TodoController)

```bash
# List all todos
curl http://localhost:3000/todos

# Add a todo
curl -X POST http://localhost:3000/todos \
  -H 'Content-Type: application/json' \
  -d '{"title": "Buy milk"}'

# Delete a todo
curl -X DELETE http://localhost:3000/todos/1
```

## Project Structure

```
examples/demo/
├── src/
│   ├── main.ts                 # NestJS bootstrap (REST :3000 + MCP :8000)
│   ├── app.module.ts           # Root module wiring
│   ├── todo/
│   │   ├── todo.service.ts     # @ApTool decorated — CRUD with state
│   │   ├── todo.controller.ts  # REST endpoints for the same service
│   │   └── todo.module.ts
│   └── weather/
│       ├── weather.service.ts  # @ApTool + DI (injects GeoService)
│       ├── geo.service.ts      # Plain @Injectable (no apcore awareness)
│       └── weather.module.ts
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## JWT Authentication

JWT auth is optional — controlled by the `JWT_SECRET` environment variable. When set, all `/mcp` requests require a valid Bearer token. The Explorer UI (`/explorer/`) and `/health` endpoint are always exempt.

### Enable JWT

```bash
JWT_SECRET=my-secret npx tsx src/main.ts
```

### Test Token

Pre-generated token (secret: `my-secret`, algorithm: HS256):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJ0eXBlIjoidXNlciIsInJvbGVzIjpbImFkbWluIl19.yOFQMlZnMZwXg6KoJX61sCm2VbCzmqtT8dFRNsOhaZM
```

Payload:

```json
{"sub": "demo-user", "type": "user", "roles": ["admin"]}
```

### Verify with cURL

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJ0eXBlIjoidXNlciIsInJvbGVzIjpbImFkbWluIl19.yOFQMlZnMZwXg6KoJX61sCm2VbCzmqtT8dFRNsOhaZM"

# Health endpoint is always exempt
curl http://localhost:8000/health

# Without token -> 401
curl http://localhost:8000/mcp

# With token -> 200
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/mcp
```

### Identity in Tool Methods

`TodoService.list()` calls `getCurrentIdentity()` and includes the caller in its response:

```json
{ "todos": [...], "count": 2, "caller": "demo-user" }
```

Without a token (or when JWT is disabled), `caller` is `"anonymous"`.

### Explorer UI with JWT

The Explorer at http://localhost:8000/explorer/ always loads without a token. To execute tools with identity, paste the Bearer token into the **Authorization** input at the top of the page — it will be included in all tool execution requests.

## ACL (Access Control)

ACL rules are loaded from `acl.yaml` in the demo root when the file is present. Delete it to run without ACL enforcement.

### How it works

`NestContextFactory` resolves the caller identity from the request:
- Requests without a Bearer token get `identity.id = "anonymous"`
- Requests with a valid Bearer JWT get `identity.id = "bearer"`

The ACL rules in `acl.yaml` match these identities:

```yaml
default_effect: deny

rules:
  - callers: ["anonymous"]
    targets: ["todo.list", "todo.get", "weather.*"]
    effect: allow
    description: "Anonymous callers may only read"

  - callers: ["bearer"]
    targets: ["todo.*", "weather.*"]
    effect: allow
    description: "Authenticated callers have full todo access"
```

Every ACL decision is logged to stdout with `[ACL]` prefix, including the caller, target, decision, and matched rule.

### Try it

```bash
# Start with both JWT and ACL enabled
JWT_SECRET=my-secret npx tsx src/main.ts

# Anonymous: todo.list is allowed, todo.add is denied
curl -X POST http://localhost:8000/mcp \
  -H 'Content-Type: application/json' \
  -d '{"method": "tools/call", "params": {"name": "todo.add", "arguments": {"title": "Test"}}}'

# Bearer: all todo.* tools are allowed
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJ0eXBlIjoidXNlciIsInJvbGVzIjpbImFkbWluIl19.yOFQMlZnMZwXg6KoJX61sCm2VbCzmqtT8dFRNsOhaZM"
curl -X POST http://localhost:8000/mcp \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"method": "tools/call", "params": {"name": "todo.add", "arguments": {"title": "Test"}}}'
```

## System Modules (Feature Toggles)

When `apcore.yaml` is present in the demo root, system tools are registered automatically during `onApplicationBootstrap`:

| System tool | Description |
|-------------|-------------|
| `sys.health` | Health check |
| `sys.usage` | Runtime metrics |
| `sys.manifest` | List all registered tools |
| `sys.toggle_feature` | Enable/disable tools at runtime |
| `sys.reload` | Reload config without restart |

Remove `apcore.yaml` to disable all system tools.

## Project Structure

```
examples/demo/
├── acl.yaml                    # ACL rules (delete to disable ACL)
├── apcore.yaml                 # apcore config (sys_modules, log level)
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── todo/
│   └── weather/
```

## Key Takeaway

Adding `@ApTool` to your existing NestJS services is all it takes. No new abstractions, no framework lock-in — your services stay testable, injectable, and work with controllers, guards, and interceptors as usual.
