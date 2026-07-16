import { Injectable } from '@nestjs/common';
import { Context, TraceContext, createIdentity } from 'apcore-js';
import type { Identity, TraceParent } from 'apcore-js';

/** Minimal request shape required by NestContextFactory (Express and Fastify compatible). */
export interface NestRequest {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Creates apcore Context objects from NestJS HTTP requests.
 *
 * Identity extraction priority:
 *   1. `x-user-id` header
 *   2. `Authorization: Bearer <token>` header (identity id = "bearer")
 *   3. Falls back to anonymous identity
 *
 * W3C Trace Context propagation:
 *   When a `traceparent` header is present, its trace_id is used via
 *   Context.create — strict 32-hex validation and W3C-invalid rejection
 *   are enforced by the SDK, not this factory. See PROTOCOL_SPEC §10.5.
 *
 * Correlation ID:
 *   If `x-correlation-id` or `x-request-id` is present, the value is
 *   stored in context.data["x-correlation-id"] alongside traceId so
 *   existing log pipelines remain correlatable.
 */
@Injectable()
export class NestContextFactory {
  /**
   * Create an apcore Context from a NestJS HTTP request.
   *
   * @param req - Request object (from @Req() decorator or an interceptor).
   *              Compatible with Express and Fastify request shapes.
   */
  createContext(req: NestRequest): Context {
    const identity = this._extractIdentity(req);
    const traceParent = this._extractTraceParent(req);
    const data = this._extractData(req);
    return Context.create(identity, traceParent, null, data);
  }

  private _extractTraceParent(req: NestRequest): TraceParent | null {
    const headers = _normalizeHeaders(req.headers);
    return TraceContext.extract(headers);
  }

  private _extractIdentity(req: NestRequest): Identity {
    const headers = req.headers;
    const roles = this._extractRoles(headers);

    const userId = headers['x-user-id'];
    if (typeof userId === 'string' && userId.length > 0) {
      return createIdentity(userId, 'user', roles);
    }

    const auth = headers['authorization'];
    if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
      return createIdentity('bearer', 'api_key', roles);
    }

    // An `x-roles` header alone (no user id) still identifies a roled user —
    // a demo shortcut for role-based ACL without full authentication.
    if (roles.length > 0) {
      return createIdentity('u1', 'user', roles);
    }

    return createIdentity('anonymous', 'anonymous');
  }

  /** Extract roles from a comma-separated `x-roles` header. */
  private _extractRoles(
    headers: Record<string, string | string[] | undefined>,
  ): string[] {
    const raw = headers['x-roles'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === 'string' && value.length > 0) {
      return value
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
    }
    return [];
  }

  private _extractData(req: NestRequest): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const headers = req.headers;
    const correlationId = headers['x-correlation-id'] ?? headers['x-request-id'];
    if (typeof correlationId === 'string' && correlationId.length > 0) {
      data['x-correlation-id'] = correlationId;
    }
    return data;
  }
}

function _normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      result[key.toLowerCase()] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      result[key.toLowerCase()] = value[0]!;
    }
  }
  return result;
}
