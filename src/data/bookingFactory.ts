import { faker } from '@faker-js/faker';
import type { Booking } from '../schemas/booking.schema.js';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Build a valid booking with realistic data and correctly ordered dates (checkout after checkin).
 * Override any field per test: buildBooking({ firstname: 'Updated' }).
 */
export function buildBooking(overrides: Partial<Booking> = {}): Booking {
  const checkin = faker.date.soon({ days: 30 });
  const checkout = faker.date.soon({ days: 10, refDate: checkin });
  return {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({ min: 50, max: 2000 }),
    depositpaid: faker.datatype.boolean(),
    bookingdates: { checkin: isoDate(checkin), checkout: isoDate(checkout) },
    additionalneeds: faker.helpers.arrayElement(['Breakfast', 'Late checkout', 'Airport transfer']),
    ...overrides,
  };
}
