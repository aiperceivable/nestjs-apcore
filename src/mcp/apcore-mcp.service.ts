import { Injectable, Inject } from '@nestjs/common';
import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { serve, asyncServe, toOpenaiTools } from 'apcore-mcp';
import type { OpenAIToolDef, AsyncServeApp } from 'apcore-mcp';
import { ApcoreRegistryService } from '../core/apcore-registry.service.js';
import { ApcoreExecutorService } from '../core/apcore-executor.service.js';
import { APCORE_MCP_MODULE_OPTIONS } from '../constants.js';
import type { ApcoreMcpModuleOptions } from '../types.js';

/** Keys shared between serve() and asyncServe() option forwarding. */
const SHARED_OPTION_KEYS = [
  'name', 'version', 'tags', 'prefix', 'validateInputs', 'logLevel',
  'metricsCollector', 'authenticator', 'requireAuth', 'exemptPaths',
  'approvalHandler', 'outputFormatter',
] as const;

/** Keys only used by serve() (transport-specific). */
const SERVE_ONLY_KEYS = [
  'transport', 'host', 'port', 'explorer', 'explorerPrefix', 'allowExecute',
  'dynamic', 'onStartup', 'onShutdown', 'explorerTitle',
  'explorerProjectName', 'explorerProjectUrl',
] as const;

/**
 * NestJS service that manages the MCP (Model Context Protocol) server lifecycle.
 *
 * Wraps the `serve()`, `asyncServe()`, and `toOpenaiTools()` functions from
 * `apcore-mcp`, integrating them with NestJS lifecycle hooks for automatic
 * startup/shutdown.
 */
@Injectable()
export class ApcoreMcpService implements OnApplicationBootstrap, OnModuleDestroy {
  private _isRunning = false;

  constructor(
    @Inject(ApcoreRegistryService)
    private readonly registry: ApcoreRegistryService,
    @Inject(ApcoreExecutorService)
    private readonly executor: ApcoreExecutorService,
    @Inject(APCORE_MCP_MODULE_OPTIONS)
    private readonly options: ApcoreMcpModuleOptions,
  ) {}

  // -----------------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------------

  /** Whether the MCP server is currently running. */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Number of tools available in the registry, filtered by the module-level
   * `tags` and `prefix` options when provided.
   */
  get toolCount(): number {
    return this.registry.list({
      tags: this.options.tags ?? undefined,
      prefix: this.options.prefix ?? undefined,
    }).length;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /** Starts the MCP server using the configured transport and options. */
  async start(): Promise<void> {
    this._isRunning = true;

    const serveOptions = {
      ...this.collectOptions(SHARED_OPTION_KEYS),
      ...this.collectOptions(SERVE_ONLY_KEYS),
    };

    await serve(this.executor.raw, serveOptions);
  }

  /**
   * Build an embeddable HTTP request handler without starting a standalone server.
   *
   * Returns an `AsyncServeApp` with `handler` and `close` methods, suitable for
   * mounting into Express, Fastify, or any Node HTTP framework.
   */
  async asyncServe(options?: {
    endpoint?: string;
    explorer?: boolean;
    explorerPrefix?: string;
    allowExecute?: boolean;
  }): Promise<AsyncServeApp> {
    const asyncOptions: Record<string, unknown> = {
      ...this.collectOptions(SHARED_OPTION_KEYS),
    };

    // Forward per-call options
    if (options?.endpoint !== undefined) asyncOptions.endpoint = options.endpoint;
    if (options?.explorer !== undefined) asyncOptions.explorer = options.explorer;
    if (options?.explorerPrefix !== undefined) asyncOptions.explorerPrefix = options.explorerPrefix;
    if (options?.allowExecute !== undefined) asyncOptions.allowExecute = options.allowExecute;

    return asyncServe(this.executor.raw, asyncOptions);
  }

  /** Stops the MCP server. */
  async stop(): Promise<void> {
    this._isRunning = false;
  }

  /** Restarts the MCP server (stop, then start). */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  // -----------------------------------------------------------------------
  // Tool conversion
  // -----------------------------------------------------------------------

  /**
   * Convert the registered tools to OpenAI-compatible tool definitions.
   *
   * Delegates to `toOpenaiTools()` from `apcore-mcp`.
   */
  toOpenaiTools(options?: {
    embedAnnotations?: boolean;
    strict?: boolean;
    tags?: string[];
    prefix?: string;
  }): OpenAIToolDef[] {
    return toOpenaiTools(this.executor.raw, options);
  }

  // -----------------------------------------------------------------------
  // NestJS lifecycle hooks
  // -----------------------------------------------------------------------

  /**
   * Auto-starts the MCP server when a transport is configured.
   *
   * Uses `OnApplicationBootstrap` (not `OnModuleInit`) so that all
   * tools registered via decorators, programmatic calls, or YAML
   * bindings during `onModuleInit` are available before the server starts.
   */
  async onApplicationBootstrap(): Promise<void> {
    if (this.options.transport) {
      await this.start();
    }
  }

  /** Auto-stops the MCP server on module destruction. */
  async onModuleDestroy(): Promise<void> {
    if (this._isRunning) {
      await this.stop();
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Collect defined option values from this.options for the given keys.
   * Only includes keys whose values are not `undefined`.
   */
  private collectOptions(
    keys: readonly string[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const value = (this.options as Record<string, unknown>)[key];
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }
}
