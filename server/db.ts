import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres';
if (!process.env.DATABASE_URL) {
  console.warn(
    'DATABASE_URL is not set, falling back to local PostgreSQL instance',
  );
}

const { Pool } = pg;
export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
