import type { Executor, Registry } from 'apcore-js';
import { ApcoreRegistryService } from '../../src/core/apcore-registry.service.js';
import { ApcoreExecutorService } from '../../src/core/apcore-executor.service.js';
import { ApcoreA2aService } from '../../src/a2a/apcore-a2a.service.js';
import type { ApcoreA2aModuleOptions } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Mock apcore-a2a
// ---------------------------------------------------------------------------
vi.mock('apcore-a2a', () => ({
  serve: vi.fn(),
  asyncServe: vi.fn().mockResolvedValue({ use: vi.fn(), listen: vi.fn() }),
}));

import { serve, asyncServe } from 'apcore-a2a';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMockRegistryService(): ApcoreRegistryService {
  const mockRegistry = {
    list: vi.fn().mockReturnValue(['skill.a', 'skill.b', 'skill.c']),
    register: vi.fn(),
    unregister: vi.fn(),
    get: vi.fn(),
    has: vi.fn(),
    getDefinition: vi.fn(),
    on: vi.fn(),
    discover: vi.fn(),
    count: 3,
  } as unknown as Registry;

  return new ApcoreRegistryService(mockRegistry);
}

function createMockExecutorService(): ApcoreExecutorService {
  const mockExecutor = {
    call: vi.fn(),
    callAsync: vi.fn(),
    stream: vi.fn(),
    validate: vi.fn(),
  } as unknown as Executor;

  return new ApcoreExecutorService(mockExecutor);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ApcoreA2aService', () => {
  let registry: ApcoreRegistryService;
  let executor: ApcoreExecutorService;
  let options: ApcoreA2aModuleOptions;
  let service: ApcoreA2aService;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistryService();
    executor = createMockExecutorService();
    options = {};
    service = new ApcoreA2aService(registry, executor, options);
  });

  describe('initial state', () => {
    it('isRunning starts as false', () => {
      expect(service.isRunning).toBe(false);
    });

    it('skillCount returns count from registry.list()', () => {
      expect(service.skillCount).toBe(3);
    });
  });

  describe('start()', () => {
    it('calls serve() with executor and options', () => {
      const opts: ApcoreA2aModuleOptions = {
        name: 'My Agent',
        port: 8080,
        host: '0.0.0.0',
      };
      const svc = new ApcoreA2aService(registry, executor, opts);
      svc.start();

      expect(serve).toHaveBeenCalledWith(
        executor.raw,
        expect.objectContaining({ name: 'My Agent', port: 8080, host: '0.0.0.0' }),
      );
    });

    it('sets isRunning to true', () => {
      service.start();
      expect(service.isRunning).toBe(true);
    });
  });

  describe('stop()', () => {
    it('sets isRunning to false', () => {
      service.start();
      service.stop();
      expect(service.isRunning).toBe(false);
    });
  });

  describe('asyncServe()', () => {
    it('calls asyncServe() and returns the Express app', async () => {
      const app = await service.asyncServe();
      expect(asyncServe).toHaveBeenCalledWith(executor.raw, expect.any(Object));
      expect(app).toBeDefined();
    });

    it('passes module-level options to asyncServe()', async () => {
      const opts: ApcoreA2aModuleOptions = {
        name: 'Test Agent',
        version: '1.0.0',
        explorer: true,
      };
      const svc = new ApcoreA2aService(registry, executor, opts);
      await svc.asyncServe();

      expect(asyncServe).toHaveBeenCalledWith(
        executor.raw,
        expect.objectContaining({ name: 'Test Agent', version: '1.0.0', explorer: true }),
      );
    });

    it('merges per-call overrides with module-level options', async () => {
      const opts: ApcoreA2aModuleOptions = { name: 'Test Agent', url: 'http://default:8000' };
      const svc = new ApcoreA2aService(registry, executor, opts);
      await svc.asyncServe({ url: 'http://override:9000' });

      expect(asyncServe).toHaveBeenCalledWith(
        executor.raw,
        expect.objectContaining({ name: 'Test Agent', url: 'http://override:9000' }),
      );
    });
  });

  describe('onApplicationBootstrap()', () => {
    it('starts standalone server when port is configured', () => {
      const svc = new ApcoreA2aService(registry, executor, { port: 9000 });
      svc.onApplicationBootstrap();
      expect(serve).toHaveBeenCalled();
      expect(svc.isRunning).toBe(true);
    });

    it('does not start server when port is not configured', () => {
      service.onApplicationBootstrap();
      expect(serve).not.toHaveBeenCalled();
      expect(service.isRunning).toBe(false);
    });
  });

  describe('onModuleDestroy()', () => {
    it('stops if running', () => {
      service.start();
      service.onModuleDestroy();
      expect(service.isRunning).toBe(false);
    });

    it('no-ops if not running', () => {
      service.onModuleDestroy();
      expect(service.isRunning).toBe(false);
    });
  });
});
