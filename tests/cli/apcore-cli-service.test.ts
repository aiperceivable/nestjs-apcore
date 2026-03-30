import type { Registry } from 'apcore-js';
import { ApcoreRegistryService } from '../../src/core/apcore-registry.service.js';
import { ApcoreCliService } from '../../src/cli/apcore-cli.service.js';
import type { ApcoreCliModuleOptions } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Mock apcore-cli
// ---------------------------------------------------------------------------
vi.mock('apcore-cli', () => ({
  createCli: vi.fn().mockReturnValue({ name: () => 'test-cli', parse: vi.fn() }),
  setDocsUrl: vi.fn(),
  setVerboseHelp: vi.fn(),
  buildProgramManPage: vi.fn().mockReturnValue('.TH TEST 1'),
  configureManHelp: vi.fn(),
}));

import { createCli, setDocsUrl, setVerboseHelp, buildProgramManPage, configureManHelp } from 'apcore-cli';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMockRegistryService(): ApcoreRegistryService {
  const mockRegistry = {
    list: vi.fn().mockReturnValue(['tool.a', 'tool.b']),
    register: vi.fn(),
    unregister: vi.fn(),
    get: vi.fn(),
    has: vi.fn(),
    getDefinition: vi.fn(),
    on: vi.fn(),
    discover: vi.fn(),
    count: 2,
  } as unknown as Registry;

  return new ApcoreRegistryService(mockRegistry);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ApcoreCliService', () => {
  let registry: ApcoreRegistryService;
  let options: ApcoreCliModuleOptions;
  let service: ApcoreCliService;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = createMockRegistryService();
    options = {};
    service = new ApcoreCliService(registry, options);
  });

  describe('construction', () => {
    it('does not call setDocsUrl when docsUrl is not set', () => {
      expect(setDocsUrl).not.toHaveBeenCalled();
    });

    it('calls setDocsUrl with configured url', () => {
      new ApcoreCliService(registry, { docsUrl: 'https://docs.example.com' });
      expect(setDocsUrl).toHaveBeenCalledWith('https://docs.example.com');
    });

    it('calls setDocsUrl(null) when explicitly set to null', () => {
      new ApcoreCliService(registry, { docsUrl: null });
      expect(setDocsUrl).toHaveBeenCalledWith(null);
    });

    it('does not call setVerboseHelp when verboseHelp is not set', () => {
      expect(setVerboseHelp).not.toHaveBeenCalled();
    });

    it('calls setVerboseHelp with configured value', () => {
      new ApcoreCliService(registry, { verboseHelp: true });
      expect(setVerboseHelp).toHaveBeenCalledWith(true);
    });
  });

  describe('createProgram', () => {
    it('calls createCli with default options', () => {
      service.createProgram();
      expect(createCli).toHaveBeenCalledWith(undefined, undefined, false);
    });

    it('passes extensionsDir override', () => {
      service.createProgram('/custom/dir');
      expect(createCli).toHaveBeenCalledWith('/custom/dir', undefined, false);
    });

    it('passes progName from options', () => {
      const svc = new ApcoreCliService(registry, { progName: 'my-tool' });
      svc.createProgram();
      expect(createCli).toHaveBeenCalledWith(undefined, 'my-tool', false);
    });

    it('passes verboseHelp: true from options', () => {
      const svc = new ApcoreCliService(registry, { verboseHelp: true });
      svc.createProgram();
      expect(createCli).toHaveBeenCalledWith(undefined, undefined, true);
    });

    it('extensionsDir from options used when no override passed', () => {
      const svc = new ApcoreCliService(registry, { extensionsDir: '/ext' });
      svc.createProgram();
      expect(createCli).toHaveBeenCalledWith('/ext', undefined, false);
    });

    it('returns the Commander program from createCli', () => {
      const prog = service.createProgram();
      expect(prog).toBeDefined();
    });
  });

  describe('buildManPage', () => {
    it('delegates to buildProgramManPage', () => {
      const fakeProgram = {} as any;
      const result = service.buildManPage(fakeProgram, 'my-tool', '1.0.0', 'My Tool');
      expect(buildProgramManPage).toHaveBeenCalledWith(fakeProgram, 'my-tool', '1.0.0', 'My Tool', undefined);
      expect(result).toBe('.TH TEST 1');
    });

    it('passes docsUrl from options as default', () => {
      const svc = new ApcoreCliService(registry, { docsUrl: 'https://docs.example.com' });
      const fakeProgram = {} as any;
      svc.buildManPage(fakeProgram, 'my-tool', '1.0.0');
      expect(buildProgramManPage).toHaveBeenCalledWith(fakeProgram, 'my-tool', '1.0.0', undefined, 'https://docs.example.com');
    });

    it('explicit docsUrl override takes precedence over options', () => {
      const svc = new ApcoreCliService(registry, { docsUrl: 'https://default.example.com' });
      const fakeProgram = {} as any;
      svc.buildManPage(fakeProgram, 'my-tool', '1.0.0', undefined, 'https://override.example.com');
      expect(buildProgramManPage).toHaveBeenCalledWith(fakeProgram, 'my-tool', '1.0.0', undefined, 'https://override.example.com');
    });
  });

  describe('configureManHelp', () => {
    it('delegates to configureManHelp', () => {
      const fakeProgram = {} as any;
      service.configureManHelp(fakeProgram, 'my-tool', '1.0.0', 'My Tool');
      expect(configureManHelp).toHaveBeenCalledWith(fakeProgram, 'my-tool', '1.0.0', 'My Tool', undefined);
    });

    it('passes docsUrl from options as default', () => {
      const svc = new ApcoreCliService(registry, { docsUrl: 'https://docs.example.com' });
      const fakeProgram = {} as any;
      svc.configureManHelp(fakeProgram, 'my-tool', '1.0.0');
      expect(configureManHelp).toHaveBeenCalledWith(fakeProgram, 'my-tool', '1.0.0', undefined, 'https://docs.example.com');
    });
  });

  describe('setDocsUrl', () => {
    it('delegates to apcore-cli setDocsUrl', () => {
      service.setDocsUrl('https://new-docs.example.com');
      expect(setDocsUrl).toHaveBeenCalledWith('https://new-docs.example.com');
    });

    it('accepts null to disable docs URL', () => {
      service.setDocsUrl(null);
      expect(setDocsUrl).toHaveBeenCalledWith(null);
    });
  });

  describe('setVerboseHelp', () => {
    it('delegates to apcore-cli setVerboseHelp', () => {
      service.setVerboseHelp(true);
      expect(setVerboseHelp).toHaveBeenCalledWith(true);
    });

    it('can disable verbose mode', () => {
      service.setVerboseHelp(false);
      expect(setVerboseHelp).toHaveBeenCalledWith(false);
    });
  });

  describe('moduleCount', () => {
    it('returns count from registry', () => {
      expect(service.moduleCount).toBe(2);
    });
  });
});
