# MCP Server Integration

## Overview

`ApcoreModule` integrates the `apcore-js` and `apcore-mcp` libraries into the NestJS lifecycle. It provides the core `Registry` and `Executor` as global singletons, auto-discovers `@ApTool` decorated methods via `ApToolScannerService`, and optionally starts the MCP server when `mcp` config is provided.

The MCP server runs as a **standalone HTTP server** on its own port (separate from the NestJS REST server), managed by `apcore-mcp`'s `serve()` function.

## Dependencies

- `apcore-js` — `Registry`, `Executor`, `FunctionModule`
- `apcore-mcp` — `serve()`, `toOpenaiTools()`, `Authenticator`, `JWTAuthenticator`
- `@modelcontextprotocol/sdk` — MCP protocol (transitive via `apcore-mcp`)

## ApcoreModule

Root module. Creates and provides `ApcoreRegistryService`, `ApcoreExecutorService`, and `ApToolScannerService` as global NestJS singletons. Decorated `@Global()`.

When `mcp` config is provided, `ApcoreMcpModule` is automatically imported — no need to configure it separately.

**Config (`ApcoreModuleOptions`):**

| Field | Type | Default | Description |
|---|---|---|---|
| `extensionsDir` | `string \| null` | `null` | Directory for file-system module discovery via `registry.discover()`. |
| `acl` | `unknown \| null` | `null` | ACL configuration passed to apcore-js Registry. |
| `middleware` | `unknown[]` | `[]` | apcore middleware pipeline configuration. |
| `bindings` | `string \| null` | `null` | Path for YAML binding file. |
| `mcp` | `ApcoreMcpModuleOptions` | — | MCP server config. If provided, `ApcoreMcpModule` is auto-imported. |
| `schema.adapters` | `string[]` | all | Limit which schema adapters are active. |
| `schema.strictOutput` | `boolean` | `false` | If true, require explicit `outputSchema` on all tools. |

**Registration:**

```typescript
// Sync — with MCP
ApcoreModule.forRoot({
  mcp: { transport: 'streamable-http', port: 8000 },
})

// Sync — without MCP
ApcoreModule.forRoot()

// Async — MCP config is a static field (not returned from factory)
ApcoreModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    extensionsDir: config.get('EXTENSIONS_DIR'),
  }),
  inject: [ConfigService],
  mcp: { transport: 'streamable-http', port: 8000 },
})
```

> **Note on `forRootAsync`:** The `mcp` field is provided statically on the async options object, not returned from `useFactory`. This is because NestJS dynamic-module imports must be resolved at module-definition time, before the async factory executes.

## ApcoreMcpModule (Standalone)

For advanced use cases where you need separate control over the MCP server lifecycle, you can import `ApcoreMcpModule` directly instead of using the `mcp` option on `ApcoreModule`:

```typescript
@Module({
  imports: [
    ApcoreModule.forRoot(),
    ApcoreMcpModule.forRoot({ transport: 'streamable-http', port: 8000 }),
  ],
})
export class AppModule {}
```

**Config (`ApcoreMcpModuleOptions`):**

| Field | Type | Default | Description |
|---|---|---|---|
| `transport` | `'stdio' \| 'streamable-http' \| 'sse'` | — | Transport protocol. Server only starts if this is set. |
| `host` | `string` | — | Bind host for HTTP transports. |
| `port` | `number` | — | Bind port for HTTP transports. |
| `name` | `string` | — | MCP server name. |
| `version` | `string` | — | MCP server version. |
| `tags` | `string[] \| null` | `null` | Only expose tools with these tags. |
| `prefix` | `string \| null` | `null` | Only expose tools with this ID prefix. |
| `explorer` | `boolean` | — | Enable Tool Explorer web UI. |
| `explorerPrefix` | `string` | — | URL prefix for the Explorer. |
| `allowExecute` | `boolean` | — | Allow tool execution from Explorer. |
| `dynamic` | `boolean` | — | Enable dynamic tool list updates. |
| `validateInputs` | `boolean` | — | Validate inputs before execution. |
| `logLevel` | `'DEBUG' \| 'INFO' \| 'WARNING' \| 'ERROR' \| 'CRITICAL'` | — | Log verbosity. |
| `onStartup` | `() => void \| Promise<void>` | — | Callback after server starts. |
| `onShutdown` | `() => void \| Promise<void>` | — | Callback before server stops. |
| `metricsCollector` | `{ exportPrometheus(): string }` | — | Enables `/metrics` Prometheus endpoint. |
| `authenticator` | `Authenticator` | — | JWT or custom auth strategy. |
| `exemptPaths` | `string[]` | `['/health', '/metrics']` | Paths that bypass authentication. |

**Registration:**

```typescript
ApcoreMcpModule.forRoot(options?)
ApcoreMcpModule.forRootAsync({ imports, useFactory, inject })
```

## Public API

### ApcoreRegistryService

Wraps `apcore-js` `Registry` as a NestJS injectable. All core methods delegate to the underlying registry.

```typescript
register(moduleId: string, module: unknown): void
unregister(moduleId: string): boolean
get(moduleId: string): unknown | null
has(moduleId: string): boolean
list(options?: { tags?: string[]; prefix?: string }): string[]
getDefinition(moduleId: string): ModuleDescriptor | null
on(event: string, callback: (moduleId: string, module: unknown) => void): void
discover(): Promise<number>          // requires extensionsDir

// NestJS convenience methods (see di-bridge.md)
registerMethod(options: RegisterMethodOptions): string
registerService(options: RegisterServiceOptions): string[]

get count(): number                  // property
get raw(): Registry                  // access underlying apcore-js Registry
```

### ApcoreExecutorService

Wraps `apcore-js` `Executor` as a NestJS injectable. Normalises `null`/`undefined` inputs to `{}`.

```typescript
call(moduleId: string, inputs?: Record<string, unknown> | null, context?: Context | null): Promise<Record<string, unknown>>
stream(moduleId: string, inputs?: Record<string, unknown> | null, context?: Context | null): AsyncGenerator<Record<string, unknown>>
validate(moduleId: string, inputs: Record<string, unknown>): ValidationResult
get raw(): Executor
```

### ApcoreMcpService

Injectable service for MCP server lifecycle and tool conversion.

```typescript
get isRunning(): boolean             // whether the server is currently running
get toolCount(): number              // number of tools (filtered by tags/prefix)
start(): Promise<void>
stop(): Promise<void>
restart(): Promise<void>
toOpenaiTools(options?: { embedAnnotations?: boolean; strict?: boolean; tags?: string[]; prefix?: string }): OpenAIToolDef[]
```

## Behavior

### Startup Sequence

1. `ApcoreModule` initialises:
   - Creates `Registry` and `Executor` from `apcore-js`
   - If `extensionsDir` is set, runs `registry.discover()`
   - Provides `ApcoreRegistryService`, `ApcoreExecutorService`, and `ApToolScannerService` globally

2. `ApToolScannerService.onModuleInit()` fires:
   - Scans all providers via `ModulesContainer`
   - Registers all `@ApTool` decorated methods as `FunctionModule` instances

3. `ApcoreMcpService.onApplicationBootstrap()` fires (after all `onModuleInit` hooks):
   - Calls `serve(executor.raw, options)` from `apcore-mcp`
   - `serve()` starts its own standalone HTTP server on the configured port
   - This server is **separate** from NestJS's HTTP server

4. NestJS REST server starts normally on its own port via `app.listen()`

### Dual-Server Architecture

```
NestJS app (port 3000)          MCP server (port 8000)
───────────────────────         ──────────────────────
@Controller routes               serve() from apcore-mcp
Middleware / Guards              /mcp  (Streamable HTTP)
REST clients                     /health, /metrics
                                 /explorer/ (UI)
                                 JWT auth
                                 AI agents / MCP clients

Both share the same Registry/Executor instances
```

### Authentication

When `authenticator` is set:
- All MCP requests require a valid Bearer token
- `JWTAuthenticator` and `getCurrentIdentity()` are re-exported from `nestjs-apcore`
- The Explorer UI (`/explorer/`) and `/health` are exempt by default
- Additional exempt paths configurable via `exemptPaths`

```typescript
ApcoreModule.forRoot({
  mcp: {
    transport: 'streamable-http',
    port: 8000,
    authenticator: process.env.JWT_SECRET
      ? new JWTAuthenticator({ secret: process.env.JWT_SECRET })
      : undefined,
  },
})
```

### Shutdown Sequence

1. NestJS `onModuleDestroy` fires
2. `ApcoreMcpService.stop()` sets `_isRunning = false`
3. `apcore-mcp`'s server closes gracefully

## Usage Examples

### Minimal Setup

```typescript
@Module({
  imports: [
    ApcoreModule.forRoot({
      mcp: {
        transport: 'streamable-http',
        port: 8000,
      },
    }),
  ],
})
export class AppModule {}
```

### Async Configuration (with ConfigService)

```typescript
@Module({
  imports: [
    ApcoreModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        extensionsDir: config.get('EXTENSIONS_DIR'),
      }),
      inject: [ConfigService],
      // MCP config is static (evaluated at module-definition time, not from factory)
      mcp: {
        transport: 'streamable-http',
        port: 8000,
        name: 'my-app',
      },
    }),
  ],
})
export class AppModule {}
```

### Programmatic Registration

```typescript
@Injectable()
export class ToolSetup implements OnModuleInit {
  constructor(private registry: ApcoreRegistryService) {}

  onModuleInit() {
    this.registry.registerMethod({
      instance: this,
      method: 'greet',
      description: 'Say hello',
      inputSchema: Type.Object({ name: Type.String() }),
    });
  }

  greet(inputs: Record<string, unknown>) {
    return { message: `Hello, ${inputs.name}!` };
  }
}
```

### Programmatic MCP Control

```typescript
@Injectable()
export class AdminService {
  constructor(private mcp: ApcoreMcpService) {}

  getStatus() {
    return { running: this.mcp.isRunning, toolCount: this.mcp.toolCount };
  }

  getOpenAITools() {
    return this.mcp.toOpenaiTools();
  }
}
```

## Error Handling

| Error | Behavior |
|---|---|
| `ApcoreModule` not imported | NestJS DI error — `ApcoreRegistryService` not found |
| Transport start fails (port in use) | `serve()` throws, prevents app startup |
| Tool execution error | Handled by `apcore-mcp`'s `ErrorMapper`, returned as MCP error response |
| Unauthenticated request (when auth enabled) | `401` with `WWW-Authenticate: Bearer` |

## Out of Scope

- Multiple MCP servers per app
- MCP endpoints on the same port as NestJS (the MCP server is always standalone)
- WebSocket transport
