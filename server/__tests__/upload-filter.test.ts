import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { Request } from 'express';

let fileFilter: typeof import('../routes').fileFilter;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
  ({ fileFilter } = await import('../routes'));
});

// Helper to run fileFilter and capture callback results
function runFilter(file: Partial<Express.Multer.File>) {
  const req = {} as Request;
  const cb = vi.fn();
  fileFilter(req, file as Express.Multer.File, cb);
  return cb;
}

describe('fileFilter', () => {
  it('allows files with matching MIME type and extension', () => {
    const cb = runFilter({ originalname: 'test.jpg', mimetype: 'image/jpeg' });
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('rejects files with disallowed MIME type or extension', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cb = runFilter({ originalname: 'malware.exe', mimetype: 'application/x-msdownload' });
    expect(cb).toHaveBeenCalled();
    const errorArg = cb.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('File rejected due to mismatched MIME type or extension')
    );
    logSpy.mockRestore();
  });
});

