import { test, expect } from '../src/fixtures/api.js';
import { BookingClient } from '../src/clients/BookingClient.js';
import { buildBooking } from '../src/data/bookingFactory.js';

test.describe('Booking negative & access control @negative', () => {
  test('an unknown id returns 404', async ({ bookingClient }) => {
    expect((await bookingClient.get(999_999_999)).status()).toBe(404);
  });

  test('PUT without auth is rejected and changes nothing', async ({ bookingClient }) => {
    const original = buildBooking();
    const { bookingid } = await (await bookingClient.create(original)).json();

    const res = await bookingClient.update(bookingid, buildBooking({ firstname: 'Hijack' }), {
      auth: false,
    });
    expect(res.status()).toBe(403);
    // Side effect: the record is untouched, not just "a 403 came back".
    expect(await (await bookingClient.get(bookingid)).json()).toEqual(original);
  });

  test('DELETE without auth is rejected and the booking survives', async ({ bookingClient }) => {
    const { bookingid } = await (await bookingClient.create(buildBooking())).json();

    expect((await bookingClient.delete(bookingid, { auth: false })).status()).toBe(403);
    expect((await bookingClient.get(bookingid)).status()).toBe(200);
  });

  test('an invalid token is rejected', async ({ request, bookingClient }) => {
    const { bookingid } = await (await bookingClient.create(buildBooking())).json();
    const intruder = new BookingClient(request, 'not-a-real-token');

    expect((await intruder.update(bookingid, buildBooking())).status()).toBe(403);
  });

  test('a malformed create is rejected', async ({ bookingClient }) => {
    const res = await bookingClient.create({ firstname: 'OnlyName' });
    // Documented quirk: the API returns 500 here; a well-behaved API would return 400.
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
