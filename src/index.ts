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
  // New value exports
  toOpenaiTools,
  MCPServerFactory,
  MCPServer,
  ExecutionRouter,
  RegistryListener,
  TransportManager,
  AsyncTaskBridge,
  createAsyncTaskBridge,
  META_TOOL_NAMES,
  APCORE_META_TOOL_PREFIX,
  ApprovalBridge,
  APPROVAL_META_TOOL_NAMES,
  ElicitationApprovalHandler,
  StorageBackedApprovalHandler,
  InMemoryApprovalStore,
  AnnotationMapper,
  OpenAIConverter,
  installObservability,
  parseTraceparent,
  buildTraceparent,
  REGISTRY_EVENTS,
  APCORE_EVENTS,
  MODULE_ID_PATTERN,
  ErrorCodes,
  MCP_PROGRESS_KEY,
  MCP_ELICIT_KEY,
  buildExplorerAuthHook,
  SchemaConverter as McpSchemaConverter,
  ErrorMapper as McpErrorMapper,
  ModuleIDNormalizer,
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
  // New type exports
  CallResult,
  HandleCallExtra,
  ExecutionRouterOptions,
  ObservabilityFlag,
  ObservabilityStack,
  AsyncTaskManagerLike,
  ApprovalStore,
  ApprovalRecord,
  ApprovalMetaToolName,
  ConvertOptions,
  ConvertRegistryOptions,
  BuildToolsOptions,
  UsageExporter,
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
  // New value exports
  SCANNER_VERB_MAP,
  hasPathParams,
  resolveHttpVerb,
  generateSuggestedAlias,
  extractPathParamNames,
  substitutePathParams,
  formatSchema,
  formatModule,
  formatModules,
  formatCsv,
  formatJsonl,
  filterModules,
  deduplicateIds,
  inferAnnotationsFromMethod,
  BindingLoader,
  BindingLoadError,
  HTTPProxyRegistryWriter,
  HTTPProxyRegistryWriterError,
  InvalidFormatError,
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
  // New type exports
  SchemaStyle,
  ModuleStyle,
  GroupBy,
  FormatSchemaOptions,
  FormatModuleOptions,
  FormatModulesOptions,
  FormatCsvOptions,
  BindingLoadOptions,
  HTTPProxyRegistryWriterOptions,
  ProxyRegistry,
} from 'apcore-toolkit';

// ---------------------------------------------------------------------------
// CLI utilities (from apcore-cli)
// ---------------------------------------------------------------------------
export {
  createCli,
  buildModuleCommand,
  LazyModuleGroup,
  GroupedModuleGroup,
  setDocsUrl,
  setVerboseHelp,
  configureManHelp,
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
  // New value exports
  main,
  applyToolkitIntegration,
  setAllOptionsHelp,
  LazyGroup,
  CliApprovalHandler,
  ApcliGroup,
  ApcliGroupError,
  RESERVED_GROUP_NAMES,
  APCLI_SUBCOMMAND_NAMES,
  DEFAULT_BUILTIN_GROUP_NAME,
  ExposureFilter,
  registerListCommand,
  registerDescribeCommand,
  registerExecCommand,
  registerValidateCommand,
  registerCompletionCommand,
  registerHealthCommand,
  registerUsageCommand,
  registerEnableCommand,
  registerDisableCommand,
  registerReloadCommand,
  registerConfigCommand,
  registerPipelineCommand,
  registerInitCommand,
  MaxDepthExceededError,
  CircularRefError,
  UnresolvableRefError,
  setLogLevel,
  getLogLevel,
  resolveRefs,
} from 'apcore-cli';
export type {
  OptionConfig,
  ExitCode,
  // New type exports
  CreateCliOptions,
  ApplyToolkitIntegrationOptions,
  ApcliConfig,
  ApcliMode,
} from 'apcore-cli';

// ---------------------------------------------------------------------------
// A2A utilities (from apcore-a2a)
// ---------------------------------------------------------------------------
export { serve as serveA2A, asyncServe as asyncServeA2A } from 'apcore-a2a';
export { JWTAuthenticator as A2AJWTAuthenticator } from 'apcore-a2a';
export type { Authenticator as A2AAuthenticator, ClaimMapping as A2AClaimMapping } from 'apcore-a2a';
// New A2A value exports
export {
  A2AClient,
  AgentCardBuilder,
  SkillMapper,
  PartConverter,
  A2AServerFactory,
  ApCoreAgentExecutor,
  createAuthMiddleware,
  authIdentityStore,
  getAuthIdentity,
  SchemaConverter as A2ASchemaConverter,
  ErrorMapper as A2AErrorMapper,
} from 'apcore-a2a';
// Note: AgentCardFetcher and A2A client error classes (A2AClientError, A2AConnectionError,
// A2ADiscoveryError, A2AServerError, TaskNotCancelableError, TaskNotFoundError) are only
// available from the internal apcore-a2a/client sub-module which is not exposed in the
// package exports map. They are intentionally not re-exported here.

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
// Context
// ---------------------------------------------------------------------------
export { NestContextFactory } from './context/nest-context.factory.js';
export type { NestRequest } from './context/nest-context.factory.js';

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
