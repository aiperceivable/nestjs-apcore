# Schema Extraction

## Overview

`SchemaExtractor` is an orchestrator that detects the format of a schema input and delegates extraction to the appropriate adapter. The result is always a TypeBox-compatible `TSchema` (or plain JSON Schema via `extractJsonSchema()`). Used by `ApToolScannerService` and `ApcoreRegistryService.registerMethod()` to accept any schema format without the user needing to know which adapter to call.

## Dependencies

- `@sinclair/typebox` — `TSchema` type and schema construction
- `apcore-js` — target schema format
- Optional peer dependencies (installed by user as needed):
  - `class-validator` + `class-transformer` — for `DtoAdapter`
  - `zod` — for `ZodAdapter`

## Architecture

```
Input                  SchemaExtractor (priority chain)       Output
─────                  ────────────────────────────────       ──────
TypeBox TSchema    →   TypeBoxAdapter    (priority 100)  →
Zod schema         →   ZodAdapter        (priority 50)   →   TSchema / JSON Schema
Plain JSON Schema  →   JsonSchemaAdapter (priority 30)   →
class-validator DTO→   DtoAdapter        (priority 20)   →
```

Adapters are tried in descending priority order. The first one whose `detect()` returns `true` handles the extraction. Custom adapters can be added via `registerAdapter()` and are inserted by priority.

## Public API

```typescript
class SchemaExtractor {
  extract(input: unknown): TSchema
  extractJsonSchema(input: unknown): Record<string, unknown>
  detect(input: unknown): string | null   // returns adapter name, or null if no match
  registerAdapter(adapter: SchemaAdapter): void
}

interface SchemaAdapter {
  readonly name: string
  readonly priority: number
  detect(input: unknown): boolean
  extract(input: unknown): TSchema
  extractJsonSchema(input: unknown): Record<string, unknown>
}

class SchemaExtractionError extends Error {}
```

## Adapters

### TypeBoxAdapter (priority 100)

**Detection:** Input has `Symbol.for('TypeBox.Kind')` property.

**Behaviour:** Passthrough — TypeBox schemas are already `TSchema`-compatible. The schema is returned as-is.

### ZodAdapter (priority 50)

**Detection:** Input has `_def` property and `safeParse` method.

**Behaviour:** Manual recursive traversal of Zod's `_def` structure. No extra packages required.

**Supported Zod types:**

| Zod | JSON Schema |
|---|---|
| `z.string()` | `{ "type": "string" }` |
| `z.number()` | `{ "type": "number" }` |
| `z.boolean()` | `{ "type": "boolean" }` |
| `z.object({})` | `{ "type": "object", "properties": {...}, "required": [...] }` |
| `z.array(z.string())` | `{ "type": "array", "items": { "type": "string" } }` |
| `z.enum([...])` | `{ "enum": [...] }` |
| `z.nativeEnum(E)` | `{ "enum": [...values] }` |
| `z.optional(t)` | removes field from `required` |
| `z.nullable(t)` | `{ "anyOf": [t, { "type": "null" }] }` |
| `z.default(t, v)` | `{ "default": v, ...t }` |
| `z.literal(v)` | `{ "const": v }` |
| `z.union([...])` | `{ "anyOf": [...] }` |
| `z.record(k, v)` | `{ "type": "object", "additionalProperties": {...} }` |
| `z.effects(t)` | delegates to inner type |

### JsonSchemaAdapter (priority 30)

**Detection:** Input is a plain object with a `type` property (string or array).

**Behaviour:** Passthrough — plain JSON Schema objects are returned as-is (cast to `TSchema`).

### DtoAdapter (priority 20)

**Detection:** Input is a function (class constructor) with `class-validator` metadata registered against it.

**Behaviour:** Reads `class-validator`'s `getMetadataStorage()` and maps decorator metadata to JSON Schema.

**Supported class-validator decorators:**

| Decorator | JSON Schema |
|---|---|
| `@IsString()` | `{ "type": "string" }` |
| `@IsNumber()` | `{ "type": "number" }` |
| `@IsBoolean()` | `{ "type": "boolean" }` |
| `@IsInt()` | `{ "type": "integer" }` |
| `@IsArray()` | `{ "type": "array" }` |
| `@IsEnum(E)` | `{ "enum": [...values] }` |
| `@IsOptional()` | Remove from `required` |
| `@IsNotEmpty()` | `{ "minLength": 1 }` |
| `@IsEmail()` | `{ "format": "email" }` |
| `@IsUrl()` | `{ "format": "uri" }` |
| `@IsDateString()` | `{ "format": "date-time" }` |
| `@MinLength(n)` | `{ "minLength": n }` |
| `@MaxLength(n)` | `{ "maxLength": n }` |
| `@Min(n)` | `{ "minimum": n }` |
| `@Max(n)` | `{ "maximum": n }` |
| `@Matches(regex)` | `{ "pattern": "..." }` |
| `@ArrayMinSize(n)` | `{ "minItems": n }` |
| `@ArrayMaxSize(n)` | `{ "maxItems": n }` |

## Integration with @ApTool Scanner

`ApToolScannerService` calls `SchemaExtractor.extract()` for any schema provided in `@ApTool` options. If extraction throws, it falls back to `Type.Object({})` silently.

```typescript
// Any of these work equally in @ApTool
@ApTool({
  description: 'Send email',
  inputSchema: SendEmailDto,                   // DtoAdapter
  // inputSchema: z.object({ to: z.string() }), // ZodAdapter
  // inputSchema: Type.Object({ to: Type.String() }), // TypeBoxAdapter
  // inputSchema: { type: 'object', properties: { to: { type: 'string' } } }, // JsonSchemaAdapter
})
```

## Standalone Usage

`SchemaExtractor` can be used directly — it is not a NestJS provider, just a plain class:

```typescript
const extractor = new SchemaExtractor();

// detect() returns the adapter name or null
console.log(extractor.detect(Type.String()));   // 'TypeBoxAdapter'
console.log(extractor.detect(z.string()));      // 'ZodAdapter'
console.log(extractor.detect(MyDto));           // 'DtoAdapter'
console.log(extractor.detect({ type: 'string' })); // 'JsonSchemaAdapter'
console.log(extractor.detect(42));              // null

// extract() returns TSchema
const schema = extractor.extract(SendEmailDto);

// extractJsonSchema() returns plain JSON Schema object
const json = extractor.extractJsonSchema(z.object({ name: z.string() }));
```

## Custom Adapters

```typescript
const extractor = new SchemaExtractor();

extractor.registerAdapter({
  name: 'MyCustomAdapter',
  priority: 75,  // between TypeBox (100) and Zod (50)
  detect: (input) => input instanceof MyCustomSchema,
  extract: (input) => convertToTypebox(input as MyCustomSchema),
  extractJsonSchema: (input) => convertToJsonSchema(input as MyCustomSchema),
});
```

## Error Handling

| Error | When | Message |
|---|---|---|
| `SchemaExtractionError` | No adapter matches | `"No adapter matched the provided input. Ensure the input is a valid TypeBox, Zod, JSON Schema, or class-validator DTO schema."` |
| Silent fallback in scanner | Extraction fails inside `ApToolScannerService` | Uses `Type.Object({})` — no throw |

## Testing Strategy

### Unit Tests — TypeBoxAdapter
- TypeBox schema passes through as-is
- Symbol.for('TypeBox.Kind') is preserved

### Unit Tests — ZodAdapter
- `z.object()` with string/number/boolean/array fields
- Nested `z.object()`
- `z.optional()`, `z.nullable()`, `z.default()`
- `z.array()`, `z.enum()`, `z.nativeEnum()`, `z.union()`, `z.literal()`, `z.record()`
- `z.effects()` delegates to inner type

### Unit Tests — JsonSchemaAdapter
- Plain JSON Schema passthrough

### Unit Tests — DtoAdapter
- Simple DTO with typed fields
- `@IsOptional()` fields not in `required`
- Constraints map correctly
- `@IsEnum()` produces enum values

### Unit Tests — SchemaExtractor
- `detect()` returns correct adapter name for each type
- `detect()` returns `null` for unknown input
- `extract()` delegates to correct adapter
- `registerAdapter()` inserts by priority

## Out of Scope

- TypeScript type inference without decorators (impossible at runtime)
- Circular reference detection in DTOs
- Nested DTO via `@ValidateNested()` + `@Type()`
- `class-validator` groups-based conditional schemas
- Schema caching/memoization
- Swagger/OpenAPI schema import
