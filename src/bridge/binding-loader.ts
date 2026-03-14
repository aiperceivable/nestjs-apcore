import { Injectable, Inject, Optional } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { normalizeResult } from 'apcore-js';
import { createScannedModule } from 'apcore-toolkit';
import { ApcoreRegistryService } from '../core/apcore-registry.service.js';
import {
  scannedModuleToFunctionModule,
  toModuleAnnotations,
} from '../utils/module-factory.js';

/**
 * Shape of a single binding entry parsed from YAML.
 */
interface BindingEntry {
  module_id: string;
  target: string;
  description: string;
  input_schema?: unknown;
  output_schema?: unknown;
  annotations?: Record<string, unknown>;
  tags?: string[];
  documentation?: string;
}

/**
 * Top-level structure of the bindings YAML file.
 */
interface BindingsFile {
  bindings: BindingEntry[];
}

/**
 * A function that resolves a class name to a service instance.
 */
export type InstanceProvider = (className: string) => object | undefined;

/**
 * NestJS injectable service that loads YAML binding files and registers
 * modules with the ApcoreRegistryService.
 *
 * Uses apcore-toolkit's {@link createScannedModule} to produce standardised
 * intermediates, then converts to FunctionModule via the shared factory.
 */
@Injectable()
export class ApBindingLoader {
  constructor(
    @Inject(ApcoreRegistryService)
    private readonly registry: ApcoreRegistryService,
    @Optional()
    @Inject('APCORE_INSTANCE_PROVIDER')
    private readonly instanceProvider?: InstanceProvider,
  ) {}

  /**
   * Parse YAML content describing bindings and register each as a
   * FunctionModule with the registry.
   *
   * @param content - Raw YAML string
   * @returns Array of registered module IDs
   */
  loadFromString(content: string): string[] {
    const parsed = yaml.load(content) as BindingsFile;
    const bindings = parsed?.bindings ?? [];
    const ids: string[] = [];

    for (const binding of bindings) {
      const moduleId = binding.module_id;
      const [className, methodName] = binding.target.split('.');

      // Attempt to resolve the service instance
      let instance: object | undefined;
      if (this.instanceProvider) {
        instance = this.instanceProvider(className);
      }

      // Build the bound execute function
      let execute: (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;

      if (instance && methodName in instance) {
        execute = async (inputs: Record<string, unknown>) => {
          const raw = await (instance as Record<string, Function>)[methodName](inputs);
          return normalizeResult(raw);
        };
      } else {
        execute = async () => {
          return {
            error: `No instance available for ${className}.${methodName}`,
          };
        };
      }

      // Build ScannedModule intermediate via toolkit
      const scanned = createScannedModule({
        moduleId,
        description: binding.description,
        inputSchema: (binding.input_schema as Record<string, unknown>) ?? { type: 'object', properties: {} },
        outputSchema: (binding.output_schema as Record<string, unknown>) ?? { type: 'object', properties: {} },
        tags: binding.tags ?? [],
        target: binding.target,
        annotations: toModuleAnnotations(binding.annotations as any),
        documentation: binding.documentation ?? null,
      });

      const fm = scannedModuleToFunctionModule(scanned, execute);
      this.registry.register(moduleId, fm);
      ids.push(moduleId);
    }

    return ids;
  }

  /**
   * Read a YAML file from disk and register its bindings.
   *
   * @param filePath - Absolute or relative path to the YAML file
   * @returns Array of registered module IDs
   */
  async loadFromFile(filePath: string): Promise<string[]> {
    const content = await readFile(filePath, 'utf-8');
    return this.loadFromString(content);
  }
}
