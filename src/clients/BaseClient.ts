import type { APIRequestContext } from '@playwright/test';

/** Base for all API clients: holds the Playwright request context (baseURL + default headers). */
export abstract class BaseClient {
  constructor(protected readonly request: APIRequestContext) {}
}
