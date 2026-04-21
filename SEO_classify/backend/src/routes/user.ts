import { Router } from 'express';
import { optionalAuth } from '../lib/middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get current user profile + token balance
router.get('/me', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.json({ user: null, balance: null });
  }

  const balance = await prisma.tokenBalance.findUnique({
    where: { userId: req.user.id },
  });

  const recent = await prisma.tokenTransaction.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  res.json({
    user: req.user,
    balance: balance?.tokens ?? 0,
    transactions: recent.map((t: any) => ({
      id: t.id,
      amount: t.amount,
      reason: t.reason,
      createdAt: t.createdAt,
    })),
  });
});

export default router;
