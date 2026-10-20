import { z } from 'zod';

/**
 * Response contracts for /booking. Schemas are the single source of truth: tests validate responses
 * against them, and the TypeScript types below are inferred from them (no drift between the two).
 */
export const BookingDatesSchema = z.strictObject({
  checkin: z.iso.date(),
  checkout: z.iso.date(),
});

export const BookingSchema = z.strictObject({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  totalprice: z.number().int().nonnegative(),
  depositpaid: z.boolean(),
  bookingdates: BookingDatesSchema,
  additionalneeds: z.string().optional(),
});

export const CreatedBookingSchema = z.strictObject({
  bookingid: z.number().int().positive(),
  booking: BookingSchema,
});

export const BookingIdListSchema = z.array(
  z.strictObject({ bookingid: z.number().int().positive() }),
);

export type Booking = z.infer<typeof BookingSchema>;
