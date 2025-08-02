import { describe, it, expect } from 'vitest';
import type { AuthenticatedUser } from '../types';

describe('math', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2);
  });
});

describe('types', () => {
  it('creates an authenticated user object', () => {
    const user: AuthenticatedUser = { userId: '1', userRole: 'admin' };
    expect(user.userId).toBe('1');
  });
});

