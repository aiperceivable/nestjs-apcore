import { Injectable } from '@nestjs/common';
import { Type } from '@sinclair/typebox';
import { ApModule, ApTool } from 'nestjs-apcore';

/**
 * Orders exposed as apcore modules, governed by acl.yaml:
 *   orders.delete -> admins only
 *   orders.list   -> public (read)
 */
@ApModule({ namespace: 'orders', description: 'Order management (ACL demo)' })
@Injectable()
export class OrdersService {
  @ApTool({
    description: 'Delete an order (admins only)',
    inputSchema: Type.Object({ order_id: Type.Number() }),
    outputSchema: Type.Object({ deleted: Type.Number() }),
    annotations: { readonly: false, destructive: true },
    tags: ['orders', 'mutate'],
  })
  delete(inputs: Record<string, unknown>): Record<string, unknown> {
    return { deleted: inputs.order_id as number };
  }

  @ApTool({
    description: 'List orders (public read)',
    inputSchema: Type.Object({}),
    outputSchema: Type.Object({
      orders: Type.Array(Type.Object({ id: Type.Number() })),
    }),
    annotations: { readonly: true, idempotent: true },
    tags: ['orders', 'query'],
  })
  list(): Record<string, unknown> {
    return { orders: [{ id: 1 }, { id: 2 }] };
  }
}
