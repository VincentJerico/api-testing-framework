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

  test('an invalid token is rejected and changes nothing', async ({ request, bookingClient }) => {
    const original = buildBooking();
    const { bookingid } = await (await bookingClient.create(original)).json();
    const intruder = new BookingClient(request, 'not-a-real-token');

    const res = await intruder.update(bookingid, buildBooking({ firstname: 'Hijack' }));
    expect(res.status()).toBe(403);
    expect(await (await bookingClient.get(bookingid)).json()).toEqual(original);
  });

  test('a malformed create is rejected and stores nothing', async ({ bookingClient }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'Malformed POST /booking returns 500; a well-behaved API would return 400.',
    });
    const firstname = `Malformed-${crypto.randomUUID()}`;

    expect((await bookingClient.create({ firstname })).status()).toBe(500);

    // A valid booking under the same name proves the firstname filter finds matches, so the
    // exact list below shows the malformed body was not stored.
    const { bookingid } = await (await bookingClient.create(buildBooking({ firstname }))).json();
    expect(await (await bookingClient.list({ firstname })).json()).toEqual([{ bookingid }]);
  });
});
