import { Injectable, Inject } from '@nestjs/common';
import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { serve, asyncServe } from 'apcore-a2a';
import { ApcoreRegistryService } from '../core/apcore-registry.service.js';
import { ApcoreExecutorService } from '../core/apcore-executor.service.js';
import { APCORE_A2A_MODULE_OPTIONS } from '../constants.js';
import type { ApcoreA2aModuleOptions } from '../types.js';

/**
 * NestJS service that manages the A2A (Agent-to-Agent) server lifecycle.
 *
 * Wraps `serve()` and `asyncServe()` from `apcore-a2a`, integrating them with
 * NestJS lifecycle hooks for automatic startup/shutdown.
 *
 * **Standalone HTTP server** — set `port` in module options. The server starts
 * automatically on `onApplicationBootstrap`.
 *
 * **Embedded Express app** — call `asyncServe()` to get an Express application
 * and mount it in your NestJS HTTP server:
 *
 * @example
 * ```ts
 * // In a NestJS bootstrap file:
 * const a2aApp = await a2aService.asyncServe();
 * app.use('/a2a', a2aApp);
 * ```
 */
@Injectable()
export class ApcoreA2aService implements OnApplicationBootstrap, OnModuleDestroy {
  private _isRunning = false;

  constructor(
    @Inject(ApcoreRegistryService)
    private readonly registry: ApcoreRegistryService,
    @Inject(ApcoreExecutorService)
    private readonly executor: ApcoreExecutorService,
    @Inject(APCORE_A2A_MODULE_OPTIONS)
    private readonly options: ApcoreA2aModuleOptions,
  ) {}

  // -------------------------------------------------------------------------
  // Properties
  // -------------------------------------------------------------------------

  /** Whether the standalone A2A HTTP server is currently running. */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /** Number of skills (modules) exposed to A2A clients. */
  get skillCount(): number {
    return this.registry.list().length;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Start a standalone A2A HTTP server with the configured options.
   *
   * Automatically called on `onApplicationBootstrap` when `port` is set.
   */
  start(): void {
    this._isRunning = true;

    serve(this.executor.raw, {
      name: this.options.name,
      description: this.options.description,
      version: this.options.version,
      url: this.options.url,
      host: this.options.host,
      port: this.options.port,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      auth: this.options.auth as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskStore: this.options.taskStore as any,
      corsOrigins: this.options.corsOrigins,
      explorer: this.options.explorer,
      explorerPrefix: this.options.explorerPrefix,
      executionTimeout: this.options.executionTimeout,
      metrics: this.options.metrics,
      logLevel: this.options.logLevel,
      shutdownTimeout: this.options.shutdownTimeout,
    });
  }

  /**
   * Build an embeddable Express application without starting a standalone server.
   *
   * Mount the returned app in your NestJS HTTP server or Express middleware chain.
   */
  async asyncServe(overrides?: Partial<ApcoreA2aModuleOptions>): Promise<unknown> {
    const opts = { ...this.options, ...overrides };

    return asyncServe(this.executor.raw, {
      name: opts.name,
      description: opts.description,
      version: opts.version,
      url: opts.url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      auth: opts.auth as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskStore: opts.taskStore as any,
      corsOrigins: opts.corsOrigins,
      explorer: opts.explorer,
      explorerPrefix: opts.explorerPrefix,
      executionTimeout: opts.executionTimeout,
      metrics: opts.metrics,
    });
  }

  /** Stop tracking the running state (the underlying HTTP server manages its own lifecycle). */
  stop(): void {
    this._isRunning = false;
  }

  // -------------------------------------------------------------------------
  // NestJS lifecycle hooks
  // -------------------------------------------------------------------------

  /**
   * Auto-starts the standalone A2A server when `port` is configured.
   *
   * Uses `OnApplicationBootstrap` so all modules registered during
   * `onModuleInit` are available before the server starts.
   */
  onApplicationBootstrap(): void {
    if (this.options.port !== undefined) {
      this.start();
    }
  }

  /** Marks the service as stopped on module destruction. */
  onModuleDestroy(): void {
    if (this._isRunning) {
      this.stop();
    }
  }
}
