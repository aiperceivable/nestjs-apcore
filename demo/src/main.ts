import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // REST API on port 3000 (TodoController)
  await app.listen(3000);

  const jwtEnabled = !!process.env.JWT_SECRET;

  console.log('');
  console.log('  nestjs-apcore demo is running!');
  console.log('');
  console.log('  MCP Explorer : http://localhost:8000/explorer/');
  console.log('  REST API     : http://localhost:3000/todos');
  console.log(`  JWT auth     : ${jwtEnabled ? 'enabled (Bearer token required for /mcp)' : 'disabled (set JWT_SECRET to enable)'}`);
  console.log('');
}

bootstrap().catch(console.error);
