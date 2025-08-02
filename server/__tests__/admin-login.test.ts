import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';

vi.mock('../storage', () => {
  const users = new Map<string, any>();
  return {
    storage: {
      getUserByEmail: async (email: string) => users.get(email),
      createUser: async (userData: any) => {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = { id: 'admin-id', ...userData, password: hashedPassword };
        users.set(userData.email, user);
        return user;
      },
    },
  };
});

let registerRoutes: any;

describe('admin login', () => {
  const app = express();
  let server: any;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'secret';
    ({ registerRoutes } = await import('../routes'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    server = await registerRoutes(app);
  });

  afterAll(() => {
    server.close();
  });

  it('logs in with valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('admin@example.com');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.token).toBeDefined();
  });

  it('rejects invalid admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});

