import { Module } from '@nestjs/common';
import {
  ApcoreModule,
  JWTAuthenticator,
} from 'nestjs-apcore';
import { TodoModule } from './todo/todo.module.js';
import { WeatherModule } from './weather/weather.module.js';

// Optional JWT auth — enabled when JWT_SECRET env var is set.
// Without JWT_SECRET the demo runs with no auth (same as before).
const jwtSecret = process.env.JWT_SECRET;
const authenticator = jwtSecret
  ? new JWTAuthenticator({ secret: jwtSecret })
  : undefined;

/**
 * Root application module.
 *
 * Demonstrates how nestjs-apcore turns standard NestJS services into
 * AI-perceivable MCP tools — no changes needed to your business logic.
 *
 * - TodoService: CRUD with @ApTool decorators + REST controller (dual-protocol)
 * - WeatherService: @ApTool with NestJS DI (injects GeoService)
 * - ApToolScannerService: auto-discovers all @ApTool decorated methods
 */
@Module({
  imports: [
    ApcoreModule.forRoot({
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
export class AppModule {}
