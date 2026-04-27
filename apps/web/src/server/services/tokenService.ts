// ─── Token Billing Service ──────────────────────────────────────────────────
// Handles token balance, deductions, and top-ups for AI operations.
// Uses atomic Prisma transactions to prevent race conditions.

import { prisma } from "../db";

/** Conversion rate: internal pricing multiplier */
const USD_TO_TOKENS = 2000;

/** Minimum token deduction for any operation (prevents rounding to 0) */
const MIN_DEDUCTION = 1;

/** Default signup bonus */
export const SIGNUP_BONUS = 2000;

/**
 * Convert USD cost from OpenRouter to SEOSH tokens.
 * Rounds up to at least MIN_DEDUCTION.
 */
export function usdToTokens(costUsd: number): number {
  const tokens = Math.ceil(costUsd * USD_TO_TOKENS);
  return Math.max(tokens, MIN_DEDUCTION);
}

/**
 * Get user's current token balance. Auto-creates if not exists.
 */
export async function getBalance(userId: string): Promise<number> {
  const balance = await prisma.tokenBalance.upsert({
    where: { userId },
    create: { userId, tokens: SIGNUP_BONUS },
    update: {},
  });
  return balance.tokens;
}

/**
 * Check if user has enough tokens for an operation.
 * Throws a descriptive error if insufficient.
 */
export async function ensureBalance(userId: string, requiredTokens: number): Promise<void> {
  const current = await getBalance(userId);
  if (current < requiredTokens) {
    throw new Error(
      `Insufficient tokens: you have ${current}, need ${requiredTokens}. Top up in Settings → Billing.`
    );
  }
}

/**
 * Deduct tokens based on actual OpenRouter USD cost.
 * Uses atomic transaction to prevent race conditions.
 * Returns the number of SEOSH tokens deducted and new balance.
 */
export async function deductByCost(
  userId: string,
  costUsd: number,
  reason: string,
  details?: string
): Promise<{ deducted: number; newBalance: number }> {
  const tokensToDeduct = usdToTokens(costUsd);

  return prisma.$transaction(async (tx) => {
    // Get current balance (auto-create if needed)
    const balance = await tx.tokenBalance.upsert({
      where: { userId },
      create: { userId, tokens: SIGNUP_BONUS },
      update: {},
    });

    if (balance.tokens < tokensToDeduct) {
      throw new Error(
        `Insufficient tokens: you have ${balance.tokens}, need ${tokensToDeduct}. Top up in Settings → Billing.`
      );
    }

    // Deduct
    const updated = await tx.tokenBalance.update({
      where: { userId },
      data: { tokens: { decrement: tokensToDeduct } },
    });

    // Log transaction
    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: -tokensToDeduct,
        reason: reason as any,
        details: details || `Cost: $${costUsd.toFixed(6)} → ${tokensToDeduct} tokens`,
      },
    });

    console.log(`[tokens] User ${userId}: -${tokensToDeduct} tokens ($${costUsd.toFixed(6)}) → ${updated.tokens} remaining`);

    return { deducted: tokensToDeduct, newBalance: updated.tokens };
  });
}

/**
 * Top up a user's balance (admin operation).
 */
export async function topUp(
  userId: string,
  amount: number,
  reason: string = "PURCHASE",
  details?: string
): Promise<{ newBalance: number }> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.tokenBalance.upsert({
      where: { userId },
      create: { userId, tokens: SIGNUP_BONUS + amount },
      update: { tokens: { increment: amount } },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: +amount,
        reason: reason as any,
        details: details || `Top up: +${amount} tokens`,
      },
    });

    console.log(`[tokens] User ${userId}: +${amount} tokens → ${updated.tokens} total`);
    return { newBalance: updated.tokens };
  });
}

/**
 * Force-set a user's balance (admin operation).
 */
export async function setBalance(
  userId: string,
  tokens: number,
  details?: string
): Promise<{ newBalance: number }> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.tokenBalance.upsert({
      where: { userId },
      create: { userId, tokens },
      update: { tokens },
    });

    const diff = tokens - (current.tokens === tokens ? 0 : current.tokens);

    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: diff,
        reason: diff >= 0 ? "PURCHASE" : "REFUND",
        details: details || `Admin set balance to ${tokens}`,
      },
    });

    return { newBalance: tokens };
  });
}

/**
 * Get transaction history for a user.
 */
export async function getHistory(
  userId: string,
  limit: number = 50
) {
  return prisma.tokenTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Pricing reference table — estimated SEOSH token costs per operation.
 * Based on typical usage with popular AI models.
 */
export const PRICING_TABLE = {
  signupBonus: `${SIGNUP_BONUS} tokens`,
  estimatedCosts: [
    { operation: "Content Generation", model: "Fast (default)", estimatedTokens: "5-15" },
    { operation: "Content Generation", model: "Advanced", estimatedTokens: "80-120" },
    { operation: "Content Optimization", model: "Fast (default)", estimatedTokens: "5-15" },
    { operation: "Content Optimization", model: "Advanced", estimatedTokens: "60-100" },
    { operation: "SEO AI Analysis", model: "Fast (default)", estimatedTokens: "3-8" },
    { operation: "SEO AI Analysis", model: "Advanced", estimatedTokens: "20-40" },
    { operation: "Idea Generation", model: "Fast (default)", estimatedTokens: "3-8" },
    { operation: "Idea Generation", model: "Advanced", estimatedTokens: "30-50" },
    { operation: "Expert Analysis (Text.ru)", model: "—", estimatedTokens: "0 (uses your API key)" },
  ],
};
