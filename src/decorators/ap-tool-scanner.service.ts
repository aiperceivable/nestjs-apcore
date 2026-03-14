import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { normalizeResult } from 'apcore-js';
import { BaseScanner, createScannedModule, enrichSchemaDescriptions } from 'apcore-toolkit';
import type { ScannedModule } from 'apcore-toolkit';
import { ApcoreRegistryService } from '../core/apcore-registry.service.js';
import { SchemaExtractor } from '../schema/schema-extractor.service.js';
import {
  AP_TOOL_METADATA_KEY,
  AP_MODULE_METADATA_KEY,
  AP_CONTEXT_METADATA_KEY,
} from '../constants.js';
import {
  normalizeClassName,
  normalizeMethodName,
  generateModuleId,
} from '../utils/id-generator.js';
import {
  scannedModuleToFunctionModule,
  toModuleAnnotations,
} from '../utils/module-factory.js';
import type { BoundExecuteFn } from '../utils/module-factory.js';
import type { ApToolOptions, ApModuleOptions } from '../types.js';

const logger = new Logger('ApToolScannerService');

/**
 * Try to extract a JSON Schema from the given input using SchemaExtractor.
 * Falls back to the raw value if extraction fails, logging a warning.
 */
function tryExtractJsonSchema(
  extractor: SchemaExtractor,
  input: unknown,
  moduleId: string,
  field: string,
): Record<string, unknown> {
  try {
    return extractor.extractJsonSchema(input);
  } catch (err) {
    logger.warn(
      `Failed to extract ${field} for "${moduleId}": ${err instanceof Error ? err.message : String(err)}. ` +
      'Falling back to raw value.',
    );
    if (input != null && typeof input === 'object') {
      return input as Record<string, unknown>;
    }
    return { type: 'object', properties: {} };
  }
}

/**
 * Options for controlling the scan behaviour.
 */
export interface ScanOptions {
  /** Regex pattern — only register modules whose ID matches. */
  include?: string;
  /** Regex pattern — skip modules whose ID matches. */
  exclude?: string;
}

/**
 * NestJS service that auto-discovers and registers `@ApTool` decorated
 * methods at module initialization time.
 *
 * Extends apcore-toolkit's {@link BaseScanner} to leverage shared scanning
 * utilities (filterModules, deduplicateIds, extractDocstring,
 * enrichSchemaDescriptions) and produce standardised {@link ScannedModule}
 * intermediates before registration.
 */
@Injectable()
export class ApToolScannerService extends BaseScanner implements OnModuleInit {
  private readonly schemaExtractor = new SchemaExtractor();
  private _scanOptions: ScanOptions = {};

  /**
   * Parallel map keyed by moduleId that holds the bound execute functions.
   * Kept separate from ScannedModule.metadata so that `scan()` produces
   * clean, serialisable intermediates without leaking closures.
   */
  private readonly _executeFns = new Map<string, BoundExecuteFn>();

  constructor(
    @Inject(ApcoreRegistryService)
    private readonly registry: ApcoreRegistryService,
    @Inject(ModulesContainer)
    private readonly modulesContainer: ModulesContainer,
  ) {
    super();
  }

  /** Configure include/exclude filters applied during scanAndRegister(). */
  setScanOptions(options: ScanOptions): void {
    this._scanOptions = options;
  }

  getSourceName(): string {
    return 'nestjs-decorators';
  }

  onModuleInit(): void {
    this.scanAndRegister();
  }

  /**
   * Scan all NestJS providers for @ApTool decorated methods.
   *
   * Returns ScannedModule[] (the apcore-toolkit standard intermediate)
   * without registering — useful for inspection, filtering, or serialisation.
   *
   * Execute functions are stored in a parallel map accessible via
   * {@link getExecuteFn} rather than embedded in metadata.
   */
  scan(): ScannedModule[] {
    this._executeFns.clear();
    const modules: ScannedModule[] = [];

    for (const nestModule of this.modulesContainer.values()) {
      for (const wrapper of nestModule.providers.values()) {
        const instance = wrapper.instance;
        const metatype = wrapper.metatype;

        if (!instance || !metatype || typeof metatype !== 'function') {
          continue;
        }

        modules.push(
          ...this.scanProvider(instance, metatype as new (...args: any[]) => any),
        );
      }
    }

    return this.deduplicateIds(modules);
  }

  /**
   * Retrieve the bound execute function for a scanned module.
   *
   * Available after {@link scan} has been called. Returns `undefined` if
   * the moduleId was not discovered during the last scan.
   */
  getExecuteFn(moduleId: string): BoundExecuteFn | undefined {
    return this._executeFns.get(moduleId);
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /**
   * Scan, deduplicate, filter, then register all discovered modules.
   */
  private scanAndRegister(): void {
    let scannedModules = this.scan();

    // Apply include/exclude filtering via inherited BaseScanner.filterModules()
    if (this._scanOptions.include || this._scanOptions.exclude) {
      scannedModules = this.filterModules(scannedModules, this._scanOptions);
    }

    for (const mod of scannedModules) {
      const execute = this._executeFns.get(mod.moduleId);
      if (typeof execute !== 'function') {
        logger.error(
          `No execute function found for module "${mod.moduleId}" — skipping registration.`,
        );
        continue;
      }

      const fm = scannedModuleToFunctionModule(mod, execute);
      this.registry.register(mod.moduleId, fm);
    }
  }

  /**
   * Scan a single provider instance for @ApTool decorated methods.
   */
  private scanProvider(
    instance: object,
    metatype: new (...args: any[]) => any,
  ): ScannedModule[] {
    const results: ScannedModule[] = [];

    const moduleOptions: ApModuleOptions | undefined =
      Reflect.getMetadata(AP_MODULE_METADATA_KEY, metatype);

    const namespace =
      moduleOptions?.namespace ?? normalizeClassName(metatype.name);

    const prototype = Object.getPrototypeOf(instance) as object;
    if (!prototype) return results;

    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      (name) => {
        if (name === 'constructor') return false;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
        return descriptor !== undefined && typeof descriptor.value === 'function';
      },
    );

    for (const methodName of methodNames) {
      const toolOptions: ApToolOptions | undefined = Reflect.getMetadata(
        AP_TOOL_METADATA_KEY,
        prototype,
        methodName,
      );

      if (!toolOptions) continue;

      const contextIndex: number | undefined = Reflect.getMetadata(
        AP_CONTEXT_METADATA_KEY,
        prototype,
        methodName,
      );

      const normalizedMethod = normalizeMethodName(methodName);
      const moduleId: string =
        toolOptions.id ?? generateModuleId(namespace, normalizedMethod);

      // Extract schemas to JSON Schema (toolkit standard)
      let inputSchema: Record<string, unknown> = { type: 'object', properties: {} };
      let outputSchema: Record<string, unknown> = { type: 'object', properties: {} };

      if (toolOptions.inputSchema != null) {
        inputSchema = tryExtractJsonSchema(
          this.schemaExtractor,
          toolOptions.inputSchema,
          moduleId,
          'inputSchema',
        );
      }

      if (toolOptions.outputSchema != null) {
        outputSchema = tryExtractJsonSchema(
          this.schemaExtractor,
          toolOptions.outputSchema,
          moduleId,
          'outputSchema',
        );
      }

      // Use toolkit's extractDocstring() to auto-fill documentation and
      // enrich input schema descriptions from JSDoc @param tags when the
      // decorator doesn't provide them explicitly.
      const fn = (instance as Record<string, Function>)[methodName]!;
      let documentation = toolOptions.documentation ?? null;

      const docstring = this.extractDocstring(fn);
      if (documentation == null && docstring.documentation != null) {
        documentation = docstring.documentation;
      }

      // Merge JSDoc @param descriptions into input schema properties via toolkit
      if (Object.keys(docstring.params).length > 0) {
        inputSchema = enrichSchemaDescriptions(inputSchema, docstring.params);
      }

      // Build the bound execute function
      const execute: BoundExecuteFn = async (
        inputs: Record<string, unknown>,
        context: unknown,
      ): Promise<Record<string, unknown>> => {
        let raw: unknown;

        if (contextIndex != null) {
          const args: unknown[] = [];
          if (contextIndex === 0) {
            args[0] = context;
            args[1] = inputs;
          } else {
            args[0] = inputs;
            args[contextIndex] = context;
          }
          raw = await fn.call(instance, ...args);
        } else {
          raw = await fn.call(instance, inputs);
        }

        return normalizeResult(raw);
      };

      // Store execute fn in parallel map (not in ScannedModule.metadata)
      this._executeFns.set(moduleId, execute);

      results.push(
        createScannedModule({
          moduleId,
          description: toolOptions.description,
          inputSchema,
          outputSchema,
          tags: toolOptions.tags ?? [],
          target: `${metatype.name}.${methodName}`,
          annotations: toModuleAnnotations(toolOptions.annotations),
          documentation,
          examples: toolOptions.examples ?? [],
        }),
      );
    }

    return results;
  }
}
