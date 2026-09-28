import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseClient } from './BaseClient.js';
import type { Booking } from '../schemas/booking.schema.js';

interface RequestOptions {
  /** Send the auth token (default true). Set false to test unauthenticated access. */
  auth?: boolean;
}

/**
 * Typed client for /booking. Methods return the raw APIResponse so tests can assert on status,
 * headers and body. Every booking it creates is tracked, so `cleanup()` can remove them afterwards.
 */
export class BookingClient extends BaseClient {
  private readonly created = new Set<number>();

  constructor(
    request: APIRequestContext,
    private readonly token?: string,
  ) {
    super(request);
  }

  private authHeaders(auth = true): Record<string, string> {
    return auth && this.token ? { Cookie: `token=${this.token}` } : {};
  }

  list(): Promise<APIResponse> {
    return this.request.get('/booking');
  }

  get(id: number): Promise<APIResponse> {
    return this.request.get(`/booking/${id}`);
  }

  async create(booking: unknown): Promise<APIResponse> {
    const res = await this.request.post('/booking', { data: booking });
    if (res.ok()) {
      const body = await res.json();
      if (typeof body?.bookingid === 'number') this.created.add(body.bookingid);
    }
    return res;
  }

  update(id: number, booking: Booking, { auth = true }: RequestOptions = {}): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, { data: booking, headers: this.authHeaders(auth) });
  }

  patch(
    id: number,
    changes: Partial<Booking>,
    { auth = true }: RequestOptions = {},
  ): Promise<APIResponse> {
    return this.request.patch(`/booking/${id}`, { data: changes, headers: this.authHeaders(auth) });
  }

  async delete(id: number, { auth = true }: RequestOptions = {}): Promise<APIResponse> {
    const res = await this.request.delete(`/booking/${id}`, { headers: this.authHeaders(auth) });
    if (res.ok()) this.created.delete(id);
    return res;
  }

  /** Best-effort removal of everything this client created — keeps the shared API tidy. */
  async cleanup(): Promise<void> {
    for (const id of this.created) {
      await this.request
        .delete(`/booking/${id}`, { headers: this.authHeaders(true) })
        .catch(() => undefined);
    }
    this.created.clear();
  }
}
