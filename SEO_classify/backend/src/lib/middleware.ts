import type { Request, Response, NextFunction } from 'express';
import { auth } from './auth.js';
import { toNodeHandler } from 'better-auth/node';
import prisma from './prisma.js';

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string; plan: string };
      tokenBalance?: number;
    }
  }
}

/**
 * Optional auth middleware — attaches user to req if session is valid.
 * Does NOT block unauthenticated requests (use requireAuth for that).
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (session?.user) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        plan: (session.user as any).plan || 'FREE',
      };
    }
  } catch {
    // No valid session — continue as anonymous
  }
  next();
}

/**
 * Blocks unauthenticated requests.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  await optionalAuth(req, res, async () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Необходимо войти в систему' });
    }
    next();
  });
}

/**
 * Checks that the user has enough tokens for an AI operation.
 * Attaches tokenBalance to req.
 */
export async function requireTokens(cost: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Необходимо войти в систему' });
    }

    const balance = await prisma.tokenBalance.findUnique({
      where: { userId: req.user.id },
    });

    if (!balance || balance.tokens < cost) {
      return res.status(402).json({
        error: 'Недостаточно токенов',
        balance: balance?.tokens ?? 0,
        required: cost,
      });
    }

    req.tokenBalance = balance.tokens;
    next();
  };
}

/**
 * Deducts tokens from user balance and logs the transaction.
 */
export async function spendTokens(
  userId: string,
  amount: number,
  reason: 'AI_CATEGORIES' | 'AI_CLASSIFY'
) {
  await prisma.$transaction([
    prisma.tokenBalance.update({
      where: { userId },
      data: { tokens: { decrement: amount } },
    }),
    prisma.tokenTransaction.create({
      data: { userId, amount: -amount, reason },
    }),
  ]);
}

export { toNodeHandler };
