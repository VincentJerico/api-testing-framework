import { test, expect } from '../src/fixtures/api.js';
import {
  BookingIdListSchema,
  BookingSchema,
  CreatedBookingSchema,
} from '../src/schemas/booking.schema.js';
import { buildBooking } from '../src/data/bookingFactory.js';
import { readJson } from '../src/http/readJson.js';

test.describe('Booking contract @contract', () => {
  test('GET /booking lists the id of a booking just created', async ({ bookingClient }) => {
    const { bookingid } = await readJson(
      await bookingClient.create(buildBooking()),
      CreatedBookingSchema,
    );
    const res = await bookingClient.list();
    expect(res.status()).toBe(200);
    await expect(res).toMatchSchema(BookingIdListSchema);
    expect(await readJson(res, BookingIdListSchema)).toContainEqual({ bookingid });
  });

  test('POST /booking returns the created-booking envelope', async ({ bookingClient }) => {
    const res = await bookingClient.create(buildBooking());
    expect(res.status()).toBe(200);
    await expect(res).toMatchSchema(CreatedBookingSchema);
  });

  test('GET /booking/:id returns a booking matching the schema', async ({ bookingClient }) => {
    const { bookingid } = await readJson(
      await bookingClient.create(buildBooking()),
      CreatedBookingSchema,
    );
    const res = await bookingClient.get(bookingid);
    expect(res.status()).toBe(200);
    await expect(res).toMatchSchema(BookingSchema);
  });
});
