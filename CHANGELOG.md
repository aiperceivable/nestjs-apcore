# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-07-06

### Added

- **`ACL.discover(config)` support in demo** — `demo/apcore.yaml` now declares `acl.root: ./acl.yaml`; `app.module.ts` calls `ACL.discover(config)` (new in apcore-js 0.25.0) instead of manually parsing the YAML. Both config and ACL are loaded in a single `Config.discover()` call at module startup.

### Changed

- **Dependency upgrades** — `apcore-js` ≥ 0.25.0, `apcore-toolkit` ^ 0.9.1, `apcore-mcp` ≥ 0.17.0, `apcore-cli` ≥ 0.10.2.
- **`register()`, `registerMethod()`, `registerService()`, `loadFromString()` are now `async`** — `Registry.register()` has returned `Promise<void>` since apcore-js 0.22.0. nestjs-apcore's wrappers now correctly `await` it, matching the fix in apcore-toolkit 0.9.1's `RegistryWriter`. `ApToolScannerService.onModuleInit()` is also now `async` so NestJS awaits tool registration before the app is marked ready. This is a **breaking change** for callers who relied on a synchronous return value from these methods.

### Migration Notes

**Async registration methods** — if you call any of these programmatically, add `await`:

```typescript
// Before (0.5.x)
const id = registry.registerMethod({ ... });
const ids = registry.registerService({ ... });
const ids = bindingLoader.loadFromString(yaml);

// After (0.6.0)
const id = await registry.registerMethod({ ... });
const ids = await registry.registerService({ ... });
const ids = await bindingLoader.loadFromString(yaml);
```

### Added

- **New MCP exports** — `MCPServerFactory` (`MCPServer` alias), `ExecutionRouter`, `RegistryListener`, `TransportManager`, `AsyncTaskBridge`, `createAsyncTaskBridge`, `META_TOOL_NAMES`, `APCORE_META_TOOL_PREFIX`, `ApprovalBridge`, `APPROVAL_META_TOOL_NAMES`, `ElicitationApprovalHandler`, `StorageBackedApprovalHandler`, `InMemoryApprovalStore`, `AnnotationMapper`, `McpSchemaConverter`, `McpErrorMapper`, `ModuleIDNormalizer`, `OpenAIConverter`, `toOpenaiTools`, `installObservability`, `parseTraceparent`, `buildTraceparent`, `REGISTRY_EVENTS`, `APCORE_EVENTS`, `MODULE_ID_PATTERN`, `ErrorCodes`, `MCP_PROGRESS_KEY`, `MCP_ELICIT_KEY`, `buildExplorerAuthHook` re-exported from `apcore-mcp`.
- **New MCP types** — `CallResult`, `HandleCallExtra`, `ExecutionRouterOptions`, `ObservabilityFlag`, `ObservabilityStack`, `AsyncTaskManagerLike`, `ApprovalStore`, `ApprovalRecord`, `ApprovalMetaToolName`, `ConvertOptions`, `ConvertRegistryOptions`, `BuildToolsOptions`, `UsageExporter`.
- **New A2A exports** — `A2AClient`, `AgentCardBuilder`, `SkillMapper`, `PartConverter`, `A2ASchemaConverter`, `A2AErrorMapper`, `A2AServerFactory`, `ApCoreAgentExecutor`, `createAuthMiddleware`, `authIdentityStore`, `getAuthIdentity` re-exported from `apcore-a2a`.
- **New CLI exports** — `main`, `applyToolkitIntegration`, `setAllOptionsHelp`, `LazyGroup`, `CliApprovalHandler`, `ApcliGroup`, `ApcliGroupError`, `RESERVED_GROUP_NAMES`, `APCLI_SUBCOMMAND_NAMES`, `DEFAULT_BUILTIN_GROUP_NAME`, `ExposureFilter`, `registerListCommand`, `registerDescribeCommand`, `registerExecCommand`, `registerValidateCommand`, `registerCompletionCommand`, `registerHealthCommand`, `registerUsageCommand`, `registerEnableCommand`, `registerDisableCommand`, `registerReloadCommand`, `registerConfigCommand`, `registerPipelineCommand`, `registerInitCommand`, `MaxDepthExceededError`, `CircularRefError`, `UnresolvableRefError`, `setLogLevel`, `getLogLevel`, `resolveRefs` re-exported from `apcore-cli`.
- **New CLI types** — `CreateCliOptions`, `ApplyToolkitIntegrationOptions`, `ApcliConfig`, `ApcliMode`.
- **New Toolkit exports** — `SCANNER_VERB_MAP`, `hasPathParams`, `resolveHttpVerb`, `generateSuggestedAlias`, `extractPathParamNames`, `substitutePathParams`, `formatSchema`, `formatModule`, `formatModules`, `formatCsv`, `formatJsonl`, `filterModules`, `deduplicateIds`, `inferAnnotationsFromMethod`, `BindingLoader`, `BindingLoadError`, `HTTPProxyRegistryWriter`, `HTTPProxyRegistryWriterError`, `InvalidFormatError` re-exported from `apcore-toolkit`.
- **New Toolkit types** — `SchemaStyle`, `ModuleStyle`, `GroupBy`, `FormatSchemaOptions`, `FormatModuleOptions`, `FormatModulesOptions`, `FormatCsvOptions`, `BindingLoadOptions`, `HTTPProxyRegistryWriterOptions`, `ProxyRegistry`.
- **`ApcoreMcpModuleOptions` extended** — New fields: `observability` (`ObservabilityFlag`), `outputFormat` (`'json' | 'csv' | 'jsonl'`), `redactOutput`, `trace`, `strategy`, `mcpMiddleware`, `mcpAcl`, `approvalStore`, `approvalNotify`. `metricsCollector` now also accepts `true` to auto-instantiate the built-in metrics collector.

### Changed

- **Dependency upgrades** — `apcore-js` ≥ 0.24.0, `apcore-toolkit` ^ 0.8.1, `apcore-mcp` ≥ 0.16.0, `apcore-cli` ≥ 0.10.0, `apcore-a2a` ≥ 0.4.0. Dev dependencies updated to NestJS 11.
- **`ApcoreExecutorService.validate()` is now `async`** — Returns `Promise<PreflightResult>` to match the upstream `apcore-js` 0.24.0 API. Callers must `await` the result.
- **`normalizeResult` inlined** — `normalizeResult()` was removed from `apcore-js` 0.24.0; an equivalent local helper is now used in `ApcoreRegistryService` and `ApBindingLoader`.

### Removed

The following symbols were removed from upstream `apcore-cli` 0.10.x and are no longer re-exported:

- `BUILTIN_COMMANDS`
- `buildProgramManPage`
- `registerShellCommands` (replaced by `registerCompletionCommand`)
- `registerDiscoveryCommands` (replaced by individual `registerListCommand` / `registerDescribeCommand` / `registerExecCommand` / `registerValidateCommand`)
- `getDisplay`, `getCliDisplayFields` (moved to internal use in apcore-cli)
- `mapType`, `extractHelp` (moved to internal use in apcore-cli)
- `flattenParams` (removed from `apcore-toolkit`)

### Migration Notes

**`validate()` is now async:**

```typescript
// Before (0.4.x)
const result = service.validate('mod.action', {});

// After (0.5.0)
const result = await service.validate('mod.action', {});
```

**Removed CLI exports** — replace `registerDiscoveryCommands(program, executor)` with the four individual registrars:

```typescript
// Before
registerDiscoveryCommands(program, executor);

// After
registerListCommand(program, executor);
registerDescribeCommand(program, executor);
registerExecCommand(program, executor);
registerValidateCommand(program, executor);
```

## [0.4.0] - 2026-03-30

### Added

- **CLI module** — `ApcoreCliModule.forRoot()` and `ApcoreCliService` for integrating `apcore-cli` into a NestJS application. `ApcoreModule.forRoot()` / `forRootAsync()` now accept an optional `cli` config and automatically import `ApcoreCliModule`.
- **A2A module** — `ApcoreA2aModule.forRoot()` and `ApcoreA2aService` for integrating the Agent-to-Agent (`apcore-a2a`) protocol server. `ApcoreModule.forRoot()` / `forRootAsync()` now accept an optional `a2a` config and automatically import `ApcoreA2aModule`.
- **CLI re-exports** — `createCli`, `buildModuleCommand`, `LazyModuleGroup`, `GroupedModuleGroup`, `BUILTIN_COMMANDS`, audit-logger helpers (`AuditLogger`, `setAuditLogger`, `getAuditLogger`), auth/security primitives (`AuthProvider`, `ConfigEncryptor`, `Sandbox`), error classes (`ApprovalTimeoutError`, `ApprovalDeniedError`, `AuthenticationError`, `ConfigDecryptionError`, `ModuleExecutionError`, `ModuleNotFoundError`, `SchemaValidationError`), formatting utilities, and `EXIT_CODES` / `exitCodeForError` re-exported from `nestjs-apcore`.
- **A2A re-exports** — `serveA2A`, `asyncServeA2A`, `A2AJWTAuthenticator`, and associated `A2AAuthenticator` / `A2AClaimMapping` types re-exported for convenience.
- **Toolkit additions** — `deepResolveRefs`, `AIEnhancer`, `DisplayResolver`, `createWriteResult`, `WriteError`, verifier chain utilities (`YAMLVerifier`, `SyntaxVerifier`, `RegistryVerifier`, `MagicBytesVerifier`, `JSONVerifier`, `runVerifierChain`), and related option types re-exported from `apcore-toolkit`.
- **DI tokens** — `APCORE_CLI_MODULE_OPTIONS` and `APCORE_A2A_MODULE_OPTIONS` constants exported for custom provider overrides.

## [0.3.2] - 2026-03-22

### Changed
- Rebrand: aipartnerup → aiperceivable

## [0.3.1] - 2026-03-15

### Changed

- **Demo** — Renamed `examples/` directory to `demo/` and switched to pnpm for Docker builds.

### Added

- **CI** — Initial GitHub Actions workflow for build, test, and pre-commit checks.

## [0.3.0] - 2026-03-15

### Changed

- **Consolidated module** — MCP server and tool scanner integration moved directly into `ApcoreModule`, simplifying setup. `ApcoreModule.forRoot()` now accepts an optional `mcp` config and automatically imports `ApcoreMcpModule` and registers `ApToolScannerService` — no need to import them separately.
- **`forRoot()` default** — `ApcoreModule.forRoot()` can now be called with no arguments for a minimal Registry + Executor setup.
- **`forRootAsync()` MCP** — Added static `mcp` option to `ApcoreModuleAsyncOptions` for defining MCP config at module-definition time.
- **README** — Updated Quick Start and API Reference to reflect the consolidated module pattern.

## [1.1.0] - 2026-03-14

### Changed

- **Package publishing** — Removed the `"private"` field from `package.json` to allow npm publishing.

## [1.0.0] - 2026-03-14

### Added

- **apcore-toolkit integration** — Adopted `apcore-toolkit`'s `ScannedModule` as the intermediate representation for all module creation paths (decorator scanner, programmatic registration, YAML binding loader). Added `scannedModuleToFunctionModule()` and `toModuleAnnotations()` shared factory utilities.
- **`asyncServe` support** — Re-exported `asyncServe` and `APCoreMCP` class from `apcore-mcp` for programmatic server management.
- **Serialisation helpers** — `ApcoreRegistryService.toScannedModule()`, `toDict()`, and `toDicts()` for converting registered modules to toolkit intermediates and snake_case dictionaries.
- **Toolkit re-exports** — `BaseScanner`, `createScannedModule`, `cloneModule`, schema extraction utilities, writers (`YAMLWriter`, `TypeScriptWriter`, `RegistryWriter`), and serialisation helpers (`moduleToDict`, `modulesToDicts`, `annotationsToDict`, `toMarkdown`, etc.) re-exported from `nestjs-apcore`.
- **New types** — `ScanOptions`, `BoundExecuteFn`, `PreflightResult`, `PreflightCheckResult`, and additional `apcore-mcp` option types (`AsyncServeOptions`, `AsyncServeApp`, `APCoreMCPOptions`, etc.).

### Changed

- **`normalizeReturnValue` → `normalizeResult`** — Replaced local `normalizeReturnValue()` helpers in `ApcoreRegistryService` and `ApBindingLoader` with `normalizeResult()` from `apcore-js`.
- **`validate()` signature** — `ApcoreExecutorService.validate()` now returns `PreflightResult` (was `ValidationResult`) and accepts optional `context` parameter.
- **Schema handling** — Module creation now uses plain JSON Schema objects (`Record<string, unknown>`) instead of TypeBox `TSchema` for input/output schemas, improving interoperability.
- **Scanner refactor** — `ApToolScannerService` refactored to produce `ScannedModule` intermediates via `apcore-toolkit` before converting to `FunctionModule`.

## [0.1.0] - 2026-03-01

Initial release.

### Added

- **Core module** — `ApcoreModule.forRoot()` / `forRootAsync()` providing `ApcoreRegistryService` and `ApcoreExecutorService` as global NestJS singletons wrapping the upstream `apcore-js` `Registry` and `Executor`.
- **MCP module** — `ApcoreMcpModule.forRoot()` / `forRootAsync()` providing `ApcoreMcpService` that wraps `serve()` and `toOpenaiTools()` from `apcore-mcp`. Supports `stdio`, `streamable-http`, and `sse` transports, Tool Explorer UI, JWT authentication, Prometheus metrics, and lifecycle management via `OnApplicationBootstrap` / `OnModuleDestroy`.
- **Decorators** — `@ApTool`, `@ApModule`, `@ApContext` for marking NestJS service methods as apcore tools. `ApToolScannerService` auto-discovers decorated methods at startup and registers them as `FunctionModule` instances.
- **Programmatic registration** — `ApcoreRegistryService.registerMethod()` and `registerService()` for registering methods without decorators.
- **YAML binding loader** — `ApBindingLoader` for registering tools from YAML files, supporting `module_id`, `target`, schemas, annotations, and tags.
- **Schema adapters** — Pluggable schema extraction with 4 built-in adapters (TypeBox at priority 100, Zod at 50, raw JSON Schema at 30, class-validator DTO at 20). `SchemaExtractor` auto-detects format via priority chain. Custom adapters supported via `SchemaExtractor.registerAdapter()`.
- **Re-exported helpers** — `reportProgress`, `elicit`, `createBridgeContext`, `JWTAuthenticator`, `getCurrentIdentity`, `identityStorage` and associated types re-exported from `nestjs-apcore` for convenience.
- **ID generation utilities** — `normalizeClassName`, `normalizeMethodName`, `generateModuleId` for consistent module ID generation (e.g. `EmailService.sendBatch` → `email.send_batch`).
- **Demo app** — Complete NestJS application in `demo/` with `TodoModule` (CRUD + REST controller, dual-protocol) and `WeatherModule` (DI chain with `GeoService`). Demonstrates optional JWT authentication via `JWT_SECRET` env var and `getCurrentIdentity()` usage inside a tool method. Includes Dockerfile, docker-compose.yml, and README with test token and cURL examples.
- **Test suite** — 358 tests across 17 test files covering all modules, services, decorators, schema adapters, YAML binding loader, ID generation utilities, and integration scenarios.
