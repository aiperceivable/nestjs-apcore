# @ApTool Decorator + Scanner

## Overview

Decorator system that marks NestJS service methods as apcore tools, plus `ApToolScannerService` which discovers all decorated methods at `OnModuleInit`, generates module IDs, extracts schemas, and registers each as a `FunctionModule` in `ApcoreRegistryService`. No manual registration required — add decorators, add `ApToolScannerService` to providers, done.

## Dependencies

- [MCP Server Integration](mcp-server-integration.md) — `ApcoreRegistryService`
- [Schema Extraction](schema-extraction.md) — `SchemaExtractor` for converting schemas
- `apcore-js` — `FunctionModule`
- `reflect-metadata` — decorator metadata storage
- NestJS `ModulesContainer` — provider discovery

## Decorators

### @ApTool(options)

Method decorator. Marks a method as an apcore tool. Can be placed on any method of a NestJS `@Injectable()` provider.

**Options (`ApToolOptions`):**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `description` | `string` | Yes | — | Tool description. |
| `id` | `string \| null` | No | `null` | Explicit module ID. Overrides auto-generation. |
| `inputSchema` | `TSchema \| ZodType \| ClassType \| JsonSchema \| null` | No | `null` | Input schema. `null` = empty `Type.Object({})`. |
| `outputSchema` | `TSchema \| ZodType \| ClassType \| JsonSchema \| null` | No | `null` | Output schema. `null` = empty `Type.Object({})`. |
| `annotations` | `ApToolAnnotations \| null` | No | `null` | apcore module annotations. |
| `tags` | `string[]` | No | `[]` | Tags for filtering and grouping. |
| `documentation` | `string \| null` | No | `null` | Extended documentation string. |
| `examples` | `ApToolExample[]` | No | `[]` | Example inputs/outputs. |

**ApToolAnnotations:**

| Field | Type | Description |
|---|---|---|
| `readonly` | `boolean` | Tool only reads data, no side effects. |
| `destructive` | `boolean` | Tool performs destructive/irreversible operations. |
| `idempotent` | `boolean` | Repeated calls with same input produce same result. |
| `requiresApproval` | `boolean` | Tool should prompt for confirmation before executing. |
| `openWorld` | `boolean` | Tool interacts with external systems. |
| `streaming` | `boolean` | Tool produces streaming output. |

### @ApModule(options)

Class decorator. Sets namespace and shared defaults for all `@ApTool` methods in the class. Optional — without it, the class name is normalised and used as the namespace.

**Options (`ApModuleOptions`):**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `namespace` | `string` | Yes | — | ID prefix for all tools in this class (e.g. `'todo'`). |
| `description` | `string \| null` | No | `null` | Group description (metadata only). |
| `tags` | `string[]` | No | `[]` | Default tags applied to all tools. Can be overridden per-tool. |
| `annotations` | `ApToolAnnotations \| null` | No | `null` | Default annotations for all tools. Can be overridden per-tool. |

### @ApContext()

Parameter decorator. Injects the apcore `Context` object into the decorated parameter at execution time.

```typescript
@ApTool({ description: 'Send email with tracing' })
async send(
  inputs: Record<string, unknown>,
  @ApContext() ctx: Context,
): Promise<Record<string, unknown>> {
  const traceId = ctx.traceId;
  // ...
}
```

If `@ApContext()` is not used, context is not passed and the method receives only `inputs`. The method continues to work normally as a regular NestJS service method.

## ID Generation

Module ID is resolved in priority order:

1. **Explicit**: `@ApTool({ id: 'pay.charge' })` → `pay.charge`
2. **Namespace + method**: `@ApModule({ namespace: 'email' })` + method `send` → `email.send`
3. **Class name + method**: No `@ApModule`, class `OrderService`, method `create` → `order_service.create`

**Class name normalisation rules (snake_case):**
- Strip NestJS suffixes: `Service`, `Controller`, `Handler`, `Module`, `Provider`, `Gateway`, `Guard`, `Interceptor`, `Pipe`, `Filter`
- PascalCase → snake_case: `UserProfile` → `user_profile`
- Examples: `EmailService` → `email`, `UserProfileService` → `user_profile`, `HTTPClient` → `http_client`

**Method name normalisation (snake_case):**
- camelCase → snake_case: `batchSend` → `batch_send`, `checkStatus` → `check_status`

**Separator:** dot (`.`) between namespace and method. Examples:
- `EmailService.sendBatch` → `email.send_batch`
- `UserProfileService.getById` → `user_profile.get_by_id`

## Scanner

### ApToolScannerService

NestJS injectable service. Add it to your root module's `providers` array. It runs at `OnModuleInit`, iterating all providers in `ModulesContainer`.

**Scan process:**

1. Iterate all providers in all NestJS modules via `ModulesContainer`
2. Skip providers without a real instance or metatype (value providers, etc.)
3. For each provider class:
   a. Read `@ApModule` metadata from the class — get `namespace` (or normalise class name)
   b. Iterate methods on the prototype
   c. For each method with `@ApTool` metadata:
      - Generate module ID
      - Extract schemas via `SchemaExtractor` (falls back to `Type.Object({})` on failure)
      - Read `@ApContext` parameter index if present
      - Create `execute` wrapper function
      - Register as `FunctionModule` in `ApcoreRegistryService`

**Note:** Scanning runs once at startup. There is no public API for dynamic provider scanning after init.

## Execution Bridge

The `execute` wrapper created by the scanner bridges `apcore`'s call to the NestJS method:

```
apcore Executor calls:
  module.execute(inputs: Record<string, unknown>, context: Context)
    ↓
Wrapper calls (no @ApContext):
  instance[methodName](inputs)
    ↓
Wrapper calls (with @ApContext at index N):
  instance[methodName](inputs, ..., context)  // context injected at parameter N
```

**Return value normalisation:**
- `null` / `undefined` → `{}`
- Non-object (string, number, boolean, array) → `{ result: value }`
- Object → returned as-is

## Usage Examples

### Basic

```typescript
@Injectable()
export class OrderService {
  @ApTool({ description: 'Create a new order' })
  async create(inputs: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.db.orders.create(inputs);
  }

  @ApTool({
    description: 'Cancel an order',
    annotations: { destructive: true },
  })
  async cancel(inputs: Record<string, unknown>): Promise<void> {
    await this.db.orders.cancel(inputs.orderId as string);
  }
}
// Registered as: 'order.create', 'order.cancel'
```

### With @ApModule Namespace

```typescript
@ApModule({
  namespace: 'email',
  tags: ['communication'],
  annotations: { openWorld: true },
})
@Injectable()
export class EmailService {
  @ApTool({
    description: 'Send an email',
    inputSchema: Type.Object({
      to: Type.String(),
      subject: Type.String(),
      body: Type.String(),
    }),
  })
  async send(inputs: Record<string, unknown>) { /* ... */ }

  @ApTool({
    description: 'Send batch emails',
    annotations: { destructive: true },   // overrides class-level
    tags: ['bulk'],                        // merged with class tags
  })
  async batchSend(inputs: Record<string, unknown>) { /* ... */ }
}
// Registered as: 'email.send', 'email.batch_send'
```

### With @ApContext

```typescript
@ApModule({ namespace: 'audit' })
@Injectable()
export class AuditService {
  @ApTool({ description: 'Log an audit event' })
  async log(
    inputs: Record<string, unknown>,
    @ApContext() ctx: Context,
  ): Promise<void> {
    const identity = getCurrentIdentity(); // or use ctx.identity
    console.log(`Caller: ${identity?.id}, traceId: ${ctx.traceId}`);
  }
}
```

### Wiring in AppModule

```typescript
@Module({
  imports: [
    ApcoreModule.forRoot({}),
    ApcoreMcpModule.forRoot({ transport: 'streamable-http', port: 8000 }),
    OrderModule,
    EmailModule,
  ],
  providers: [ApToolScannerService],
})
export class AppModule {}
```

**Note:** With a file-linked local package (`nestjs-apcore: "file:.."`), use a `useFactory` provider to resolve `ApToolScannerService`:

```typescript
{
  provide: ApToolScannerService,
  useFactory: (registry: ApcoreRegistryService, container: ModulesContainer) =>
    new ApToolScannerService(registry, container),
  inject: [ApcoreRegistryService, ModulesContainer],
}
```

## Error Handling

| Error | When | Behavior |
|---|---|---|
| Method not found on instance | Schema extraction or binding | `Error: Method "${method}" does not exist on ${className}` |
| Schema extraction fails | Startup scan | Falls back to `Type.Object({})` silently |
| Provider has no instance | Startup scan | Skipped silently |

## Testing Strategy

### Unit Tests
- `@ApTool` stores correct metadata via `Reflect.getMetadata`
- `@ApModule` stores correct metadata via `Reflect.getMetadata`
- ID generation: class name normalisation (suffix removal, PascalCase → snake_case)
- ID generation: method name normalisation (camelCase → snake_case)
- ID priority: explicit > namespace + method > class + method
- `@ApContext` stores parameter index correctly

### Integration Tests
- Full NestJS app with decorated services → all tools appear in Registry
- `@ApContext()` injects context correctly
- Method without `@ApContext()` works (context omitted, inputs passed directly)
- MCP `tools/list` returns all decorated tools with correct names and schemas
- MCP `tools/call` executes decorated method with DI dependencies working

## Out of Scope

- Schema inference from TypeScript method parameter types (requires type information unavailable at runtime)
- Method-level Guards/Pipes/Interceptors mapping to apcore ACL/middleware
- Hot module replacement for decorator changes during development
- Dynamic provider scanning after module init
- Decorators for apcore Resources or Prompts (tools only)
