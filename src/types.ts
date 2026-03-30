// Re-export upstream types from apcore-js
export type {
  ModuleAnnotations,
  ModuleExample,
  Module,
  Context,
  Identity,
  ModuleDescriptor,
  PreflightResult,
  PreflightCheckResult,
  ValidationResult,
} from 'apcore-js';

// ---------------------------------------------------------------------------
// Annotation / option types for decorators and module configuration
// ---------------------------------------------------------------------------

/** Annotations describing tool behavior characteristics. */
export interface ApToolAnnotations {
  readonly?: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  requiresApproval?: boolean;
  openWorld?: boolean;
  streaming?: boolean;
  cacheable?: boolean;
  cacheTtl?: number;
  cacheKeyFields?: string[] | null;
  paginated?: boolean;
  paginationStyle?: 'cursor' | 'offset' | 'page';
}

/** Example entry for a tool invocation. */
export interface ApToolExample {
  title: string;
  inputs: Record<string, unknown>;
  output: Record<string, unknown>;
  description?: string;
}

/** Options accepted by the @ApTool decorator. */
export interface ApToolOptions {
  description: string;
  id?: string | null;
  inputSchema?: unknown | null;
  outputSchema?: unknown | null;
  annotations?: ApToolAnnotations | null;
  tags?: string[];
  documentation?: string | null;
  examples?: ApToolExample[];
}

/** Options accepted by the @ApModule decorator. */
export interface ApModuleOptions {
  namespace: string;
  description?: string | null;
  tags?: string[];
  annotations?: ApToolAnnotations | null;
}

// ---------------------------------------------------------------------------
// NestJS dynamic-module option types
// ---------------------------------------------------------------------------

/** Options for ApcoreModule.forRoot(). */
export interface ApcoreModuleOptions {
  extensionsDir?: string | null;
  acl?: unknown | null;
  middleware?: unknown[];
  bindings?: string | null;
  /** Optional MCP server configuration. If provided, ApcoreMcpModule is automatically imported. */
  mcp?: ApcoreMcpModuleOptions;
  /** Optional CLI configuration. If provided, ApcoreCliModule is automatically imported. */
  cli?: ApcoreCliModuleOptions;
  /** Optional A2A server configuration. If provided, ApcoreA2aModule is automatically imported. */
  a2a?: ApcoreA2aModuleOptions;
  schema?: {
    adapters?: string[];
    strictOutput?: boolean;
  };
}

/** Async options for ApcoreModule.forRootAsync(). */
export interface ApcoreModuleAsyncOptions {
  imports?: unknown[];
  useFactory: (
    ...args: unknown[]
  ) => Promise<ApcoreModuleOptions> | ApcoreModuleOptions;
  inject?: unknown[];
  /**
   * Static surface configurations — evaluated at module-definition time.
   *
   * Because `useFactory` resolves asynchronously, dynamic-module imports
   * must be decided statically. Provide surface config here rather than
   * returning it from the factory.
   */
  mcp?: ApcoreMcpModuleOptions;
  cli?: ApcoreCliModuleOptions;
  a2a?: ApcoreA2aModuleOptions;
}

/** Options for ApcoreMcpModule.forRoot(). */
export interface ApcoreMcpModuleOptions {
  transport?: 'stdio' | 'streamable-http' | 'sse';
  host?: string;
  port?: number;
  name?: string;
  version?: string;
  tags?: string[] | null;
  prefix?: string | null;
  explorer?: boolean;
  explorerPrefix?: string;
  allowExecute?: boolean;
  explorerTitle?: string;
  explorerProjectName?: string;
  explorerProjectUrl?: string;
  dynamic?: boolean;
  validateInputs?: boolean;
  logLevel?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  onStartup?: () => void | Promise<void>;
  onShutdown?: () => void | Promise<void>;
  metricsCollector?: import('apcore-mcp').MetricsExporter;
  authenticator?: import('apcore-mcp').Authenticator;
  requireAuth?: boolean;
  exemptPaths?: string[];
  approvalHandler?: unknown;
  outputFormatter?: (result: Record<string, unknown>) => string;
}

/** Async options for ApcoreMcpModule.forRootAsync(). */
export interface ApcoreMcpModuleAsyncOptions {
  imports?: unknown[];
  useFactory: (
    ...args: unknown[]
  ) => Promise<ApcoreMcpModuleOptions> | ApcoreMcpModuleOptions;
  inject?: unknown[];
}

/** Options for ApcoreCliModule.forRoot(). */
export interface ApcoreCliModuleOptions {
  /** Path to the extensions directory (default: ./extensions). */
  extensionsDir?: string;
  /** Program name shown in help output (default: inferred from argv). */
  progName?: string;
  /**
   * Show all options in `--help` output, including built-in apcore options.
   * Users can also toggle this at runtime with `--help --verbose`.
   * Default: false.
   */
  verboseHelp?: boolean;
  /**
   * Base URL for online documentation.
   *
   * Per-command help shows `Docs: {url}/commands/{name}`.
   * Man page SEE ALSO includes `Full documentation at {url}`.
   * No default — disabled when not set.
   */
  docsUrl?: string | null;
}

/** Async options for ApcoreCliModule.forRootAsync(). */
export interface ApcoreCliModuleAsyncOptions {
  imports?: unknown[];
  useFactory: (
    ...args: unknown[]
  ) => Promise<ApcoreCliModuleOptions> | ApcoreCliModuleOptions;
  inject?: unknown[];
}

/** Options for ApcoreA2aModule.forRoot(). */
export interface ApcoreA2aModuleOptions {
  /** Agent card name (default: inferred from registry config). */
  name?: string;
  /** Agent card description (default: inferred from registry config). */
  description?: string;
  /** Agent card version (default: inferred from registry config). */
  version?: string;
  /** Public URL of this A2A server (used in the agent card). */
  url?: string;
  /** Host address for the standalone HTTP server. Default: "0.0.0.0". */
  host?: string;
  /**
   * Port for the standalone HTTP server.
   *
   * When set, `ApcoreA2aService` starts a standalone server on
   * `onApplicationBootstrap`. Omit to use `asyncServe()` for embedding.
   */
  port?: number;
  /** Optional Authenticator for request auth. */
  auth?: unknown;
  /** Optional task store for A2A task persistence. */
  taskStore?: unknown;
  /** CORS allowed origins. */
  corsOrigins?: string[];
  /** Enable the A2A explorer UI. Default: false. */
  explorer?: boolean;
  /** URL prefix for the explorer. Default: "/explorer". */
  explorerPrefix?: string;
  /** Execution timeout in milliseconds. Default: 300000 (5 minutes). */
  executionTimeout?: number;
  /** Enable Prometheus /metrics endpoint. Default: false. */
  metrics?: boolean;
  /** Log level for the standalone server. */
  logLevel?: string;
  /** Graceful shutdown timeout in seconds. Default: 30. */
  shutdownTimeout?: number;
}

/** Async options for ApcoreA2aModule.forRootAsync(). */
export interface ApcoreA2aModuleAsyncOptions {
  imports?: unknown[];
  useFactory: (
    ...args: unknown[]
  ) => Promise<ApcoreA2aModuleOptions> | ApcoreA2aModuleOptions;
  inject?: unknown[];
}

// ---------------------------------------------------------------------------
// Internal registration types used by the scanning / bridging layer
// ---------------------------------------------------------------------------

/** Options for registering a single method as an apcore module. */
export interface RegisterMethodOptions {
  instance: object;
  method: string;
  description: string;
  id?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: ApToolAnnotations;
  tags?: string[];
  documentation?: string | null;
  examples?: ApToolExample[];
}

/** Options for registering an entire service (multiple methods) at once. */
export interface RegisterServiceOptions {
  instance: object;
  description?: string;
  methods: string[] | '*';
  exclude?: string[];
  namespace?: string;
  annotations?: ApToolAnnotations;
  tags?: string[];
  methodOptions?: Record<string, Partial<RegisterMethodOptions>>;
}
