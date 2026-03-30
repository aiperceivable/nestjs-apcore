import { Global, Module } from '@nestjs/common';
import type { DynamicModule, InjectionToken } from '@nestjs/common';
import { Registry, Executor } from 'apcore-js';
import type { ACL, Middleware } from 'apcore-js';
import { ApcoreRegistryService } from './apcore-registry.service.js';
import { ApcoreExecutorService } from './apcore-executor.service.js';
import { ApToolScannerService } from '../decorators/ap-tool-scanner.service.js';
import { ApcoreMcpModule } from '../mcp/apcore-mcp.module.js';
import { ApcoreCliModule } from '../cli/apcore-cli.module.js';
import { ApcoreA2aModule } from '../a2a/apcore-a2a.module.js';
import { APCORE_MODULE_OPTIONS } from '../constants.js';
import type {
  ApcoreModuleOptions,
  ApcoreModuleAsyncOptions,
} from '../types.js';

/**
 * Main NestJS dynamic module for the apcore ecosystem.
 *
 * Marked `@Global()` so that {@link ApcoreRegistryService} and
 * {@link ApcoreExecutorService} are available application-wide without
 * importing this module into every feature module.
 *
 * Now also handles automatic tool discovery via {@link ApToolScannerService}
 * and optional MCP server integration.
 */
@Global()
@Module({})
export class ApcoreModule {
  /**
   * Synchronous configuration.
   *
   * Creates an upstream `Registry` and `Executor` from the supplied options,
   * wraps them in NestJS-injectable services, and exports them together with
   * the raw options token.
   */
  static forRoot(options: ApcoreModuleOptions = {}): DynamicModule {
    const registry = new Registry({
      extensionsDir: options.extensionsDir ?? null,
    });

    const executor = new Executor({
      registry,
      acl: (options.acl as ACL | null) ?? null,
      middlewares: (options.middleware as Middleware[]) ?? null,
    });

    const registryService = new ApcoreRegistryService(registry);
    const executorService = new ApcoreExecutorService(executor);

    const imports: any[] = [];
    if (options.mcp) {
      imports.push(ApcoreMcpModule.forRoot(options.mcp));
    }
    if (options.cli) {
      imports.push(ApcoreCliModule.forRoot(options.cli));
    }
    if (options.a2a) {
      imports.push(ApcoreA2aModule.forRoot(options.a2a));
    }

    return {
      module: ApcoreModule,
      imports,
      providers: [
        { provide: APCORE_MODULE_OPTIONS, useValue: options },
        { provide: ApcoreRegistryService, useValue: registryService },
        { provide: ApcoreExecutorService, useValue: executorService },
        ApToolScannerService,
      ],
      exports: [
        APCORE_MODULE_OPTIONS,
        ApcoreRegistryService,
        ApcoreExecutorService,
        ApToolScannerService,
      ],
    };
  }

  /**
   * Asynchronous configuration using the `useFactory` / `inject` pattern.
   *
   * Supports an `imports` array so that injected dependencies (e.g. a
   * ConfigService) are available to the factory function.
   */
  static forRootAsync(options: ApcoreModuleAsyncOptions): DynamicModule {
    const imports: any[] = [...(options.imports ?? [])];
    if (options.mcp) {
      imports.push(ApcoreMcpModule.forRoot(options.mcp));
    }
    if (options.cli) {
      imports.push(ApcoreCliModule.forRoot(options.cli));
    }
    if (options.a2a) {
      imports.push(ApcoreA2aModule.forRoot(options.a2a));
    }

    return {
      module: ApcoreModule,
      imports,
      providers: [
        {
          provide: APCORE_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: (options.inject ?? []) as InjectionToken[],
        },
        {
          provide: ApcoreRegistryService,
          useFactory: (opts: ApcoreModuleOptions) => {
            const registry = new Registry({
              extensionsDir: opts.extensionsDir ?? null,
            });
            return new ApcoreRegistryService(registry);
          },
          inject: [APCORE_MODULE_OPTIONS],
        },
        {
          provide: ApcoreExecutorService,
          useFactory: (
            opts: ApcoreModuleOptions,
            registryService: ApcoreRegistryService,
          ) => {
            const executor = new Executor({
              registry: registryService.raw,
              acl: (opts.acl as ACL | null) ?? null,
              middlewares: (opts.middleware as Middleware[]) ?? null,
            });
            return new ApcoreExecutorService(executor);
          },
          inject: [APCORE_MODULE_OPTIONS, ApcoreRegistryService],
        },
        ApToolScannerService,
      ],
      exports: [
        APCORE_MODULE_OPTIONS,
        ApcoreRegistryService,
        ApcoreExecutorService,
        ApToolScannerService,
      ],
    };
  }
}
