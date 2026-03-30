import { Test } from '@nestjs/testing';
import { ApcoreModule } from '../../src/core/apcore.module.js';
import { ApcoreA2aModule } from '../../src/a2a/apcore-a2a.module.js';
import { ApcoreA2aService } from '../../src/a2a/apcore-a2a.service.js';
import { APCORE_A2A_MODULE_OPTIONS } from '../../src/constants.js';

// ---------------------------------------------------------------------------
// Mock apcore-js and apcore-a2a
// ---------------------------------------------------------------------------
vi.mock('apcore-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('apcore-js')>();
  return {
    ...actual,
    Registry: vi.fn().mockImplementation(() => ({
      register: vi.fn(),
      unregister: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      list: vi.fn().mockReturnValue([]),
      getDefinition: vi.fn(),
      on: vi.fn(),
      discover: vi.fn().mockResolvedValue(0),
      count: 0,
    })),
    Executor: vi.fn().mockImplementation(() => ({
      call: vi.fn(),
      callAsync: vi.fn(),
      stream: vi.fn(),
      validate: vi.fn(),
    })),
    normalizeResult: vi.fn((v: unknown) => v),
  };
});

vi.mock('apcore-a2a', () => ({
  serve: vi.fn(),
  asyncServe: vi.fn().mockResolvedValue({ use: vi.fn() }),
  JWTAuthenticator: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ApcoreA2aModule', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('forRoot()', () => {
    it('provides ApcoreA2aService', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreA2aModule.forRoot(),
        ],
      }).compile();

      const service = module.get(ApcoreA2aService);
      expect(service).toBeInstanceOf(ApcoreA2aService);
      await module.close();
    });

    it('provides APCORE_A2A_MODULE_OPTIONS token', async () => {
      const opts = { name: 'Test Agent', version: '2.0.0' };
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreA2aModule.forRoot(opts),
        ],
      }).compile();

      const token = module.get(APCORE_A2A_MODULE_OPTIONS);
      expect(token).toEqual(opts);
      await module.close();
    });

    it('exports ApcoreA2aService for downstream injection', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreA2aModule.forRoot({ explorer: true }),
        ],
      }).compile();

      const service = module.get(ApcoreA2aService);
      expect(service.skillCount).toBe(0);
      await module.close();
    });
  });

  describe('forRootAsync()', () => {
    it('provides ApcoreA2aService via useFactory', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreA2aModule.forRootAsync({
            useFactory: () => ({ name: 'Async Agent' }),
          }),
        ],
      }).compile();

      const service = module.get(ApcoreA2aService);
      expect(service).toBeInstanceOf(ApcoreA2aService);
      await module.close();
    });

    it('passes factory options to the token', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreA2aModule.forRootAsync({
            useFactory: () => ({ name: 'Async Agent', version: '3.0.0' }),
          }),
        ],
      }).compile();

      const token = module.get(APCORE_A2A_MODULE_OPTIONS);
      expect(token).toEqual({ name: 'Async Agent', version: '3.0.0' });
      await module.close();
    });
  });

  describe('ApcoreModule.forRoot() auto-import', () => {
    it('auto-imports ApcoreA2aModule when a2a option is provided', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot({
            a2a: { name: 'My Agent' },
          }),
        ],
      }).compile();

      const service = module.get(ApcoreA2aService);
      expect(service).toBeInstanceOf(ApcoreA2aService);
      await module.close();
    });

    it('does not provide ApcoreA2aService when a2a option is absent', async () => {
      const module = await Test.createTestingModule({
        imports: [ApcoreModule.forRoot()],
      }).compile();

      expect(() => module.get(ApcoreA2aService)).toThrow();
      await module.close();
    });
  });
});
