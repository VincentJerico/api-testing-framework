import { z } from 'zod';

/** Response contracts for POST /auth. */
export const AuthTokenSchema = z.strictObject({ token: z.string().min(1) });

export const AuthFailureSchema = z.strictObject({ reason: z.string().min(1) });
