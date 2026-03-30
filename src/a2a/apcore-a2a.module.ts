import { Module } from '@nestjs/common';
import type { DynamicModule, InjectionToken } from '@nestjs/common';
import { ApcoreRegistryService } from '../core/apcore-registry.service.js';
import { ApcoreExecutorService } from '../core/apcore-executor.service.js';
import { ApcoreA2aService } from './apcore-a2a.service.js';
import { APCORE_A2A_MODULE_OPTIONS } from '../constants.js';
import type {
  ApcoreA2aModuleOptions,
  ApcoreA2aModuleAsyncOptions,
} from '../types.js';

/**
 * NestJS dynamic module for A2A (Agent-to-Agent) server integration.
 *
 * Provides {@link ApcoreA2aService} for serving the registered apcore modules
 * as A2A skills. Supports both a standalone HTTP server (set `port` in options)
 * and an embedded Express app (via `service.asyncServe()`).
 *
 * Requires {@link ApcoreRegistryService} and {@link ApcoreExecutorService} in
 * the injection context (typically via importing `ApcoreModule`).
 */
@Module({})
export class ApcoreA2aModule {
  /** Synchronous configuration. */
  static forRoot(options: ApcoreA2aModuleOptions = {}): DynamicModule {
    return {
      module: ApcoreA2aModule,
      providers: [
        { provide: APCORE_A2A_MODULE_OPTIONS, useValue: options },
        {
          provide: ApcoreA2aService,
          useFactory: (
            registry: ApcoreRegistryService,
            executor: ApcoreExecutorService,
          ) => new ApcoreA2aService(registry, executor, options),
          inject: [ApcoreRegistryService, ApcoreExecutorService],
        },
      ],
      exports: [ApcoreA2aService, APCORE_A2A_MODULE_OPTIONS],
    };
  }

  /** Asynchronous configuration using `useFactory` / `inject`. */
  static forRootAsync(options: ApcoreA2aModuleAsyncOptions): DynamicModule {
    return {
      module: ApcoreA2aModule,
      imports: (options.imports ?? []) as DynamicModule[],
      providers: [
        {
          provide: APCORE_A2A_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: (options.inject ?? []) as InjectionToken[],
        },
        {
          provide: ApcoreA2aService,
          useFactory: (
            opts: ApcoreA2aModuleOptions,
            registry: ApcoreRegistryService,
            executor: ApcoreExecutorService,
          ) => new ApcoreA2aService(registry, executor, opts),
          inject: [
            APCORE_A2A_MODULE_OPTIONS,
            ApcoreRegistryService,
            ApcoreExecutorService,
          ],
        },
      ],
      exports: [ApcoreA2aService, APCORE_A2A_MODULE_OPTIONS],
    };
  }
}
