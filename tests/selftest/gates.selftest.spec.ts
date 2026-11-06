import { test } from '@playwright/test';
import { expect } from '../../src/matchers/schema.js';
import { BookingClient } from '../../src/clients/BookingClient.js';
import { ContractError, readJson } from '../../src/http/readJson.js';
import { BookingSchema, CreatedBookingSchema } from '../../src/schemas/booking.schema.js';
import { buildBooking } from '../../src/data/bookingFactory.js';
import { json, startStub } from './stub.js';

/**
 * A gate that can't fail isn't a gate. These run offline against a local stub and prove the
 * contract matcher, readJson and cleanup() each fail when they should, with a useful message.
 */

const drifted = {
  firstname: 'Ada',
  lastname: '',
  totalprice: '120',
  depositpaid: true,
  bookingdates: { checkin: '2026-13-01', checkout: '2026-11-03' },
  extra: 'not in the contract',
};

test.describe('toMatchSchema', () => {
  test('passes a valid booking', async () => {
    await expect(buildBooking()).toMatchSchema(BookingSchema);
  });

  test('fails on drift and names every broken field', async () => {
    const error = await expect(drifted)
      .toMatchSchema(BookingSchema)
      .then(
        () => undefined,
        (e: Error) => e,
      );
    expect(error?.message).toContain('schema validation failed');
    for (const path of ['lastname', 'totalprice', 'bookingdates.checkin', '(root)']) {
      expect(error?.message).toContain(`• ${path}:`);
    }
  });
});

test.describe('readJson', () => {
  test('returns the typed body when it matches', async ({ playwright }) => {
    const booking = buildBooking();
    const stub = await startStub({
      'GET /booking/1': (_req, res) => json(res, 200, booking),
    });
    const ctx = await playwright.request.newContext({ baseURL: stub.url });
    try {
      expect(await readJson(await ctx.get('/booking/1'), BookingSchema)).toEqual(booking);
    } finally {
      await ctx.dispose();
      await stub.close();
    }
  });

  test('throws a ContractError with status, URL and field paths on drift', async ({
    playwright,
  }) => {
    const stub = await startStub({ 'GET /booking/1': (_req, res) => json(res, 200, drifted) });
    const ctx = await playwright.request.newContext({ baseURL: stub.url });
    try {
      const error = await readJson(await ctx.get('/booking/1'), BookingSchema).then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(ContractError);
      const { message, status } = error as ContractError;
      expect(status).toBe(200);
      expect(message).toContain(`${stub.url}/booking/1 broke its contract`);
      expect(message).toContain('• totalprice:');
    } finally {
      await ctx.dispose();
      await stub.close();
    }
  });
});

test.describe('BookingClient.cleanup', () => {
  /**
   * Creates booking 7 through a client pointed at a stub whose DELETE and GET answer with the given
   * statuses, then runs cleanup(). Resolves to cleanup's outcome: undefined, or the error it threw.
   */
  async function cleanupAgainst(
    playwright: import('@playwright/test').PlaywrightWorkerArgs['playwright'],
    deleteStatus: number,
    getStatus: number,
  ): Promise<Error | undefined> {
    const booking = buildBooking();
    const stub = await startStub({
      'POST /booking': (_req, res) => json(res, 200, { bookingid: 7, booking }),
      'DELETE /booking/7': (_req, res) => {
        res.writeHead(deleteStatus);
        res.end();
      },
      'GET /booking/7': (_req, res) => json(res, getStatus, booking),
    });
    const ctx = await playwright.request.newContext({ baseURL: stub.url });
    try {
      const client = new BookingClient(ctx, 'token');
      await readJson(await client.create(booking), CreatedBookingSchema);
      return await client.cleanup().then(
        () => undefined,
        (e: Error) => e,
      );
    } finally {
      await ctx.dispose();
      await stub.close();
    }
  }

  test('deletes what the client created', async ({ playwright }) => {
    expect(await cleanupAgainst(playwright, 201, 404)).toBeUndefined();
  });

  test('tolerates a booking that is already gone', async ({ playwright }) => {
    // The demo API answers 405 to DELETE on a missing booking; GET's 404 is the real answer.
    expect(await cleanupAgainst(playwright, 405, 404)).toBeUndefined();
  });

  test('fails when a booking survives', async ({ playwright }) => {
    const error = await cleanupAgainst(playwright, 405, 200);
    expect(error?.message).toBe('cleanup could not delete bookings: 7');
  });
});
