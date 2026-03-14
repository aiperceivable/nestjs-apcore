import { scannedModuleToFunctionModule, toModuleAnnotations } from '../../src/utils/module-factory.js';
import { createScannedModule } from 'apcore-toolkit';

// ---------------------------------------------------------------------------
// toModuleAnnotations()
// ---------------------------------------------------------------------------
describe('toModuleAnnotations', () => {
  it('returns null for null input', () => {
    expect(toModuleAnnotations(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(toModuleAnnotations(undefined)).toBeNull();
  });

  it('spreads partial over DEFAULT_ANNOTATIONS', () => {
    const result = toModuleAnnotations({ destructive: true });
    expect(result).toEqual(expect.objectContaining({
      destructive: true,
      readonly: false,
      idempotent: false,
      requiresApproval: false,
      openWorld: true,
      streaming: false,
    }));
  });

  it('preserves all supplied fields', () => {
    const result = toModuleAnnotations({
      readonly: true,
      cacheable: true,
      cacheTtl: 300,
      paginated: true,
      paginationStyle: 'cursor',
    });
    expect(result!.readonly).toBe(true);
    expect(result!.cacheable).toBe(true);
    expect(result!.cacheTtl).toBe(300);
    expect(result!.paginated).toBe(true);
    expect(result!.paginationStyle).toBe('cursor');
  });
});

// ---------------------------------------------------------------------------
// scannedModuleToFunctionModule()
// ---------------------------------------------------------------------------
describe('scannedModuleToFunctionModule', () => {
  const minimalScanned = createScannedModule({
    moduleId: 'test.mod',
    description: 'A test module',
    inputSchema: { type: 'object', properties: { x: { type: 'number' } } },
    outputSchema: { type: 'object', properties: { y: { type: 'string' } } },
    tags: ['test'],
    target: 'TestService.method',
  });

  it('produces a FunctionModule with correct moduleId and description', () => {
    const execute = async () => ({});
    const fm = scannedModuleToFunctionModule(minimalScanned, execute);
    expect(fm.moduleId).toBe('test.mod');
    expect(fm.description).toBe('A test module');
  });

  it('converts JSON Schema to TypeBox for inputSchema and outputSchema', () => {
    const execute = async () => ({});
    const fm = scannedModuleToFunctionModule(minimalScanned, execute);
    // jsonSchemaToTypeBox adds TypeBox symbols, but JSON-serializable shape is preserved
    expect(JSON.parse(JSON.stringify(fm.inputSchema))).toEqual({
      type: 'object',
      properties: { x: { type: 'number' } },
    });
  });

  it('calls the provided execute function', async () => {
    const execute = vi.fn().mockResolvedValue({ result: 42 });
    const fm = scannedModuleToFunctionModule(minimalScanned, execute);
    const output = await fm.execute({ x: 1 }, {} as any);
    expect(execute).toHaveBeenCalledWith({ x: 1 }, expect.anything());
    expect(output).toEqual({ result: 42 });
  });

  it('filters out _-prefixed metadata keys', () => {
    const scanned = createScannedModule({
      moduleId: 'test.mod',
      description: 'test',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: {} },
      tags: [],
      target: 'T.m',
      metadata: { _execute: 'should-be-stripped', publicKey: 'kept' },
    });
    const fm = scannedModuleToFunctionModule(scanned, async () => ({}));
    expect(fm.metadata).toEqual({ publicKey: 'kept' });
  });

  it('sets metadata to null when all keys are internal', () => {
    const scanned = createScannedModule({
      moduleId: 'test.mod',
      description: 'test',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: {} },
      tags: [],
      target: 'T.m',
      metadata: { _internal: 'hidden' },
    });
    const fm = scannedModuleToFunctionModule(scanned, async () => ({}));
    expect(fm.metadata).toBeNull();
  });

  it('passes tags as array or null', () => {
    const withTags = scannedModuleToFunctionModule(minimalScanned, async () => ({}));
    expect(withTags.tags).toEqual(['test']);

    const noTags = createScannedModule({
      moduleId: 'x', description: 'x', inputSchema: {}, outputSchema: {},
      tags: [], target: 'X.x',
    });
    const withoutTags = scannedModuleToFunctionModule(noTags, async () => ({}));
    expect(withoutTags.tags).toBeNull();
  });
});
