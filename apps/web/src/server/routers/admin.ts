/**
 * @module admin router
 * @description Admin endpoints for managing user token balances.
 * Protected by SUPERADMIN role OR ADMIN_SECRET header.
 */

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "../db";
import { topUp, setBalance, getHistory, getBalance, PRICING_TABLE } from "../services/tokenService";

/** Middleware: verify admin access via role or secret */
function verifyAdmin(ctx: any) {
  const role = ctx.user?.role;
  const headerSecret = ctx.req?.headers?.get?.("x-admin-secret");
  const envSecret = process.env.ADMIN_SECRET;

  const isSuperadmin = role === "SUPERADMIN" || role === "ADMIN";
  const hasValidSecret = envSecret && headerSecret === envSecret;

  if (!isSuperadmin && !hasValidSecret) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

export const adminRouter = router({
  /** List all users with their token balances */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    verifyAdmin(ctx);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        tokenBalance: { select: { tokens: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      tokens: u.tokenBalance?.tokens ?? 0,
    }));
  }),

  /** Adjust (add or subtract) tokens for a user */
  adjustBalance: protectedProcedure
    .input(z.object({
      userId: z.string(),
      amount: z.number().int(), // positive = add, negative = subtract
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      verifyAdmin(ctx);

      if (input.amount === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Amount cannot be 0" });

      if (input.amount > 0) {
        const result = await topUp(
          input.userId,
          input.amount,
          "PURCHASE",
          input.reason || `Admin top-up by ${ctx.user.email}`
        );
        return { success: true, newBalance: result.newBalance, action: "topup", amount: input.amount };
      } else {
        // Deduction
        const result = await topUp(
          input.userId,
          input.amount, // negative
          "REFUND",
          input.reason || `Admin deduction by ${ctx.user.email}`
        );
        return { success: true, newBalance: result.newBalance, action: "deduct", amount: input.amount };
      }
    }),

  /** Force-set a user's balance */
  setBalance: protectedProcedure
    .input(z.object({
      userId: z.string(),
      tokens: z.number().int().min(0),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      verifyAdmin(ctx);

      const result = await setBalance(
        input.userId,
        input.tokens,
        input.reason || `Admin set balance by ${ctx.user.email}`
      );
      return { success: true, newBalance: result.newBalance };
    }),

  /** Get transaction history for a specific user */
  getUserHistory: protectedProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      verifyAdmin(ctx);
      return getHistory(input.userId, input.limit);
    }),

  /** Get pricing reference table */
  getPricing: protectedProcedure.query(async () => {
    return PRICING_TABLE;
  }),
});
