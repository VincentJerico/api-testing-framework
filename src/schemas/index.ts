import type { z } from 'zod';
import { AuthFailureSchema, AuthTokenSchema } from './auth.schema.js';
import { BookingIdListSchema, BookingSchema, CreatedBookingSchema } from './booking.schema.js';

/**
 * Every response contract, by the file name it's published under in docs/schemas/. Teams that
 * don't use TypeScript can validate against those JSON Schema files instead of the Zod source.
 */
export const CONTRACTS: Record<string, z.ZodType> = {
  'auth-token': AuthTokenSchema,
  'auth-failure': AuthFailureSchema,
  booking: BookingSchema,
  'created-booking': CreatedBookingSchema,
  'booking-id-list': BookingIdListSchema,
};
