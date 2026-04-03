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

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
export { ApcoreCliModule } from './cli/apcore-cli.module.js';
export { ApcoreCliService } from './cli/apcore-cli.service.js';

// ---------------------------------------------------------------------------
// A2A
// ---------------------------------------------------------------------------
export { ApcoreA2aModule } from './a2a/apcore-a2a.module.js';
export { ApcoreA2aService } from './a2a/apcore-a2a.service.js';

// Re-export apcore-mcp helpers and types for convenience
export {
  reportProgress,
  elicit,
  createBridgeContext,
  asyncServe,
  APCoreMCP,
  registerMcpNamespace,
  registerMcpFormatter,
  McpErrorFormatter,
  MCP_NAMESPACE,
  MCP_ENV_PREFIX,
  MCP_DEFAULTS,
} from 'apcore-mcp';
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
  deepResolveRefs,
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
  AIEnhancer,
  DisplayResolver,
  createWriteResult,
  WriteError,
  YAMLVerifier,
  SyntaxVerifier,
  RegistryVerifier,
  MagicBytesVerifier,
  JSONVerifier,
  runVerifierChain,
} from 'apcore-toolkit';
export type {
  ScannedModule,
  AIEnhancerOptions,
  Enhancer,
  DisplayResolveOptions,
  DisplayMetadata,
  SurfaceDisplay,
  WriteResult,
  VerifyResult,
  Verifier,
} from 'apcore-toolkit';

// ---------------------------------------------------------------------------
// CLI utilities (from apcore-cli)
// ---------------------------------------------------------------------------
export {
  createCli,
  buildModuleCommand,
  LazyModuleGroup,
  GroupedModuleGroup,
  BUILTIN_COMMANDS,
  setDocsUrl,
  setVerboseHelp,
  buildProgramManPage,
  configureManHelp,
  registerShellCommands,
  registerDiscoveryCommands,
  getDisplay,
  getCliDisplayFields,
  ConfigResolver,
  DEFAULTS,
  checkApproval,
  formatExecResult,
  resolveFormat,
  formatModuleList,
  formatModuleDetail,
  validateModuleId,
  collectInput,
  reconvertEnumValues,
  schemaToCliOptions,
  mapType,
  extractHelp,
  AuditLogger,
  setAuditLogger,
  getAuditLogger,
  AuthProvider,
  ConfigEncryptor,
  Sandbox,
  ApprovalTimeoutError,
  ApprovalDeniedError,
  AuthenticationError,
  ConfigDecryptionError,
  ModuleExecutionError,
  ModuleNotFoundError,
  SchemaValidationError,
  EXIT_CODES,
  exitCodeForError,
  registerConfigNamespace,
} from 'apcore-cli';
export type { OptionConfig, ExitCode } from 'apcore-cli';

// ---------------------------------------------------------------------------
// A2A utilities (from apcore-a2a)
// ---------------------------------------------------------------------------
export { serve as serveA2A, asyncServe as asyncServeA2A } from 'apcore-a2a';
export { JWTAuthenticator as A2AJWTAuthenticator } from 'apcore-a2a';
export type { Authenticator as A2AAuthenticator, ClaimMapping as A2AClaimMapping } from 'apcore-a2a';

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
  APCORE_CLI_MODULE_OPTIONS,
  APCORE_A2A_MODULE_OPTIONS,
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
  ApcoreCliModuleOptions,
  ApcoreCliModuleAsyncOptions,
  ApcoreA2aModuleOptions,
  ApcoreA2aModuleAsyncOptions,
  RegisterMethodOptions,
  RegisterServiceOptions,
} from './types.js';
