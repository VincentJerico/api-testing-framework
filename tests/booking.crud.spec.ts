import { test, expect } from '../src/fixtures/api.js';
import { BookingClient } from '../src/clients/BookingClient.js';
import { buildBooking } from '../src/data/bookingFactory.js';
import { readJson } from '../src/http/readJson.js';
import { BookingSchema, CreatedBookingSchema } from '../src/schemas/booking.schema.js';

test.describe('Booking CRUD', () => {
  test('create then read returns the same booking @smoke', async ({ bookingClient }) => {
    const payload = buildBooking();
    const { bookingid, booking } = await readJson(
      await bookingClient.create(payload),
      CreatedBookingSchema,
    );
    expect(booking).toEqual(payload);

    const res = await bookingClient.get(bookingid);
    expect(res.status()).toBe(200);
    expect(await readJson(res, BookingSchema)).toEqual(payload);
  });

  test('PUT replaces the whole booking', async ({ bookingClient }) => {
    const { bookingid } = await readJson(
      await bookingClient.create(buildBooking()),
      CreatedBookingSchema,
    );
    const replacement = buildBooking({ firstname: 'Updated' });

    const res = await bookingClient.update(bookingid, replacement);
    expect(res.status()).toBe(200);
    expect(await readJson(res, BookingSchema)).toEqual(replacement);
    expect(await readJson(await bookingClient.get(bookingid), BookingSchema)).toEqual(replacement);
  });

  test('PATCH changes only the given fields', async ({ bookingClient }) => {
    const original = buildBooking();
    const { bookingid } = await readJson(
      await bookingClient.create(original),
      CreatedBookingSchema,
    );

    const patched = { ...original, firstname: 'Patched' };

    const res = await bookingClient.patch(bookingid, { firstname: 'Patched' });
    expect(res.status()).toBe(200);
    expect(await readJson(res, BookingSchema)).toEqual(patched);
    expect(await readJson(await bookingClient.get(bookingid), BookingSchema)).toEqual(patched);
  });

  test('DELETE removes the booking', async ({ bookingClient }) => {
    const { bookingid } = await readJson(
      await bookingClient.create(buildBooking()),
      CreatedBookingSchema,
    );

    // Documented quirk: successful DELETE returns 201, not 200/204.
    expect((await bookingClient.delete(bookingid)).status()).toBe(201);
    expect((await bookingClient.get(bookingid)).status()).toBe(404);
  });

  test('cleanup tolerates a booking that is already gone', async ({
    request,
    token,
    bookingClient,
  }) => {
    const { bookingid } = await readJson(
      await bookingClient.create(buildBooking()),
      CreatedBookingSchema,
    );
    // Delete it behind this client's back, the way the demo API's periodic reset does.
    expect((await new BookingClient(request, token).delete(bookingid)).ok()).toBe(true);

    await expect(bookingClient.cleanup()).resolves.toBeUndefined();
  });
});
