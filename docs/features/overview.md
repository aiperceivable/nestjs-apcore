# Feature Overview

## Features

| Feature | Document | Description |
|---|---|---|
| MCP Server Integration | [mcp-server-integration.md](mcp-server-integration.md) | `ApcoreModule` — core Registry/Executor wrappers, auto tool scanning, and integrated MCP server lifecycle |
| @ApTool Decorator + Scanner | [aptool-decorator-scanner.md](aptool-decorator-scanner.md) | Decorator system for marking NestJS service methods as apcore tools with auto-scanning at startup |
| Schema Extraction | [schema-extraction.md](schema-extraction.md) | Priority-chain adapter system: TypeBox, Zod, JSON Schema, class-validator DTO → TSchema |
| NestJS DI Bridge | [di-bridge.md](di-bridge.md) | Zero-decorator integration via `registerService()`, `registerMethod()`, and YAML bindings |

## Implementation Order

Priority from high to low. Features higher in the list must be implemented first.

1. **MCP Server Integration** — Foundation. All other features depend on `ApcoreModule`, `ApcoreRegistryService`, `ApcoreExecutorService`.
2. **Schema Extraction** — Required by both @ApTool Scanner and DI Bridge for schema conversion.
3. **@ApTool Decorator + Scanner** — Decorator-based registration path. Depends on MCP Server Integration and Schema Extraction.
4. **NestJS DI Bridge** — Zero-decorator registration path. Depends on MCP Server Integration and Schema Extraction.

## Dependency Graph

```
ApcoreModule (Registry + Executor + Scanner + optional MCP)
        │
        ├──────────────────────┐
        ▼                      ▼
SchemaExtraction          ApcoreMcpModule (auto-imported via mcp option)
        │                      │
        ├──────────┐           │
        ▼          ▼           │
ApToolScanner   DI Bridge ─────┘
```

`ApToolScannerService` and the DI Bridge both depend on `ApcoreModule` and `SchemaExtractor`. They are independent of each other and can be used together in the same app without conflict.

## Module Architecture

`ApcoreModule.forRoot()` is the single entry point. It:

1. Creates `Registry` and `Executor` from `apcore-js`
2. Provides `ApcoreRegistryService` and `ApcoreExecutorService` globally
3. Includes `ApToolScannerService` automatically (scans on `OnModuleInit`)
4. Optionally imports `ApcoreMcpModule` when `mcp` config is provided

```typescript
// Minimal — tools only, no MCP server
ApcoreModule.forRoot()

// Full — tools + MCP server
ApcoreModule.forRoot({
  mcp: { transport: 'streamable-http', port: 8000 },
})
```
