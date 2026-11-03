# nestjs-apcore

NestJS adapter for the [apcore](https://github.com/aiperceivable/apcore-js) AI-Perceivable module ecosystem. Turn your existing NestJS services into AI-callable [MCP](https://modelcontextprotocol.io/) tools and OpenAI-compatible function definitions — with zero changes to your business logic.

## Features

- **Decorator-driven** — Mark methods with `@ApTool` and classes with `@ApModule` to expose them as AI tools
- **Auto-discovery** — tools are scanned and registered at startup automatically
- **One-stop setup** — `ApcoreModule.forRoot()` handles Registry, Executor, Scanner, and optional MCP server in a single call
- **Multi-schema support** — TypeBox, Zod, class-validator DTOs, and plain JSON Schema, auto-detected via a priority chain
- **MCP server built-in** — Serve tools over stdio, Streamable HTTP, or SSE transports with optional Tool Explorer UI
- **OpenAI-compatible** — Convert registered tools to OpenAI function-calling format with `toOpenaiTools()`
- **YAML bindings** — Register tools declaratively from YAML files without touching source code
- **Dual access** — Services remain injectable into REST controllers while simultaneously available as MCP tools

## Installation

```bash
npm install nestjs-apcore apcore-js apcore-mcp @modelcontextprotocol/sdk js-yaml
```

**Peer dependencies** (required):

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

**Optional** (for schema adapters):

```bash
npm install zod                                # ZodAdapter
npm install class-validator class-transformer  # DtoAdapter
npm install @sinclair/typebox                  # TypeBoxAdapter (recommended)
```

**Requirements:** Node.js >= 20, NestJS >= 10 (tested with NestJS 11)

## Quick Start

### 1. Wire up the module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ApcoreModule } from 'nestjs-apcore';

@Module({
  imports: [
    ApcoreModule.forRoot({
      mcp: {
        transport: 'streamable-http',
        port: 8000,
        name: 'my-app',
        explorer: true,
        allowExecute: true,
      },
    }),
    TodoModule,
  ],
})
export class AppModule {}
```

### 2. Decorate your services

```typescript
// todo.service.ts
import { Injectable } from '@nestjs/common';
import { Type } from '@sinclair/typebox';
import { ApModule, ApTool } from 'nestjs-apcore';

@ApModule({ namespace: 'todo', description: 'Todo list management' })
@Injectable()
export class TodoService {
  private todos = [];

  @ApTool({
    description: 'List all todos, optionally filtered by status',
    inputSchema: Type.Object({
      done: Type.Optional(Type.Boolean()),
    }),
    annotations: { readonly: true, idempotent: true },
    tags: ['todo', 'query'],
  })
  list(inputs: Record<string, unknown>) {
    const { done } = inputs;
    const filtered = done !== undefined
      ? this.todos.filter((t) => t.done === done)
      : this.todos;
    return { todos: filtered, count: filtered.length };
  }

  @ApTool({
    description: 'Create a new todo item',
    inputSchema: Type.Object({
      title: Type.String(),
    }),
    annotations: { readonly: false },
    tags: ['todo', 'mutate'],
  })
  create(inputs: Record<string, unknown>) {
    const todo = { id: this.todos.length + 1, title: inputs.title, done: false };
    this.todos.push(todo);
    return todo;
  }
}
```

### 3. Boot the app

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  // MCP server starts automatically on port 8000
}
bootstrap();
```

Your service is now available as:
- **REST API** at `http://localhost:3000` (via NestJS controllers)
- **MCP server** at `http://localhost:8000` (for AI agents)
- **Tool Explorer** at `http://localhost:8000/explorer/` (interactive web UI)

## API Reference

### ApcoreModule

The single entry point. Provides the core `Registry`, `Executor`, and `ApToolScannerService` as global NestJS singletons. Optionally integrates the MCP server.

```typescript
// Sync — with MCP server
ApcoreModule.forRoot({
  extensionsDir?: string | null,
  acl?: unknown,
  middleware?: unknown[],
  mcp?: ApcoreMcpModuleOptions,  // if provided, MCP server starts automatically
})

// Sync — without MCP (Registry + Executor only)
ApcoreModule.forRoot()

// Async (e.g. inject ConfigService)
ApcoreModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    extensionsDir: config.get('EXTENSIONS_DIR'),
  }),
  inject: [ConfigService],
  mcp: { transport: 'streamable-http', port: 8000 },  // static, evaluated at definition time
})
```

#### MCP Options

| Field | Type | Description |
|---|---|---|
| `transport` | `'stdio' \| 'streamable-http' \| 'sse'` | Transport protocol |
| `host` | `string` | Bind host |
| `port` | `number` | Bind port |
| `name` | `string` | Server name |
| `version` | `string` | Server version |
| `explorer` | `boolean` | Enable Tool Explorer web UI |
| `allowExecute` | `boolean` | Allow tool execution from Explorer |
| `authenticator` | `Authenticator` | JWT or custom auth strategy |
| `requireAuth` | `boolean` | Reject unauthenticated requests (default: `true`) |
| `exemptPaths` | `string[]` | Paths exempt from auth (default: `["/health", "/metrics"]`) |
| `tags` | `string[]` | Only expose tools with these tags |
| `prefix` | `string` | Only expose tools with this ID prefix |
| `logLevel` | `string` | `'DEBUG' \| 'INFO' \| 'WARNING' \| 'ERROR' \| 'CRITICAL'` |
| `metricsCollector` | `MetricsExporter \| true` | Enables `/metrics` endpoint; `true` auto-instantiates |
| `observability` | `ObservabilityFlag` | Full stack: metrics + usage middleware + `/usage` endpoint |
| `outputFormat` | `'json' \| 'csv' \| 'jsonl'` | Built-in result serialisation format |
| `redactOutput` | `boolean` | Redact sensitive fields from tool output (default: `true`) |
| `trace` | `boolean` | Attach pipeline trace to tool responses (default: `false`) |
| `strategy` | `string` | Execution strategy name (e.g. `"standard"`, `"minimal"`) |
| `approvalHandler` | `unknown` | Custom approval handler for the executor |
| `approvalStore` | `unknown` | Pluggable approval store; auto-wires `StorageBackedApprovalHandler` |
| `approvalNotify` | `function` | Callback on new approval request (Slack/email fan-out) |
| `mcpMiddleware` | `unknown[]` | Extra apcore middleware to install on the executor |
| `mcpAcl` | `unknown` | apcore ACL instance for this MCP server |
| `onStartup` | `() => void` | Callback after server starts |
| `onShutdown` | `() => void` | Callback before server stops |

#### Standalone MCP Module

If you prefer to configure the MCP server separately (e.g. different lifecycle), you can import `ApcoreMcpModule` directly:

```typescript
@Module({
  imports: [
    ApcoreModule.forRoot(),
    ApcoreMcpModule.forRoot({ transport: 'streamable-http', port: 8000 }),
  ],
})
export class AppModule {}
```

### Decorators

| Decorator | Target | Description |
|---|---|---|
| `@ApModule(opts)` | Class | Sets namespace for all `@ApTool` methods (e.g. `todo`) |
| `@ApTool(opts)` | Method | Registers the method as an AI-callable tool |
| `@ApContext()` | Parameter | Injects the apcore `Context` object (callerId, trace info) |

#### `@ApTool` options

```typescript
@ApTool({
  description: string,        // required
  id?: string,                 // auto-generated in snake_case if omitted (e.g. 'email.send_batch')
  inputSchema?: any,           // TypeBox, Zod, DTO class, or JSON Schema
  outputSchema?: any,
  annotations?: {
    readonly?: boolean,
    destructive?: boolean,
    idempotent?: boolean,
    requiresApproval?: boolean,
    openWorld?: boolean,
    streaming?: boolean,
  },
  tags?: string[],
  documentation?: string,
  examples?: ApToolExample[],
})
```

### Services

| Service | Description |
|---|---|
| `ApcoreRegistryService` | Register/unregister tools, query the registry — `register()`, `registerMethod()`, `registerService()` are async since 0.6.0 |
| `ApcoreExecutorService` | Execute tools: `call()`, `stream()`, `validate()` (async since 0.5.0) |
| `ApcoreMcpService` | MCP server lifecycle: `start()`, `stop()`, `restart()`, `toOpenaiTools()` |
| `ApcoreCliService` | CLI lifecycle: `run()` — integrates `apcore-cli` with NestJS |
| `ApcoreA2aService` | A2A server lifecycle: `start()`, `stop()`, `asyncServe()` |
| `ApToolScannerService` | Auto-discovers and registers `@ApTool` decorated methods at startup |

> **Breaking change in 0.5.0:** `ApcoreExecutorService.validate()` now returns `Promise<PreflightResult>` — add `await` at call sites.

### Schema Adapters

Schemas are auto-detected and converted via a priority chain:

| Adapter | Priority | Input |
|---|---|---|
| TypeBoxAdapter | 100 | `@sinclair/typebox` schemas |
| ZodAdapter | 50 | Zod schemas |
| JsonSchemaAdapter | 30 | Plain JSON Schema objects |
| DtoAdapter | 20 | `class-validator` decorated DTO classes |

### YAML Bindings

Register tools without decorators:

```yaml
bindings:
  - module_id: email.send
    target: EmailService.send
    description: Send an email
    input_schema:
      type: object
      properties:
        to: { type: string }
        subject: { type: string }
        body: { type: string }
    tags: [email, mutate]
    annotations:
      readonly: false
```

### JWT Authentication

Enable JWT auth by passing a `JWTAuthenticator` in the `mcp` config. The Explorer UI and `/health` endpoint are always exempt.

```typescript
import { ApcoreModule, JWTAuthenticator, getCurrentIdentity } from 'nestjs-apcore';

// In app.module.ts
ApcoreModule.forRoot({
  mcp: {
    transport: 'streamable-http',
    port: 8000,
    authenticator: process.env.JWT_SECRET
      ? new JWTAuthenticator({ secret: process.env.JWT_SECRET })
      : undefined,
  },
})

// Inside any @ApTool method
list(inputs: Record<string, unknown>) {
  const caller = getCurrentIdentity()?.id ?? 'anonymous';
  return { items: [...], caller };
}
```

### A2A Module

Expose your tools as an [Agent-to-Agent](https://a2aprotocol.ai/) server:

```typescript
ApcoreModule.forRoot({
  a2a: {
    name: 'my-agent',
    port: 9000,
    url: 'https://my-agent.example.com',
    explorer: true,
  },
})
```

Embed into the NestJS HTTP server instead of running standalone:

```typescript
const a2aApp = await a2aService.asyncServe();
nestApp.use('/a2a', a2aApp);
```

The `A2AClient` is also re-exported for calling remote A2A servers:

```typescript
import { A2AClient } from 'nestjs-apcore';
const client = new A2AClient({ baseUrl: 'https://other-agent.example.com' });
const result = await client.runTask({ skill: 'weather.forecast', input: { city: 'Tokyo' } });
```

### CLI Module

Integrate `apcore-cli` with NestJS for a standalone command-line interface:

```typescript
ApcoreModule.forRoot({
  cli: {
    progName: 'my-cli',
    docsUrl: 'https://docs.example.com',
  },
})
```

### Re-exported Utilities

All utilities are importable directly from `nestjs-apcore`.

**`apcore-mcp`:**
- `reportProgress`, `elicit`, `createBridgeContext`, `toOpenaiTools`
- `JWTAuthenticator`, `getCurrentIdentity`, `identityStorage`, `buildExplorerAuthHook`
- `MCPServerFactory` (`MCPServer`), `ExecutionRouter`, `AsyncTaskBridge`, `ApprovalBridge`
- `ElicitationApprovalHandler`, `StorageBackedApprovalHandler`, `InMemoryApprovalStore`
- `OpenAIConverter`, `AnnotationMapper`, `McpSchemaConverter`, `McpErrorMapper`, `ModuleIDNormalizer`
- `installObservability`, `parseTraceparent`, `buildTraceparent`
- Constants: `MCP_NAMESPACE`, `MCP_ENV_PREFIX`, `MCP_DEFAULTS`, `MCP_PROGRESS_KEY`, `MCP_ELICIT_KEY`, `REGISTRY_EVENTS`, `APCORE_EVENTS`, `MODULE_ID_PATTERN`, `ErrorCodes`

**`apcore-a2a`:**
- `serveA2A`, `asyncServeA2A`, `A2AClient`, `AgentCardBuilder`, `SkillMapper`, `PartConverter`
- `A2AServerFactory`, `ApCoreAgentExecutor`
- `A2AJWTAuthenticator`, `createAuthMiddleware`, `authIdentityStore`, `getAuthIdentity`
- `A2ASchemaConverter`, `A2AErrorMapper`

**`apcore-cli`:**
- `createCli`, `main`, `buildModuleCommand`, `applyToolkitIntegration`
- `LazyModuleGroup`, `GroupedModuleGroup`, `LazyGroup`, `ApcliGroup`, `ExposureFilter`
- `ConfigResolver`, `DEFAULTS`, `registerConfigNamespace`
- Discovery: `registerListCommand`, `registerDescribeCommand`, `registerExecCommand`, `registerValidateCommand`
- System: `registerHealthCommand`, `registerUsageCommand`, `registerEnableCommand`, `registerDisableCommand`, `registerReloadCommand`, `registerConfigCommand`, `registerPipelineCommand`, `registerInitCommand`, `registerCompletionCommand`, `configureManHelp`
- `setLogLevel`, `getLogLevel`, `resolveRefs`, `schemaToCliOptions`
- Security: `AuditLogger`, `setAuditLogger`, `getAuditLogger`, `AuthProvider`, `ConfigEncryptor`, `Sandbox`

**`apcore-toolkit`:**
- `BaseScanner`, `filterModules`, `deduplicateIds`, `inferAnnotationsFromMethod`
- `createScannedModule`, `cloneModule`, `moduleToDict`, `modulesToDicts`, `annotationsToDict`
- Schema: `extractInputSchema`, `extractOutputSchema`, `resolveRef`, `resolveSchema`, `deepResolveRefs`, `enrichSchemaDescriptions`
- Formatting: `toMarkdown`, `formatSchema`, `formatModule`, `formatModules`, `formatCsv`, `formatJsonl`
- Writers: `YAMLWriter`, `TypeScriptWriter`, `RegistryWriter`, `HTTPProxyRegistryWriter`, `getWriter`
- Verifiers: `YAMLVerifier`, `SyntaxVerifier`, `RegistryVerifier`, `MagicBytesVerifier`, `JSONVerifier`, `runVerifierChain`
- HTTP utils: `SCANNER_VERB_MAP`, `resolveHttpVerb`, `hasPathParams`, `generateSuggestedAlias`, `extractPathParamNames`, `substitutePathParams`
- `BindingLoader`, `AIEnhancer`, `DisplayResolver`, `resolveTarget`

## Examples

The [`examples/demo/`](./examples/demo) directory contains a full working app with Todo and Weather services:

```bash
cd examples/demo
npm install
npx tsx src/main.ts
```

## Detailed Documentation

For in-depth documentation on each subsystem, see [`docs/features/`](./docs/features/):

- [Feature Overview](./docs/features/overview.md) — architecture and dependency graph
- [MCP Server Integration](./docs/features/mcp-server-integration.md) — module configuration, services API, dual-server architecture
- [@ApTool Decorator + Scanner](./docs/features/aptool-decorator-scanner.md) — decorators, ID generation, scan process
- [Schema Extraction](./docs/features/schema-extraction.md) — adapter chain, supported types, custom adapters
- [NestJS DI Bridge](./docs/features/di-bridge.md) — `registerMethod()`, `registerService()`, YAML bindings

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript |
| `npm run dev` | Watch mode compilation |
| `npm test` | Run tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint source and tests |

## License

Apache-2.0
