# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
