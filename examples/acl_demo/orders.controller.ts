import {
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Req,
} from '@nestjs/common';
import { ACLDeniedError } from 'apcore-js';
import { ApcoreExecutorService, NestContextFactory } from 'nestjs-apcore';

interface HeadersReq {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * REST routes that call the ACL-protected ``orders.*`` apcore modules through
 * the Executor, so apcore ACL governs the routes:
 *   DELETE /orders/:id -> orders.delete (admins only)
 *   GET    /orders     -> orders.list   (public read)
 *
 * Identity (and its roles) is derived from the request by NestContextFactory,
 * which reads a comma-separated ``X-Roles`` header in this demo. A denied call
 * raises ``ACLDeniedError``, mapped here to HTTP 403.
 */
@Controller('orders')
export class OrdersController {
  private readonly contextFactory = new NestContextFactory();

  constructor(
    @Inject(ApcoreExecutorService)
    private readonly executor: ApcoreExecutorService,
  ) {}

  private async call(req: HeadersReq, moduleId: string, inputs: Record<string, unknown>) {
    const ctx = this.contextFactory.createContext(req);
    try {
      return await this.executor.call(moduleId, inputs, ctx);
    } catch (err) {
      if (err instanceof ACLDeniedError) {
        throw new HttpException(String(err.message ?? err), HttpStatus.FORBIDDEN);
      }
      throw err;
    }
  }

  @Delete(':id')
  async remove(@Req() req: HeadersReq, @Param('id') id: string) {
    return this.call(req, 'orders.delete', { order_id: Number(id) });
  }

  @Get()
  async list(@Req() req: HeadersReq) {
    return this.call(req, 'orders.list', {});
  }
}
