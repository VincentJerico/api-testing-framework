import { test, expect } from '../src/fixtures/api.js';
import { AuthFailureSchema, AuthTokenSchema } from '../src/schemas/auth.schema.js';
import { config } from '../src/config/env.js';

test.describe('Auth', () => {
  test('valid credentials return a token @smoke @contract', async ({ authClient }) => {
    const res = await authClient.createToken({
      username: config.username,
      password: config.password,
    });
    expect(res.status()).toBe(200);
    await expect(res).toMatchSchema(AuthTokenSchema);
  });

  test('bad credentials return a reason and no token @negative', async ({ authClient }) => {
    const res = await authClient.createToken({ username: 'nobody', password: 'wrong' });
    // Documented quirk: the API answers 200 (not 401) for bad credentials.
    expect(res.status()).toBe(200);
    await expect(res).toMatchSchema(AuthFailureSchema);
    expect(await res.json()).not.toHaveProperty('token');
  });

  test('missing credentials do not return a token @negative', async ({ authClient }) => {
    const res = await authClient.createToken({});
    expect(res.status()).toBe(200);
    await expect(res).toMatchSchema(AuthFailureSchema);
    expect(await res.json()).not.toHaveProperty('token');
  });
});
