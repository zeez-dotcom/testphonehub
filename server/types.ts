import type { Request } from "express";

export interface AuthenticatedUser {
  userId: string;
  userRole: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

