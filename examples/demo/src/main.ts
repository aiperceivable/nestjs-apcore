import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(__dirname, '..', '..');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // REST API on port 3000 (TodoController)
  await app.listen(3000);

  const jwtEnabled = !!process.env.JWT_SECRET;
  const aclEnabled = existsSync(join(demoRoot, 'acl.yaml'));
  const sysModulesEnabled = existsSync(join(demoRoot, 'apcore.yaml'));

  console.log('');
  console.log('  nestjs-apcore demo is running!');
  console.log('');
  console.log('  MCP Explorer : http://localhost:8000/explorer/');
  console.log('  REST API     : http://localhost:3000/todos');
  console.log(`  JWT auth     : ${jwtEnabled ? 'enabled (Bearer token required for /mcp)' : 'disabled (set JWT_SECRET to enable)'}`);
  console.log(`  ACL          : ${aclEnabled ? 'enabled (acl.root → acl.yaml, anonymous=read-only / bearer=full)' : 'disabled (remove acl.root from apcore.yaml to disable)'}`);
  console.log(`  sys_modules  : ${sysModulesEnabled ? 'enabled (apcore.yaml — health, usage, toggle_feature, manifest)' : 'disabled (create apcore.yaml to enable)'}`);
  console.log('');
}

bootstrap().catch(console.error);
