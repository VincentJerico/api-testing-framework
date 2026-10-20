# API Testing Framework

[![CI](https://github.com/VincentJerico/api-testing-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/VincentJerico/api-testing-framework/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white)

A **reusable, typed API test framework** built on Playwright's `request` API. It's the layer I'd put
between a test suite and a REST API: typed clients, **schema/contract validation with Zod**, auth
handled by fixtures, realistic test data, and **automatic cleanup** so tests never leak data.

> Demo target: the public [Restful-Booker](https://restful-booker.herokuapp.com) API. Point it at your
> own API via `BASE_URL` and by adding clients + schemas.

## Why it's structured this way

| Pattern                  | Where                            | Why                                                                        |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------- |
| **Typed API clients**    | `src/clients/`                   | Endpoints live in one place; tests read like behavior, not URLs            |
| **Schemas as contracts** | `src/schemas/`                   | Zod validates responses _and_ the TS types are inferred from it — no drift |
| **Custom matcher**       | `src/matchers/schema.ts`         | `await expect(res).toMatchSchema(Schema)` with readable field-level errors |
| **Auth fixture**         | `src/fixtures/api.ts`            | Token fetched **once per worker**, injected automatically                  |
| **Auto cleanup**         | `BookingClient.cleanup()`        | Every booking a test creates is deleted afterwards                         |
| **Data factories**       | `src/data/bookingFactory.ts`     | Faker data with valid, ordered dates; override any field                   |
| **Tags**                 | `@smoke` `@contract` `@negative` | Run focused subsets                                                        |
| **Quality gates**        | ESLint · Prettier · `tsc` · CI   | Lint, format, and typecheck all gate the build                             |

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
npm run test:smoke       # @smoke subset
npm run test:contract    # schema/contract checks
npm run test:negative    # negative + access-control checks
npm run report           # open the HTML report
```

Configure via env vars (see `.env.example`): `BASE_URL`, `API_USERNAME`, `API_PASSWORD`.

## Writing a test

```ts
import { test, expect } from '../src/fixtures/api.js';
import { BookingSchema } from '../src/schemas/booking.schema.js';
import { buildBooking } from '../src/data/bookingFactory.js';

test('a created booking can be read back', async ({ bookingClient }) => {
  const payload = buildBooking({ firstname: 'Vincent' });
  const { bookingid } = await (await bookingClient.create(payload)).json();

  const res = await bookingClient.get(bookingid);
  await expect(res).toMatchSchema(BookingSchema);
  expect(await res.json()).toEqual(payload);
}); // the booking is deleted automatically after the test
```

## Structure

```
api-testing-framework/
├── playwright.config.ts          # baseURL + default headers, reporters
├── src/
│   ├── config/env.ts             # env-driven config
│   ├── clients/                  # BaseClient · AuthClient · BookingClient
│   ├── schemas/                  # Zod contracts (+ inferred types)
│   ├── matchers/schema.ts        # toMatchSchema custom matcher
│   ├── fixtures/api.ts           # token (worker) · authClient · bookingClient (auto-cleanup)
│   └── data/bookingFactory.ts    # faker data builder
└── tests/
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

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs **lint · format · typecheck** first and
starts the API suite only if they pass, so a broken build never hits the live API. It runs on every
push/PR, plus a **weekly scheduled run** against the live API to catch contract drift even when the
code hasn't changed.

## Design note

`toMatchSchema` takes the `APIResponse` rather than the parsed body on purpose: Playwright drops custom
matchers from the typings when the received value is `any`, and `res.json()` returns `any`. Passing the
typed response keeps assertions type-safe — the `typecheck` gate caught this during development.
