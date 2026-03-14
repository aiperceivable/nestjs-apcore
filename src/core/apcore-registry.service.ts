import { Injectable } from '@nestjs/common';
import { normalizeResult } from 'apcore-js';
import type { Registry } from 'apcore-js';
import type { ModuleDescriptor } from 'apcore-js';
import { createScannedModule, moduleToDict, modulesToDicts } from 'apcore-toolkit';
import type { ScannedModule } from 'apcore-toolkit';
import type { RegisterMethodOptions, RegisterServiceOptions } from '../types.js';
import {
  normalizeClassName,
  normalizeMethodName,
  generateModuleId,
} from '../utils/id-generator.js';
import {
  scannedModuleToFunctionModule,
  toModuleAnnotations,
} from '../utils/module-factory.js';

/**
 * Collect all own method names from a prototype chain up to (but not
 * including) Object.prototype. Excludes 'constructor'.
 */
function getAllMethodNames(instance: object): string[] {
  const methods = new Set<string>();
  let proto: object | null = Object.getPrototypeOf(instance) as object | null;

  while (proto && proto !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (
        name !== 'constructor' &&
        typeof (proto as Record<string, unknown>)[name] === 'function'
      ) {
        methods.add(name);
      }
    }
    proto = Object.getPrototypeOf(proto) as object | null;
  }

  return [...methods];
}

/**
 * NestJS-injectable service that wraps an upstream apcore-js Registry,
 * delegating core operations and adding convenience methods for
 * registering NestJS service methods via apcore-toolkit's ScannedModule
 * intermediate representation.
 */
@Injectable()
export class ApcoreRegistryService {
  constructor(private readonly registry: Registry) {}

  // ---- raw access ----

  /** Return the underlying apcore-js Registry instance. */
  get raw(): Registry {
    return this.registry;
  }

  // ---- delegated methods ----

  register(moduleId: string, module: unknown): void {
    this.registry.register(moduleId, module);
  }

  unregister(moduleId: string): boolean {
    return this.registry.unregister(moduleId);
  }

  get(moduleId: string): unknown | null {
    return this.registry.get(moduleId);
  }

  has(moduleId: string): boolean {
    return this.registry.has(moduleId);
  }

  list(options?: { tags?: string[]; prefix?: string }): string[] {
    return this.registry.list(options);
  }

  getDefinition(moduleId: string): ModuleDescriptor | null {
    return this.registry.getDefinition(moduleId);
  }

  on(
    event: string,
    callback: (moduleId: string, module: unknown) => void,
  ): void {
    this.registry.on(event, callback);
  }

  discover(): Promise<number> {
    return this.registry.discover();
  }

  get count(): number {
    return this.registry.count;
  }

  // ---- serialisation helpers (via apcore-toolkit) ----

  /**
   * Convert a registered module's descriptor to a toolkit ScannedModule.
   *
   * Returns `null` if the module is not found.
   */
  toScannedModule(moduleId: string): ScannedModule | null {
    const def = this.registry.getDefinition(moduleId);
    if (!def) return null;

    return createScannedModule({
      moduleId: def.moduleId,
      description: def.description,
      inputSchema: def.inputSchema as Record<string, unknown>,
      outputSchema: def.outputSchema as Record<string, unknown>,
      tags: (def.tags as string[]) ?? [],
      target: moduleId,
      annotations: def.annotations ?? null,
      documentation: def.documentation ?? null,
      examples: (def.examples ?? []) as any[],
      metadata: def.metadata ?? {},
    });
  }

  /**
   * Serialise a registered module to a plain snake_case dictionary
   * via apcore-toolkit's `moduleToDict()`.
   *
   * Returns `null` if the module is not found.
   */
  toDict(moduleId: string): Record<string, unknown> | null {
    const scanned = this.toScannedModule(moduleId);
    if (!scanned) return null;
    return moduleToDict(scanned);
  }

  /**
   * Serialise all registered modules (optionally filtered by tags/prefix)
   * to an array of snake_case dictionaries via apcore-toolkit.
   */
  toDicts(options?: { tags?: string[]; prefix?: string }): Record<string, unknown>[] {
    const ids = this.registry.list(options);
    const scanned: ScannedModule[] = [];
    for (const id of ids) {
      const s = this.toScannedModule(id);
      if (s) scanned.push(s);
    }
    return modulesToDicts(scanned);
  }

  // ---- NestJS convenience methods ----

  /**
   * Register a single method from a service instance as a FunctionModule.
   *
   * Produces a toolkit {@link ScannedModule} intermediate, then converts it
   * to a FunctionModule with the method bound to the service instance.
   *
   * @returns The module ID under which the method was registered.
   */
  registerMethod(options: RegisterMethodOptions): string {
    const {
      instance,
      method,
      description,
      id,
      inputSchema,
      outputSchema,
      annotations,
      tags,
      documentation,
      examples,
    } = options;

    // Validate the method exists on the instance
    const fn = (instance as Record<string, unknown>)[method];
    if (typeof fn !== 'function') {
      throw new Error(
        `Method "${method}" does not exist on ${instance.constructor.name}`,
      );
    }

    const className = instance.constructor.name;
    const moduleId = generateModuleId(className, method, true, id);

    // Build ScannedModule intermediate via toolkit
    const scanned = createScannedModule({
      moduleId,
      description,
      inputSchema: (inputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} },
      outputSchema: (outputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} },
      tags: tags ?? [],
      target: `${className}.${method}`,
      annotations: toModuleAnnotations(annotations),
      documentation: documentation ?? null,
      examples: examples ?? [],
    });

    // Bound execute function using normalizeResult from apcore-js
    const execute = async (inputs: Record<string, unknown>) => {
      const raw = await (fn as Function).call(instance, inputs);
      return normalizeResult(raw);
    };

    const fm = scannedModuleToFunctionModule(scanned, execute);
    this.registry.register(moduleId, fm);
    return moduleId;
  }

  /**
   * Register multiple methods from a service instance as FunctionModules.
   *
   * When `methods` is `'*'`, all public methods are discovered via
   * prototype inspection (excluding 'constructor' and any names in the
   * `exclude` array).
   *
   * @returns An array of module IDs that were registered.
   */
  registerService(options: RegisterServiceOptions): string[] {
    const {
      instance,
      description,
      methods,
      exclude = [],
      namespace,
      annotations,
      tags,
      methodOptions = {},
    } = options;

    // Determine which methods to register
    let methodNames: string[];

    if (methods === '*') {
      methodNames = getAllMethodNames(instance).filter(
        (name) => !exclude.includes(name),
      );
    } else {
      methodNames = methods.filter((name) => !exclude.includes(name));
    }

    const registeredIds: string[] = [];

    for (const methodName of methodNames) {
      const perMethodOpts = methodOptions[methodName] ?? {};

      // Build the namespace: explicit namespace > normalized class name
      const ns =
        namespace ?? normalizeClassName(instance.constructor.name);
      const normalizedMethod = normalizeMethodName(methodName);

      const methodDesc =
        perMethodOpts.description ?? description ?? `${methodName}`;

      const moduleId = perMethodOpts.id ?? `${ns}.${normalizedMethod}`;

      const id = this.registerMethod({
        instance,
        method: methodName,
        description: methodDesc,
        id: moduleId,
        inputSchema: perMethodOpts.inputSchema,
        outputSchema: perMethodOpts.outputSchema,
        annotations: perMethodOpts.annotations ?? annotations,
        tags: perMethodOpts.tags ?? tags,
        documentation: perMethodOpts.documentation,
        examples: perMethodOpts.examples,
      });

      registeredIds.push(id);
    }

    return registeredIds;
  }
}
