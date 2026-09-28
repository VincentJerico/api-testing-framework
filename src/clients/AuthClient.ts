import type { APIResponse } from '@playwright/test';
import { BaseClient } from './BaseClient.js';

export interface Credentials {
  username: string;
  password: string;
}

/** Client for POST /auth. */
export class AuthClient extends BaseClient {
  /** Raw call — use in tests that assert on the auth response itself. */
  createToken(credentials: Partial<Credentials>): Promise<APIResponse> {
    return this.request.post('/auth', { data: credentials });
  }

  /** Convenience for fixtures: returns the token or throws with the API's reason. */
  async getToken(credentials: Credentials): Promise<string> {
    const res = await this.createToken(credentials);
    const body = await res.json();
    if (!res.ok() || typeof body?.token !== 'string') {
      throw new Error(`Auth failed (${res.status()}): ${JSON.stringify(body)}`);
    }
    return body.token;
  }
}
