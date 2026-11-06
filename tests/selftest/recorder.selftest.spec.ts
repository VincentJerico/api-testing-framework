import { test, expect } from '@playwright/test';
import { recordCalls, REDACTED, type ApiCall } from '../../src/http/recorder.js';
import { json, startStub } from './stub.js';

/** The request log must record every call and must never write a secret into the report. */
test.describe('recordCalls', () => {
  test('records calls and redacts tokens and passwords everywhere', async ({ playwright }) => {
    const stub = await startStub({
      'POST /auth': (_req, res) => json(res, 200, { token: 'abc123' }),
      'PUT /booking/1': (_req, res) => json(res, 403, { error: 'Forbidden' }),
    });
    const ctx = await playwright.request.newContext({ baseURL: stub.url });
    const calls: ApiCall[] = [];
    const recorded = recordCalls(ctx, calls);
    try {
      await recorded.post('/auth', { data: { username: 'admin', password: 'password123' } });
      await recorded.put('/booking/1', {
        data: { firstname: 'Ada' },
        headers: { Cookie: 'token=abc123; theme=dark', Authorization: 'Bearer abc123' },
      });

      expect(calls.map(({ method, status }) => `${method} ${status}`)).toEqual([
        'POST 200',
        'PUT 403',
      ]);
      expect(calls[0]).toMatchObject({
        url: `${stub.url}/auth`,
        requestBody: { username: 'admin', password: REDACTED },
        responseBody: { token: REDACTED },
      });
      expect(calls[1]?.requestHeaders).toEqual({
        Cookie: `token=${REDACTED}; theme=dark`,
        Authorization: REDACTED,
      });
      expect(JSON.stringify(calls)).not.toMatch(/abc123|password123/);
    } finally {
      await ctx.dispose();
      await stub.close();
    }
  });

  test('records a call that never got a response', async ({ playwright }) => {
    const stub = await startStub({});
    await stub.close(); // nothing listens on this port any more
    const ctx = await playwright.request.newContext({ baseURL: stub.url });
    const calls: ApiCall[] = [];
    try {
      await expect(recordCalls(ctx, calls).get('/ping')).rejects.toThrow();
      expect(calls).toHaveLength(1);
      expect(calls[0]?.status).toBeUndefined();
      expect(calls[0]?.error).toBeTruthy();
    } finally {
      await ctx.dispose();
    }
  });
});
