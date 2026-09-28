import { test as base } from '@playwright/test';
import { AuthClient } from '../clients/AuthClient.js';
import { BookingClient } from '../clients/BookingClient.js';
import { config, DEFAULT_HEADERS } from '../config/env.js';

type TestFixtures = {
  /** Client for /auth. */
  authClient: AuthClient;
  /** Authenticated /booking client; deletes everything it created after each test. */
  bookingClient: BookingClient;
};

type WorkerFixtures = {
  /** Auth token fetched ONCE per worker and shared by that worker's tests. */
  token: string;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  token: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({
        baseURL: config.baseURL,
        extraHTTPHeaders: DEFAULT_HEADERS,
      });
      const token = await new AuthClient(ctx).getToken({
        username: config.username,
        password: config.password,
      });
      await use(token);
      await ctx.dispose();
    },
    { scope: 'worker' },
  ],

  authClient: async ({ request }, use) => {
    await use(new AuthClient(request));
  },

  bookingClient: async ({ request, token }, use) => {
    const client = new BookingClient(request, token);
    await use(client);
    await client.cleanup();
  },
});

export { expect } from '../matchers/schema.js';
