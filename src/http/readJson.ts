import type { APIResponse } from '@playwright/test';
import type { z } from 'zod';

/** One line per violated field, e.g. `  • booking.totalprice: Invalid input: expected number`. */
export function formatIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => `  • ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

/** Thrown when a response body doesn't match its contract. Lists every violated field path. */
export class ContractError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly issues: readonly z.core.$ZodIssue[],
  ) {
    super(`${status} ${url} broke its contract:\n${formatIssues(issues)}`);
    this.name = 'ContractError';
  }
}

/**
 * Parse a response body and validate it against its schema. Returns a typed value, so tests never
 * touch the `any` that `res.json()` returns, and every body a test reads is also a contract check.
 *
 *   const { bookingid } = await readJson(await bookingClient.create(payload), CreatedBookingSchema);
 */
export async function readJson<S extends z.ZodType>(
  res: APIResponse,
  schema: S,
): Promise<z.output<S>> {
  const result = schema.safeParse(await res.json());
  if (!result.success) throw new ContractError(res.status(), res.url(), result.error.issues);
  return result.data;
}
