import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../examples/acl_demo/app.module.js';
import { OrdersController } from '../../examples/acl_demo/orders.controller.js';

/**
 * Integration test for the NestJS + apcore ACL demo (examples/acl_demo).
 *
 * Drives the controller in-process: request -> NestContextFactory identity ->
 * Executor ACL check -> allow/deny, proving apcore ACL rules govern the
 * orders.* module calls made from NestJS routes.
 */
function req(roles?: string) {
  return { headers: roles ? { 'x-roles': roles } : {} };
}

describe('nestjs-apcore ACL demo', () => {
  let app: INestApplication;
  let controller: OrdersController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    controller = app.get(OrdersController);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('admin can delete', async () => {
    const result = await controller.remove(req('admin'), '1');
    expect(result).toEqual({ deleted: 1 });
  });

  it('anonymous delete is denied', async () => {
    await expect(controller.remove(req(), '1')).rejects.toBeInstanceOf(HttpException);
  });

  it('non-admin delete is denied', async () => {
    await expect(controller.remove(req('user'), '1')).rejects.toBeInstanceOf(HttpException);
  });

  it('anyone can read orders', async () => {
    expect(await controller.list(req())).toEqual({ orders: [{ id: 1 }, { id: 2 }] });
    expect(await controller.list(req('user'))).toEqual({ orders: [{ id: 1 }, { id: 2 }] });
  });
});
