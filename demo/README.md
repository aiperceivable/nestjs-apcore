# nestjs-apcore Demo

A NestJS application showcasing how **nestjs-apcore** turns standard NestJS services into AI-perceivable MCP tools — without changing your business logic.

## Quick Start

### Local

```bash
# From the nestjs-apcore repo root
npm install
npm run build

cd demo
npm install
npx tsx src/main.ts
```

- MCP Explorer: http://localhost:8000/explorer/
- REST API: http://localhost:3000/todos

### Docker

```bash
cd demo
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

## 6 MCP Tools

| Tool | Module | Description |
|------|--------|-------------|
| `todo.list` | TodoModule | List todos, filter by completion status |
| `todo.add` | TodoModule | Add a new todo |
| `todo.complete` | TodoModule | Mark a todo as done |
| `todo.remove` | TodoModule | Delete a todo |
| `weather.current` | WeatherModule | Current weather (mock data) |
| `weather.forecast` | WeatherModule | 3-day forecast (mock data) |

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
demo/
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

## Key Takeaway

Adding `@ApTool` to your existing NestJS services is all it takes. No new abstractions, no framework lock-in — your services stay testable, injectable, and work with controllers, guards, and interceptors as usual.
