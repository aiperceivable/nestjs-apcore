import { Module, OnApplicationBootstrap, Inject } from '@nestjs/common';
import {
  ApcoreModule,
  JWTAuthenticator,
  ApcoreRegistryService,
  ApcoreExecutorService,
} from 'nestjs-apcore';
import { ACL, Config, registerSysModules } from 'apcore-js';
import { TodoModule } from './todo/todo.module.js';
import { WeatherModule } from './weather/weather.module.js';

// --- Config + ACL ----------------------------------------------------------
// Config.discover() auto-finds apcore.yaml from the process CWD.
// ACL.discover(config) reads acl.root from the config and loads the ACL file.
// Both return null/undefined when the file is missing — no enforcement default.
const config = Config.discover();
const acl = ACL.discover(config) ?? undefined;
if (acl) {
  console.log('[ACL] Loaded from apcore.yaml acl.root (default_effect=deny)');
}

// --- JWT -------------------------------------------------------------------
const jwtSecret = process.env.JWT_SECRET;
const authenticator = jwtSecret
  ? new JWTAuthenticator({ secret: jwtSecret })
  : undefined;

// --- App module ------------------------------------------------------------
@Module({
  imports: [
    ApcoreModule.forRoot({
      acl,
      mcp: {
        transport: 'streamable-http',
        host: '0.0.0.0',
        port: 8000,
        explorer: true,
        allowExecute: true,
        name: 'nestjs-apcore-demo',
        version: '1.0.0',
        authenticator,
      },
    }),
    TodoModule,
    WeatherModule,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    @Inject(ApcoreRegistryService)
    private readonly registry: ApcoreRegistryService,
    @Inject(ApcoreExecutorService)
    private readonly executor: ApcoreExecutorService,
  ) {}

  onApplicationBootstrap(): void {
    // Register system modules (health, usage, manifest, toggle_feature, reload).
    // Uses the same Config instance discovered at module load time so apcore.yaml
    // is only read once. sys_modules.enabled must be true (set in apcore.yaml).
    registerSysModules(this.registry.raw, this.executor.raw, config);
  }
}
