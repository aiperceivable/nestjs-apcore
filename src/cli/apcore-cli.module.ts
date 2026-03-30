import { Module } from '@nestjs/common';
import type { DynamicModule, InjectionToken } from '@nestjs/common';
import { ApcoreRegistryService } from '../core/apcore-registry.service.js';
import { ApcoreCliService } from './apcore-cli.service.js';
import { APCORE_CLI_MODULE_OPTIONS } from '../constants.js';
import type {
  ApcoreCliModuleOptions,
  ApcoreCliModuleAsyncOptions,
} from '../types.js';

/**
 * NestJS dynamic module for apcore-cli integration.
 *
 * Provides {@link ApcoreCliService} for building Commander programs, generating
 * man pages, and configuring `--help --man` / `--help --verbose` support.
 *
 * Requires {@link ApcoreRegistryService} in the injection context
 * (typically via importing `ApcoreModule`).
 */
@Module({})
export class ApcoreCliModule {
  /** Synchronous configuration. */
  static forRoot(options: ApcoreCliModuleOptions = {}): DynamicModule {
    return {
      module: ApcoreCliModule,
      providers: [
        { provide: APCORE_CLI_MODULE_OPTIONS, useValue: options },
        {
          provide: ApcoreCliService,
          useFactory: (registry: ApcoreRegistryService) =>
            new ApcoreCliService(registry, options),
          inject: [ApcoreRegistryService],
        },
      ],
      exports: [ApcoreCliService, APCORE_CLI_MODULE_OPTIONS],
    };
  }

  /** Asynchronous configuration using `useFactory` / `inject`. */
  static forRootAsync(options: ApcoreCliModuleAsyncOptions): DynamicModule {
    return {
      module: ApcoreCliModule,
      imports: (options.imports ?? []) as DynamicModule[],
      providers: [
        {
          provide: APCORE_CLI_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: (options.inject ?? []) as InjectionToken[],
        },
        {
          provide: ApcoreCliService,
          useFactory: (
            opts: ApcoreCliModuleOptions,
            registry: ApcoreRegistryService,
          ) => new ApcoreCliService(registry, opts),
          inject: [APCORE_CLI_MODULE_OPTIONS, ApcoreRegistryService],
        },
      ],
      exports: [ApcoreCliService, APCORE_CLI_MODULE_OPTIONS],
    };
  }
}
