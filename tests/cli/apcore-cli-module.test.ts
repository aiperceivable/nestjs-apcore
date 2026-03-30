import { Test } from '@nestjs/testing';
import { ApcoreModule } from '../../src/core/apcore.module.js';
import { ApcoreCliModule } from '../../src/cli/apcore-cli.module.js';
import { ApcoreCliService } from '../../src/cli/apcore-cli.service.js';
import { APCORE_CLI_MODULE_OPTIONS } from '../../src/constants.js';

// ---------------------------------------------------------------------------
// Mock apcore-js and apcore-cli
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

vi.mock('apcore-cli', () => ({
  createCli: vi.fn().mockReturnValue({ name: () => 'apcore-cli' }),
  setDocsUrl: vi.fn(),
  setVerboseHelp: vi.fn(),
  buildProgramManPage: vi.fn().mockReturnValue(''),
  configureManHelp: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ApcoreCliModule', () => {
  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe('forRoot()', () => {
    it('provides ApcoreCliService', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreCliModule.forRoot(),
        ],
      }).compile();

      const service = module.get(ApcoreCliService);
      expect(service).toBeInstanceOf(ApcoreCliService);
      await module.close();
    });

    it('provides APCORE_CLI_MODULE_OPTIONS token', async () => {
      const opts = { progName: 'my-tool', verboseHelp: true };
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreCliModule.forRoot(opts),
        ],
      }).compile();

      const token = module.get(APCORE_CLI_MODULE_OPTIONS);
      expect(token).toEqual(opts);
      await module.close();
    });

    it('exports ApcoreCliService for downstream injection', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreCliModule.forRoot({ docsUrl: 'https://docs.example.com' }),
        ],
      }).compile();

      const service = module.get(ApcoreCliService);
      expect(service.moduleCount).toBe(0);
      await module.close();
    });
  });

  describe('forRootAsync()', () => {
    it('provides ApcoreCliService via useFactory', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreCliModule.forRootAsync({
            useFactory: () => ({ progName: 'async-tool' }),
          }),
        ],
      }).compile();

      const service = module.get(ApcoreCliService);
      expect(service).toBeInstanceOf(ApcoreCliService);
      await module.close();
    });

    it('passes factory options to service', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot(),
          ApcoreCliModule.forRootAsync({
            useFactory: () => ({ verboseHelp: true, docsUrl: 'https://docs.example.com' }),
          }),
        ],
      }).compile();

      const token = module.get(APCORE_CLI_MODULE_OPTIONS);
      expect(token).toEqual({ verboseHelp: true, docsUrl: 'https://docs.example.com' });
      await module.close();
    });
  });

  describe('ApcoreModule.forRoot() auto-import', () => {
    it('auto-imports ApcoreCliModule when cli option is provided', async () => {
      const module = await Test.createTestingModule({
        imports: [
          ApcoreModule.forRoot({
            cli: { progName: 'my-tool' },
          }),
        ],
      }).compile();

      const service = module.get(ApcoreCliService);
      expect(service).toBeInstanceOf(ApcoreCliService);
      await module.close();
    });

    it('does not provide ApcoreCliService when cli option is absent', async () => {
      const module = await Test.createTestingModule({
        imports: [ApcoreModule.forRoot()],
      }).compile();

      expect(() => module.get(ApcoreCliService)).toThrow();
      await module.close();
    });
  });
});
