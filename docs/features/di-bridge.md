# NestJS DI Bridge

## Overview

Two complementary mechanisms for registering existing NestJS service methods as apcore tools **without decorating the service source code**:

1. **Programmatic API** — `ApcoreRegistryService.registerMethod()` and `registerService()` for imperative registration in `OnModuleInit` or app setup.
2. **YAML Binding Loader** — `ApBindingLoader` for declarative registration from YAML files.

Both paths produce `FunctionModule` instances and register them in the same `ApcoreRegistryService` used by `@ApTool` decorated methods.

## Dependencies

- [MCP Server Integration](mcp-server-integration.md) — `ApcoreRegistryService`
- `apcore-js` — `FunctionModule`
- `js-yaml` — YAML parsing (for `ApBindingLoader`)

## Programmatic API

### `ApcoreRegistryService.registerMethod(options)`

Registers a single method from a service instance as a `FunctionModule`.

**`RegisterMethodOptions`:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `instance` | `object` | Yes | — | The already-constructed service instance (from NestJS DI). |
| `method` | `string` | Yes | — | Method name on the instance. |
| `description` | `string` | Yes | — | Tool description. |
| `id` | `string` | No | auto-generated | Explicit module ID. If omitted, generated from class name + method. |
| `inputSchema` | `unknown` | No | `Type.Object({})` | TypeBox, Zod, DTO class, or JSON Schema. |
| `outputSchema` | `unknown` | No | `Type.Object({})` | Same formats as inputSchema. |
| `annotations` | `ApToolAnnotations` | No | — | Module annotations. |
| `tags` | `string[]` | No | — | Tags. |
| `documentation` | `string \| null` | No | — | Extended docs. |
| `examples` | `ApToolExample[]` | No | — | Example inputs/outputs. |

**Returns:** `string` — the module ID under which the method was registered.

**ID auto-generation:** `instance.constructor.name` + `method` → normalised to snake_case (e.g. `EmailService.sendBatch` → `email.send_batch`).

### `ApcoreRegistryService.registerService(options)`

Bulk-registers multiple methods from one service instance.

**`RegisterServiceOptions`:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `instance` | `object` | Yes | — | The service instance. |
| `methods` | `string[] \| '*'` | Yes | — | Methods to register. `'*'` = all public methods from prototype chain. |
| `exclude` | `string[]` | No | `[]` | Methods to skip (applies when `methods: '*'`). |
| `namespace` | `string` | No | normalised class name | ID prefix for all registered methods. |
| `description` | `string` | No | method name | Default description for all methods. |
| `annotations` | `ApToolAnnotations` | No | — | Default annotations for all methods. |
| `tags` | `string[]` | No | — | Tags for all methods. |
| `methodOptions` | `Record<string, Partial<RegisterMethodOptions>>` | No | `{}` | Per-method overrides (id, description, inputSchema, outputSchema, annotations, tags, etc.). |

**Returns:** `string[]` — array of registered module IDs.

## YAML Binding Loader

### ApBindingLoader

Injectable service that loads YAML binding files and registers tools with `ApcoreRegistryService`.

**Constructor injection:**
- `ApcoreRegistryService` — required
- `APCORE_INSTANCE_PROVIDER` (optional) — injection token for a function `(className: string) => object | undefined` that resolves class names to instances

**Methods:**

```typescript
loadFromString(content: string): string[]              // sync — returns registered IDs
loadFromFile(filePath: string): Promise<string[]>      // async — reads file then loads
```

### Binding YAML Format

```yaml
bindings:
  - module_id: email.send
    target: EmailService.send        # resolved via APCORE_INSTANCE_PROVIDER
    description: "Send an email"
    input_schema:                    # inline JSON Schema
      type: object
      properties:
        to: { type: string }
        subject: { type: string }
        body: { type: string }
      required: [to, subject, body]
    output_schema:
      type: object
      properties:
        sent: { type: boolean }
    tags: [email, mutate]
    annotations:
      readonly: false
      destructive: false
    documentation: "Sends a transactional email via the configured provider."
```

**Fields per binding entry:**

| Field | Required | Description |
|---|---|---|
| `module_id` | Yes | Fully-qualified module ID (e.g. `email.send`) |
| `target` | Yes | `ClassName.methodName` — resolved via `APCORE_INSTANCE_PROVIDER` |
| `description` | Yes | Tool description |
| `input_schema` | No | Inline JSON Schema object. Defaults to `Type.Object({})` if omitted. |
| `output_schema` | No | Inline JSON Schema object. Defaults to `Type.Object({})` if omitted. |
| `tags` | No | Array of tag strings |
| `annotations` | No | Object with `readonly`, `destructive`, `idempotent`, etc. |
| `documentation` | No | Extended documentation string |

**Target resolution:**
- `EmailService.send` → calls `instanceProvider('EmailService')` → gets instance → binds `instance.send`
- If no `instanceProvider` or class not found → execute function returns `{ error: "No instance available for ClassName.methodName" }`

## Behaviour

### Return Value Normalisation (both paths)

All execute wrappers normalise the return value:
- `null` / `undefined` → `{}`
- Non-object (string, number, boolean, array) → `{ result: value }`
- Object → returned as-is

### Method Discovery (registerService with `'*'`)

Collects all own and prototype methods (excluding `constructor`) up to but not including `Object.prototype`. Includes methods from base classes. Static methods are excluded.

## Usage Examples

### Programmatic — Single Method

```typescript
@Module({
  imports: [ApcoreModule.forRoot({}), ApcoreMcpModule.forRoot({ ... })],
  providers: [PaymentService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private registry: ApcoreRegistryService,
    private payment: PaymentService,
  ) {}

  onModuleInit() {
    this.registry.registerMethod({
      instance: this.payment,
      method: 'charge',
      id: 'billing.charge_card',
      description: 'Charge a credit card',
      inputSchema: Type.Object({
        amount: Type.Number({ minimum: 1 }),
        currency: Type.String(),
        customerId: Type.String(),
      }),
      annotations: { destructive: true, requiresApproval: true },
    });
  }
}
```

### Programmatic — Bulk Service Registration

```typescript
onModuleInit() {
  this.registry.registerService({
    instance: this.userService,
    namespace: 'user',
    methods: '*',
    exclude: ['onModuleInit', 'onModuleDestroy'],
    description: 'User management',
    annotations: { readonly: false },
    methodOptions: {
      findById: { annotations: { readonly: true } },
      search: { annotations: { readonly: true } },
      delete: { annotations: { destructive: true, requiresApproval: true } },
    },
  });
  // Registers: user.find_by_id, user.search, user.create, user.update, user.delete
}
```

### YAML Binding Loader

```typescript
// Provide instance resolver
{
  provide: 'APCORE_INSTANCE_PROVIDER',
  useFactory: (email: EmailService, order: OrderService) =>
    (className: string) => ({ EmailService: email, OrderService: order })[className],
  inject: [EmailService, OrderService],
}

// In a setup service
@Injectable()
export class BindingSetup implements OnModuleInit {
  constructor(private loader: ApBindingLoader) {}

  async onModuleInit() {
    await this.loader.loadFromFile('./bindings/tools.yaml');
  }
}
```

### Combining with @ApTool

Both paths register to the same `ApcoreRegistryService`. A service can have some methods decorated with `@ApTool` and others registered programmatically — they coexist without conflict.

```typescript
// TodoService uses @ApTool on list/add/complete
// Legacy ReportService registered via registerService()
// Both appear in MCP tools/list
```

## Error Handling

| Error | When | Behaviour |
|---|---|---|
| Method not found on instance | `registerMethod()` | `Error: Method "${method}" does not exist on ${className}` |
| YAML parse error | `loadFromString()` | `js-yaml` throws — propagates to caller |
| Instance not resolved (YAML) | `loadFromString()` | Execute returns `{ error: "No instance available for ..." }` |

## Out of Scope

- Auto-discovery of all providers without explicit registration
- Request-scoped and transient-scoped provider support (singleton instances only)
- `input_schema_ref` / `output_schema_ref` external file references in YAML
- Auto-loading a bindings directory from `ApcoreModule.forRoot()` (the `bindings` field in `ApcoreModuleOptions` is available but loading must be triggered manually via `ApBindingLoader`)
- Binding hot-reload (file watching)
- Binding to static methods or standalone functions
