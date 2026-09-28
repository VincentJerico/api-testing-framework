import { test, expect } from '../src/fixtures/api.js';
import { buildBooking } from '../src/data/bookingFactory.js';

test.describe('Booking CRUD', () => {
  test('create then read returns the same booking @smoke', async ({ bookingClient }) => {
    const payload = buildBooking();
    const { bookingid, booking } = await (await bookingClient.create(payload)).json();
    expect(booking).toEqual(payload);

    const res = await bookingClient.get(bookingid);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual(payload);
  });

  test('PUT replaces the whole booking', async ({ bookingClient }) => {
    const { bookingid } = await (await bookingClient.create(buildBooking())).json();
    const replacement = buildBooking({ firstname: 'Updated' });

    const res = await bookingClient.update(bookingid, replacement);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual(replacement);
    expect(await (await bookingClient.get(bookingid)).json()).toEqual(replacement);
  });

  test('PATCH changes only the given fields', async ({ bookingClient }) => {
    const original = buildBooking();
    const { bookingid } = await (await bookingClient.create(original)).json();

    const patched = { ...original, firstname: 'Patched' };

    const res = await bookingClient.patch(bookingid, { firstname: 'Patched' });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual(patched);
    expect(await (await bookingClient.get(bookingid)).json()).toEqual(patched);
  });

  test('DELETE removes the booking', async ({ bookingClient }) => {
    const { bookingid } = await (await bookingClient.create(buildBooking())).json();

    // Documented quirk: successful DELETE returns 201, not 200/204.
    expect((await bookingClient.delete(bookingid)).status()).toBe(201);
    expect((await bookingClient.get(bookingid)).status()).toBe(404);
  });
});
