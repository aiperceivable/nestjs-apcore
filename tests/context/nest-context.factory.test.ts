import { NestContextFactory } from '../../src/context/nest-context.factory.js';
import type { NestRequest } from '../../src/context/nest-context.factory.js';

function mockReq(headers: Record<string, string> = {}): NestRequest {
  return { headers };
}

describe('NestContextFactory', () => {
  let factory: NestContextFactory;

  beforeEach(() => {
    factory = new NestContextFactory();
  });

  describe('trace_parent handling (PROTOCOL_SPEC §10.5)', () => {
    it('propagates trace_id from a valid traceparent header', () => {
      const req = mockReq({ traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' });
      const ctx = factory.createContext(req);
      // SDK v0.15.x stores in dashed-UUID form; v0.19.x+ stores as 32-hex.
      // Either way the traceId is derived from the header, not randomly generated.
      expect(ctx.traceId).toMatch(/4bf92f3[57]/i);
    });

    it('rejects all-zero trace_id and regenerates', () => {
      const req = mockReq({ traceparent: '00-00000000000000000000000000000000-00f067aa0ba902b7-01' });
      const ctx = factory.createContext(req);
      expect(ctx.traceId).not.toContain('00000000000000000000000000000000');
    });

    it('rejects all-f trace_id and regenerates', () => {
      const req = mockReq({ traceparent: '00-ffffffffffffffffffffffffffffffff-00f067aa0ba902b7-01' });
      const ctx = factory.createContext(req);
      expect(ctx.traceId).not.toContain('ffffffffffffffffffffffffffffffff');
    });

    it('generates a fresh traceId when no traceparent header is present', () => {
      const req = mockReq({});
      const ctx = factory.createContext(req);
      expect(typeof ctx.traceId).toBe('string');
      expect(ctx.traceId.length).toBeGreaterThan(0);
    });

    it('normalizes uppercase header key so traceparent is found', () => {
      const req = mockReq({ TRACEPARENT: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' });
      const ctx = factory.createContext(req);
      // Verify the traceparent WAS found: traceId is derived from the header, not random.
      expect(ctx.traceId).toMatch(/4bf92f3[57]/i);
    });
  });

  describe('correlation ID propagation', () => {
    it('stores x-correlation-id in context.data', () => {
      const req = mockReq({ 'x-correlation-id': 'my-legacy-req-id' });
      const ctx = factory.createContext(req);
      expect(ctx.data?.['x-correlation-id']).toBe('my-legacy-req-id');
    });

    it('stores x-request-id in context.data when no x-correlation-id', () => {
      const req = mockReq({ 'x-request-id': 'req_abc123' });
      const ctx = factory.createContext(req);
      expect(ctx.data?.['x-correlation-id']).toBe('req_abc123');
    });

    it('x-correlation-id takes precedence over x-request-id', () => {
      const req = mockReq({ 'x-correlation-id': 'corr-1', 'x-request-id': 'req-2' });
      const ctx = factory.createContext(req);
      expect(ctx.data?.['x-correlation-id']).toBe('corr-1');
    });

    it('does not set x-correlation-id when neither header is present', () => {
      const req = mockReq({});
      const ctx = factory.createContext(req);
      expect(ctx.data?.['x-correlation-id']).toBeUndefined();
    });
  });

  describe('identity extraction', () => {
    it('extracts user identity from x-user-id header', () => {
      const req = mockReq({ 'x-user-id': 'user-42' });
      const ctx = factory.createContext(req);
      expect(ctx.identity?.id).toBe('user-42');
      expect(ctx.identity?.type).toBe('user');
    });

    it('extracts api_key identity from Authorization Bearer header', () => {
      const req = mockReq({ authorization: 'Bearer my-token' });
      const ctx = factory.createContext(req);
      expect(ctx.identity?.id).toBe('bearer');
      expect(ctx.identity?.type).toBe('api_key');
    });

    it('falls back to anonymous when no auth headers are present', () => {
      const req = mockReq({});
      const ctx = factory.createContext(req);
      expect(ctx.identity?.id).toBe('anonymous');
      expect(ctx.identity?.type).toBe('anonymous');
    });

    it('x-user-id takes precedence over Authorization', () => {
      const req = mockReq({ 'x-user-id': 'user-99', authorization: 'Bearer token' });
      const ctx = factory.createContext(req);
      expect(ctx.identity?.id).toBe('user-99');
    });
  });
});
