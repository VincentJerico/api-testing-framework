# API Testing Framework

[![CI](https://github.com/VincentJerico/api-testing-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/VincentJerico/api-testing-framework/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white)

A reusable, typed API test framework built on Playwright's `request` API. It's the layer I'd put
between a test suite and a REST API. It has typed clients, contract checks with Zod schemas, auth
handled by fixtures, realistic test data, and cleanup that fails the test if anything is left behind.

> The demo target is the public [Restful-Booker](https://restful-booker.herokuapp.com) API. To test
> your own API, set `BASE_URL` and add clients and schemas.

## How it's organized

| Pattern              | Where                            | Why                                                                        |
| -------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| Typed API clients    | `src/clients/`                   | Endpoints live in one place; tests read like behavior, not URLs            |
| Schemas as contracts | `src/schemas/`                   | Zod checks responses, and the TS types come from the same schema           |
| Typed reads          | `src/http/readJson.ts`           | Every body a test reads is validated and typed; no `any` from `res.json()` |
| Custom matcher       | `src/matchers/schema.ts`         | `await expect(res).toMatchSchema(Schema)` with readable field-level errors |
| Request log          | `src/http/recorder.ts`           | A failed test's report shows every call it made, secrets redacted          |
| Published contracts  | `docs/schemas/`                  | The Zod contracts as JSON Schema, for teams that don't use TypeScript      |
| Self-tests           | `tests/selftest/`                | Offline proof that the matcher, cleanup and redaction can fail             |
| Auth fixture         | `src/fixtures/api.ts`            | The token is fetched once per worker and passed in for you                 |
| Auto cleanup         | `BookingClient.cleanup()`        | Every booking a test creates is deleted, and a leftover fails the test     |
| Data factories       | `src/data/bookingFactory.ts`     | Faker data with valid, ordered dates; override any field                   |
| Tags                 | `@smoke` `@contract` `@negative` | Run focused subsets                                                        |
| Quality gates        | ESLint, Prettier, `tsc`, CI      | Lint, format, typecheck and self-tests all gate the build                  |

## What a contract failure looks like

When the API drifts from its contract, the matcher points at every broken field:

```
schema validation failed:
  • lastname: Too small: expected string to have >=1 characters
  • totalprice: Invalid input: expected number, received string
  • bookingdates.checkin: expected a YYYY-MM-DD date
```

## Getting started

```bash
npm install
npm test                 # everything (no browser needed)
npm run test:self        # offline self-tests: does each gate still fail when it should?
npm run test:api         # the API suite only
npm run test:smoke       # @smoke subset
npm run test:contract    # schema/contract checks
npm run test:negative    # negative + access-control checks
npm run schemas:update   # regenerate docs/schemas after changing a contract
npm run report           # open the HTML report
```

Configure via env vars (see `.env.example`): `BASE_URL`, `API_USERNAME`, `API_PASSWORD`.

To run against your own copy of the API instead of the shared demo (this is what CI does):

```bash
docker run --rm -p 3001:3001 mwinteringham/restfulbooker
BASE_URL=http://localhost:3001 npm run test:api
```

## Writing a test

```ts
import { test, expect } from '../src/fixtures/api.js';
import { readJson } from '../src/http/readJson.js';
import { BookingSchema, CreatedBookingSchema } from '../src/schemas/booking.schema.js';
import { buildBooking } from '../src/data/bookingFactory.js';

test('a created booking can be read back', async ({ bookingClient }) => {
  const payload = buildBooking({ firstname: 'Vincent' });
  const { bookingid } = await readJson(await bookingClient.create(payload), CreatedBookingSchema);

  const res = await bookingClient.get(bookingid);
  expect(res.status()).toBe(200);
  expect(await readJson(res, BookingSchema)).toEqual(payload);
}); // the booking is deleted automatically after the test
```

`readJson` returns a typed value and throws a `ContractError` if the body breaks its contract, so
every read is also a contract check. Use `toMatchSchema` when the contract is what the test is about.

## Debugging a failure

Every call a test makes goes through a recording wrapper on the `request` fixture. When a test
fails, its report entry gets an `api-calls.json` attachment with the method, URL, query, status,
duration and both bodies of each call, including the cleanup after the test. Tokens and passwords
are replaced with `[redacted]`. Set `API_LOG=always` to attach it to passing tests too.

```json
{
  "method": "PUT",
  "url": ".../booking/3620",
  "status": 403,
  "durationMs": 257,
  "requestHeaders": { "Cookie": "token=[redacted]" },
  "responseBody": "Forbidden"
}
```

That entry is from the "invalid token is rejected" test against the live API (request body left out
here).

## Structure

```
api-testing-framework/
├── playwright.config.ts          # baseURL + default headers, reporters
├── src/
│   ├── config/env.ts             # env-driven config
│   ├── clients/                  # BaseClient · AuthClient · BookingClient
│   ├── schemas/                  # Zod contracts (+ inferred types), index.ts lists them all
│   ├── http/readJson.ts          # parse + validate + type a response body
│   ├── http/recorder.ts          # request log behind api-calls.json
│   ├── matchers/schema.ts        # toMatchSchema custom matcher
│   ├── fixtures/api.ts           # request (recorded) · token (worker) · authClient · bookingClient
│   └── data/bookingFactory.ts    # faker data builder
├── docs/schemas/                 # the contracts as JSON Schema (generated, checked by a self-test)
└── tests/
    ├── selftest/                 # offline: stub server, gates must fail, schemas not stale
    ├── health.spec.ts            # @smoke
    ├── auth.spec.ts              # token contract + bad/missing credentials
    ├── booking.crud.spec.ts      # create · read · put · patch · delete
    ├── booking.contract.spec.ts  # @contract schema checks
    └── booking.negative.spec.ts  # @negative 404, no-auth, invalid token, malformed input
```

## Documented API quirks

The tests pin the demo API's **actual** behavior and flag where a well-behaved API would differ:

| Behavior                        | Actual           | Expected in a real API |
| ------------------------------- | ---------------- | ---------------------- |
| `GET /ping`                     | `201`            | `200`                  |
| Bad credentials on `POST /auth` | `200` + `reason` | `401`                  |
| Successful `DELETE`             | `201`            | `200` / `204`          |
| Malformed `POST /booking`       | `500`            | `400`                  |

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) has three layers:

1. **Quality:** lint, format, typecheck and the offline self-tests. Nothing else runs unless they
   pass.
2. **Every push and PR** runs the API suite against Restful-Booker in a Docker service container.
   The result depends on this repo's code, not on the shared public demo being up or freshly reset.
3. **Weekly** (and on a manual run with `live: true`) the suite runs against the live public API to
   catch contract drift when the code hasn't changed. If the weekly run fails, CI opens a
   "Contract drift" issue, or comments on the open one, with a link to the run and its report.

## Design note

`toMatchSchema` takes the `APIResponse` rather than the parsed body on purpose: Playwright drops custom
matchers from the typings when the received value is `any`, and `res.json()` returns `any`. Passing the
typed response keeps assertions type-safe. The `typecheck` gate caught this during development.
