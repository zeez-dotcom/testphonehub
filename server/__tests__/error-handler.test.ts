import { describe, it, expect } from 'vitest';
import express from 'express';

function createTestServer() {
  const app = express();

  app.get('/error', (_req, _res, next) => {
    next(new Error('boom'));
  });

  app.get('/ok', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    console.error(err);
    res.status(status).json({ message });
  });

  const server = app.listen(0);
  const port = (server.address() as any).port;
  return { server, port };
}

describe('error handler', () => {
  it('keeps server running after an error response', async () => {
    const { server, port } = createTestServer();
    const base = `http://127.0.0.1:${port}`;

    const errRes = await fetch(`${base}/error`);
    expect(errRes.status).toBe(500);
    const errBody = await errRes.json();
    expect(errBody.message).toBe('boom');

    const okRes = await fetch(`${base}/ok`);
    expect(okRes.status).toBe(200);
    const okBody = await okRes.json();
    expect(okBody.ok).toBe(true);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
