import { FunctionModule, DEFAULT_ANNOTATIONS, jsonSchemaToTypeBox } from 'apcore-js';
import type { ModuleAnnotations, ModuleExample } from 'apcore-js';
import type { ScannedModule } from 'apcore-toolkit';
import type { ApToolAnnotations } from '../types.js';

/**
 * Execute function signature for NestJS-bound modules.
 *
 * Unlike apcore-toolkit's RegistryWriter (which resolves targets via dynamic
 * import), NestJS modules are already instantiated — we receive a pre-bound
 * execute function directly.
 */
export type BoundExecuteFn = (
  inputs: Record<string, unknown>,
  context: unknown,
) => Promise<Record<string, unknown>> | Record<string, unknown>;

/**
 * Wire (snake_case) annotation names mapped to their camelCase field names.
 *
 * Decorator/programmatic callers use camelCase, while binding YAML follows
 * apcore's snake_case wire spelling. Both are accepted so a binding file does
 * not silently lose governance fields such as `requires_approval`.
 */
const WIRE_ANNOTATION_KEYS: Record<string, keyof ApToolAnnotations> = {
  requires_approval: 'requiresApproval',
  open_world: 'openWorld',
  cache_ttl: 'cacheTtl',
  cache_key_fields: 'cacheKeyFields',
  pagination_style: 'paginationStyle',
};

/**
 * Convert partial `ApToolAnnotations` (all-optional booleans) to a full
 * `ModuleAnnotations` (required booleans) by spreading over
 * `DEFAULT_ANNOTATIONS` from apcore-js.
 *
 * Accepts both the camelCase field spelling and the snake_case wire spelling.
 * Returns `null` when the input is nullish.
 */
export function toModuleAnnotations(
  partial: ApToolAnnotations | null | undefined,
): ModuleAnnotations | null {
  if (partial == null) return null;

  const normalized: Record<string, unknown> = { ...partial };
  for (const [wireKey, field] of Object.entries(WIRE_ANNOTATION_KEYS)) {
    if (normalized[wireKey] !== undefined) {
      if (normalized[field] === undefined) {
        normalized[field] = normalized[wireKey];
      }
      delete normalized[wireKey];
    }
  }

  return { ...DEFAULT_ANNOTATIONS, ...normalized } as ModuleAnnotations;
}

/**
 * Convert a toolkit ScannedModule + pre-bound execute function into an
 * apcore-js FunctionModule ready for registry registration.
 *
 * This is the NestJS counterpart to apcore-toolkit's RegistryWriter._toFunctionModule(),
 * adapted for live service instances rather than dynamic imports.
 */
export function scannedModuleToFunctionModule(
  mod: ScannedModule,
  execute: BoundExecuteFn,
): FunctionModule {
  // Filter out internal keys (e.g. _execute) from metadata before
  // forwarding to FunctionModule so they don't leak into the public API.
  const cleanMetadata: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(mod.metadata)) {
    if (!k.startsWith('_')) {
      cleanMetadata[k] = v;
    }
  }

  return new FunctionModule({
    execute,
    moduleId: mod.moduleId,
    inputSchema: jsonSchemaToTypeBox(mod.inputSchema),
    outputSchema: jsonSchemaToTypeBox(mod.outputSchema),
    description: mod.description,
    documentation: mod.documentation,
    tags: mod.tags.length > 0 ? [...mod.tags] : null,
    version: mod.version,
    // FunctionModule expects camelCase ModuleAnnotations. Converting to the
    // snake_case wire form here would make apcore's field-level annotation
    // merge miss every multi-word field (requiresApproval, openWorld, ...).
    annotations: mod.annotations ?? null,
    metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : null,
    examples: mod.examples.length > 0 ? ([...mod.examples] as ModuleExample[]) : null,
  });
}
