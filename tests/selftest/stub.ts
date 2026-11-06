import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export type Handler = (req: IncomingMessage, res: ServerResponse) => void;

/** Reply with JSON and a status code. */
export function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * A throwaway local HTTP server for self-tests. Routes are keyed "METHOD /path"; anything else
 * answers 404. Nothing leaves the machine.
 */
export async function startStub(routes: Record<string, Handler>) {
  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://stub').pathname;
    const handler = routes[`${req.method} ${path}`];
    if (handler) handler(req, res);
    else json(res, 404, { error: 'no stub route' });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
