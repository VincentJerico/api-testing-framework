import { test, expect } from '../src/fixtures/api.js';
import {
  BookingIdListSchema,
  BookingSchema,
  CreatedBookingSchema,
} from '../src/schemas/booking.schema.js';
import { buildBooking } from '../src/data/bookingFactory.js';

test.describe('Booking contract @contract', () => {
  test('GET /booking returns a list of booking ids', async ({ bookingClient }) => {
    const res = await bookingClient.list();
    expect(res.status()).toBe(200);
    await expect(res).toMatchSchema(BookingIdListSchema);
  });

  test('POST /booking returns the created-booking envelope', async ({ bookingClient }) => {
    const res = await bookingClient.create(buildBooking());
    expect(res.status()).toBe(200);
    await expect(res).toMatchSchema(CreatedBookingSchema);
  });

  test('GET /booking/:id returns a booking matching the schema', async ({ bookingClient }) => {
    const { bookingid } = await (await bookingClient.create(buildBooking())).json();
    const res = await bookingClient.get(bookingid);
    expect(res.status()).toBe(200);
    await expect(res).toMatchSchema(BookingSchema);
  });
});
