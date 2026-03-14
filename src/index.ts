// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------
export { ApcoreModule } from './core/apcore.module.js';
export { ApcoreRegistryService } from './core/apcore-registry.service.js';
export { ApcoreExecutorService } from './core/apcore-executor.service.js';

// ---------------------------------------------------------------------------
// MCP
// ---------------------------------------------------------------------------
export { ApcoreMcpModule } from './mcp/apcore-mcp.module.js';
export { ApcoreMcpService } from './mcp/apcore-mcp.service.js';

// Re-export apcore-mcp helpers and types for convenience
export { reportProgress, elicit, createBridgeContext, asyncServe, APCoreMCP } from 'apcore-mcp';
export type {
  BridgeContext,
  OpenAIToolDef,
  ServeOptions,
  AsyncServeOptions,
  AsyncServeApp,
  MetricsExporter,
  ElicitResult,
  APCoreMCPOptions,
  APCoreMCPServeOptions,
  APCoreMCPAsyncServeOptions,
  ToOpenaiToolsOptions,
} from 'apcore-mcp';

// Re-export apcore-mcp auth utilities
export { JWTAuthenticator, getCurrentIdentity, identityStorage } from 'apcore-mcp';
export type { Authenticator, ClaimMapping, JWTAuthenticatorOptions } from 'apcore-mcp';

// ---------------------------------------------------------------------------
// Toolkit (scanner & schema extraction from apcore-toolkit)
// ---------------------------------------------------------------------------
export {
  BaseScanner,
  createScannedModule,
  cloneModule,
  extractInputSchema,
  extractOutputSchema,
  resolveRef,
  resolveSchema,
  enrichSchemaDescriptions,
  YAMLWriter,
  TypeScriptWriter,
  RegistryWriter,
  getWriter,
  moduleToDict,
  modulesToDicts,
  annotationsToDict,
  resolveTarget,
  flattenParams,
  toMarkdown,
} from 'apcore-toolkit';
export type { ScannedModule } from 'apcore-toolkit';

// ---------------------------------------------------------------------------
// Decorators
// ---------------------------------------------------------------------------
export { ApTool, ApModule, ApContext } from './decorators/index.js';
export { ApToolScannerService } from './decorators/ap-tool-scanner.service.js';
export type { ScanOptions } from './decorators/ap-tool-scanner.service.js';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
export { SchemaExtractor, SchemaExtractionError } from './schema/schema-extractor.service.js';
export type { SchemaAdapter } from './schema/adapters/schema-adapter.interface.js';
export { TypeBoxAdapter } from './schema/adapters/typebox.adapter.js';
export { ZodAdapter } from './schema/adapters/zod.adapter.js';
export { DtoAdapter } from './schema/adapters/dto.adapter.js';
export { JsonSchemaAdapter } from './schema/adapters/json-schema.adapter.js';

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------
export { ApBindingLoader } from './bridge/index.js';
export type { InstanceProvider } from './bridge/index.js';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
export {
  normalizeClassName,
  normalizeMethodName,
  generateModuleId,
} from './utils/id-generator.js';
export { scannedModuleToFunctionModule, toModuleAnnotations } from './utils/module-factory.js';
export type { BoundExecuteFn } from './utils/module-factory.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export {
  APCORE_MODULE_OPTIONS,
  APCORE_MCP_MODULE_OPTIONS,
  AP_TOOL_METADATA_KEY,
  AP_MODULE_METADATA_KEY,
  AP_CONTEXT_METADATA_KEY,
} from './constants.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type {
  // Upstream re-exports
  ModuleAnnotations,
  ModuleExample,
  Module,
  Context,
  Identity,
  ModuleDescriptor,
  PreflightResult,
  PreflightCheckResult,
  ValidationResult,
  // Local types
  ApToolAnnotations,
  ApToolExample,
  ApToolOptions,
  ApModuleOptions,
  ApcoreModuleOptions,
  ApcoreModuleAsyncOptions,
  ApcoreMcpModuleOptions,
  ApcoreMcpModuleAsyncOptions,
  RegisterMethodOptions,
  RegisterServiceOptions,
} from './types.js';
