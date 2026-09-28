import { test, expect } from '../src/fixtures/api.js';

test('API is up — GET /ping responds @smoke', async ({ request }) => {
  const res = await request.get('/ping');
  // Documented quirk: Restful-Booker's health check returns 201, not 200.
  expect(res.status()).toBe(201);
});
