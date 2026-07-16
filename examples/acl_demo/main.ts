import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the ACL demo as a standalone HTTP server.
 *
 *   npx tsx examples/acl_demo/main.ts
 *
 *   curl -X DELETE localhost:3000/orders/1                       # 403 (anonymous)
 *   curl -X DELETE localhost:3000/orders/1 -H 'X-Roles: user'    # 403 (not admin)
 *   curl -X DELETE localhost:3000/orders/1 -H 'X-Roles: admin'   # 200
 *   curl localhost:3000/orders                                   # 200 (read is public)
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  // eslint-disable-next-line no-console
  console.log('nestjs-apcore ACL demo listening on http://localhost:3000');
}

void bootstrap();
