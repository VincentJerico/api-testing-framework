import { expect as baseExpect, type APIResponse } from '@playwright/test';
import type { z } from 'zod';

function isAPIResponse(value: unknown): value is APIResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as APIResponse).json === 'function' &&
    typeof (value as APIResponse).status === 'function'
  );
}

/**
 * Custom async matcher: `await expect(res).toMatchSchema(Schema)`.
 * Accepts an APIResponse (its JSON body is parsed for you) or an already-parsed value.
 * On failure it lists every violated field path, e.g.
 *   schema validation failed:
 *     • booking.totalprice: Invalid input: expected number, received string
 *
 * Why accept the response: Playwright drops custom matchers from the typings when the received
 * value is `any` — and `res.json()` returns `any`. Passing the typed APIResponse keeps it type-safe.
 */
export const expect = baseExpect.extend({
  async toMatchSchema(received: unknown, schema: z.ZodType) {
    const value = isAPIResponse(received) ? await received.json() : received;
    const result = schema.safeParse(value);
    if (result.success) {
      return {
        pass: true,
        name: 'toMatchSchema',
        message: () => 'expected value NOT to match the schema, but it did',
      };
    }
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    return {
      pass: false,
      name: 'toMatchSchema',
      message: () => `schema validation failed:\n${issues}`,
    };
  },
});
