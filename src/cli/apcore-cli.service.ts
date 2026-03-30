import { Injectable, Inject } from '@nestjs/common';
import {
  createCli,
  setDocsUrl,
  setVerboseHelp,
  buildProgramManPage,
  configureManHelp,
} from 'apcore-cli';
import { ApcoreRegistryService } from '../core/apcore-registry.service.js';
import { APCORE_CLI_MODULE_OPTIONS } from '../constants.js';
import type { ApcoreCliModuleOptions } from '../types.js';

/**
 * NestJS-injectable service that exposes apcore-cli utilities.
 *
 * Wraps `createCli`, `buildProgramManPage`, and `configureManHelp` from
 * `apcore-cli`, applying module-level defaults (docsUrl, verboseHelp) on
 * construction so that injected consumers get a pre-configured CLI builder.
 *
 * @example
 * ```ts
 * const program = cliService.createProgram();
 * cliService.configureManHelp(program, 'my-tool', '1.0.0', 'My Tool');
 * program.parse();
 * ```
 */
@Injectable()
export class ApcoreCliService {
  constructor(
    @Inject(ApcoreRegistryService)
    private readonly registry: ApcoreRegistryService,
    @Inject(APCORE_CLI_MODULE_OPTIONS)
    private readonly options: ApcoreCliModuleOptions,
  ) {
    if (options.docsUrl !== undefined) {
      setDocsUrl(options.docsUrl);
    }
    if (options.verboseHelp !== undefined) {
      setVerboseHelp(options.verboseHelp);
    }
  }

  // -------------------------------------------------------------------------
  // Program builder
  // -------------------------------------------------------------------------

  /**
   * Build and return a Commander program.
   *
   * Built-in apcore options (`--input`, `--yes`, `--large-input`, `--format`)
   * are hidden by default; pass `--help --verbose` at runtime (or set
   * `verboseHelp: true` in module options) to show them.
   *
   * @param extensionsDir  Override the extensions directory (default: value from options).
   */
  createProgram(extensionsDir?: string): ReturnType<typeof createCli> {
    return createCli(
      extensionsDir ?? this.options.extensionsDir,
      this.options.progName,
      this.options.verboseHelp ?? false,
    );
  }

  // -------------------------------------------------------------------------
  // Man page / help
  // -------------------------------------------------------------------------

  /**
   * Generate a complete roff man page string for the given Commander program.
   *
   * Enabled by `apcore-cli` 0.4.0's `buildProgramManPage()`.
   */
  buildManPage(
    program: Parameters<typeof buildProgramManPage>[0],
    progName: string,
    version: string,
    description?: string,
    docsUrl?: string,
  ): string {
    return buildProgramManPage(
      program,
      progName,
      version,
      description,
      docsUrl ?? this.options.docsUrl ?? undefined,
    );
  }

  /**
   * Add `--help --man` support to an existing Commander program.
   *
   * When the user runs `<prog> --help --man`, the full man page is written to
   * stdout. Enabled by `apcore-cli` 0.4.0's `configureManHelp()`.
   */
  configureManHelp(
    program: Parameters<typeof configureManHelp>[0],
    progName: string,
    version: string,
    description?: string,
    docsUrl?: string,
  ): void {
    configureManHelp(
      program,
      progName,
      version,
      description,
      docsUrl ?? this.options.docsUrl ?? undefined,
    );
  }

  // -------------------------------------------------------------------------
  // Runtime configuration
  // -------------------------------------------------------------------------

  /**
   * Update the docs URL used by man pages and per-command help output.
   *
   * Delegates to `apcore-cli`'s module-level `setDocsUrl()`.
   */
  setDocsUrl(url: string | null): void {
    setDocsUrl(url);
  }

  /**
   * Toggle verbose help mode.
   *
   * When `true`, `--help` shows all options including built-in apcore options.
   * Delegates to `apcore-cli`'s module-level `setVerboseHelp()`.
   */
  setVerboseHelp(verbose: boolean): void {
    setVerboseHelp(verbose);
  }

  // -------------------------------------------------------------------------
  // Registry accessors
  // -------------------------------------------------------------------------

  /** Number of modules currently in the registry. */
  get moduleCount(): number {
    return this.registry.count;
  }
}
