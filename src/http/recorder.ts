import type { APIRequestContext, APIResponse } from '@playwright/test';

/** One API call as it appears in the `api-calls.json` attachment. Secrets are already redacted. */
export interface ApiCall {
  method: string;
  url: string;
  params?: unknown;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  status?: number;
  durationMs: number;
  responseBody?: unknown;
  error?: string;
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch'] as const;
const SECRET_KEYS = new Set(['token', 'password']);
const MAX_BODY_CHARS = 2_000;
export const REDACTED = '[redacted]';

/** Replaces token/password values in a JSON-like value, at any depth. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, SECRET_KEYS.has(key) ? REDACTED : redact(v)]),
    );
  }
  return value;
}

function redactHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => {
      const lower = name.toLowerCase();
      if (lower === 'authorization') return [name, REDACTED];
      if (lower === 'cookie') return [name, value.replace(/token=[^;]*/g, `token=${REDACTED}`)];
      return [name, value];
    }),
  );
}

async function readBody(res: APIResponse): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (text === '') return undefined;
  try {
    return redact(JSON.parse(text));
  } catch {
    return text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}… (truncated)` : text;
  }
}

type Options = {
  data?: unknown;
  params?: unknown;
  headers?: Record<string, string>;
  method?: string;
};

/**
 * Wraps a request context so every call is appended to `calls`. Clients and tests use it exactly
 * like the original; only the seven request methods are intercepted.
 */
export function recordCalls(ctx: APIRequestContext, calls: ApiCall[]): APIRequestContext {
  return new Proxy(ctx, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (!(METHODS as readonly PropertyKey[]).includes(prop) || typeof original !== 'function') {
        return typeof original === 'function' ? original.bind(target) : original;
      }
      return async (url: string, options: Options = {}) => {
        const call: ApiCall = {
          method: (prop === 'fetch' ? (options.method ?? 'GET') : String(prop)).toUpperCase(),
          url,
          params: options.params,
          requestHeaders: options.headers ? redactHeaders(options.headers) : undefined,
          requestBody: options.data === undefined ? undefined : redact(options.data),
          durationMs: 0,
        };
        calls.push(call);
        const started = performance.now();
        try {
          const res: APIResponse = await original.call(target, url, options);
          call.durationMs = Math.round(performance.now() - started);
          call.url = res.url();
          call.status = res.status();
          call.responseBody = await readBody(res);
          return res;
        } catch (err) {
          call.durationMs = Math.round(performance.now() - started);
          call.error = err instanceof Error ? err.message : String(err);
          throw err;
        }
      };
    },
  });
}
