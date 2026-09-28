import { z } from 'zod';

/** Response contracts for POST /auth. */
export const AuthTokenSchema = z.object({ token: z.string().min(1) });

export const AuthFailureSchema = z.object({ reason: z.string().min(1) });
