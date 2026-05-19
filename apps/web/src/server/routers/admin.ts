/**
 * @module admin router
 * @description Admin endpoints for managing user token balances.
 * Protected by SUPERADMIN role OR ADMIN_SECRET header.
 */

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "../db";
import { topUp, setBalance, getHistory, PRICING_TABLE } from "../services/tokenService";
import { encrypt } from "../lib/encryption";

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

      const reason = input.amount > 0 ? "ADMIN_GRANT" : "ADMIN_REVOKE";
      const result = await topUp(
        input.userId,
        input.amount,
        reason,
        input.reason || `By ${ctx.user.email}`
      );
      return {
        success: true,
        newBalance: result.newBalance,
        action: input.amount > 0 ? "topup" : "deduct",
        amount: input.amount,
      };
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

  // ─── Company details (singleton row id="default") ─────────────────────────
  getCompanyDetails: protectedProcedure.query(async ({ ctx }) => {
    verifyAdmin(ctx);
    return prisma.companyDetails.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
  }),

  updateCompanyDetails: protectedProcedure
    .input(
      z.object({
        legalName: z.string(),
        shortName: z.string(),
        inn: z.string(),
        kpp: z.string(),
        ogrn: z.string(),
        legalAddress: z.string(),
        postalAddress: z.string(),
        bankName: z.string(),
        accountNumber: z.string(),
        bik: z.string(),
        correspondentAccount: z.string(),
        directorName: z.string(),
        directorTitle: z.string(),
        contactEmail: z.string(),
        contactPhone: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      verifyAdmin(ctx);
      return prisma.companyDetails.upsert({
        where: { id: "default" },
        create: { id: "default", ...input },
        update: input,
      });
    }),

  // ─── Token packages CRUD ──────────────────────────────────────────────────
  listPackages: protectedProcedure.query(async ({ ctx }) => {
    verifyAdmin(ctx);
    return prisma.tokenPackage.findMany({ orderBy: { sortOrder: "asc" } });
  }),

  upsertPackage: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        slug: z.string().regex(/^[a-z0-9_-]+$/, "lowercase letters, digits, _ -"),
        name: z.string().min(1),
        description: z.string().optional(),
        tokens: z.number().int().positive(),
        priceRub: z.number().int().nonnegative(), // in kopecks
        sortOrder: z.number().int().default(0),
        active: z.boolean().default(true),
        highlighted: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      verifyAdmin(ctx);
      const { id, ...data } = input;
      if (id) {
        return prisma.tokenPackage.update({ where: { id }, data });
      }
      return prisma.tokenPackage.create({ data });
    }),

  deletePackage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      verifyAdmin(ctx);
      // Soft delete — keep historical payments linkable, just hide it.
      return prisma.tokenPackage.update({
        where: { id: input.id },
        data: { active: false },
      });
    }),

  // ─── Payment providers ────────────────────────────────────────────────────
  listProviders: protectedProcedure.query(async ({ ctx }) => {
    verifyAdmin(ctx);
    const rows = await prisma.paymentProviderConfig.findMany({ orderBy: { slug: "asc" } });
    // Mask credentials — return only the keys, not the values.
    return rows.map((row) => ({
      ...row,
      credentials: undefined as never,
      credentialKeys: row.credentials && typeof row.credentials === "object"
        ? Object.keys(row.credentials as Record<string, unknown>)
        : [],
    }));
  }),

  updateProvider: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
        enabled: z.boolean(),
        testMode: z.boolean(),
        /** Plain credentials — will be encrypted before storage. Empty value = unchanged. */
        credentials: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      verifyAdmin(ctx);
      const existing = await prisma.paymentProviderConfig.findUnique({ where: { slug: input.slug } });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Provider ${input.slug} not found` });
      }
      const currentCreds =
        existing.credentials && typeof existing.credentials === "object"
          ? (existing.credentials as Record<string, string>)
          : {};
      const newCreds = { ...currentCreds };
      if (input.credentials) {
        for (const [k, v] of Object.entries(input.credentials)) {
          if (v && v.length > 0) {
            newCreds[k] = encrypt(v);
          }
        }
      }
      return prisma.paymentProviderConfig.update({
        where: { slug: input.slug },
        data: {
          enabled: input.enabled,
          testMode: input.testMode,
          credentials: newCreds,
        },
      });
    }),

  // ─── Payment log ──────────────────────────────────────────────────────────
  listPayments: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["PENDING", "WAITING", "SUCCEEDED", "FAILED", "CANCELED", "REFUNDED"])
          .optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      verifyAdmin(ctx);
      return prisma.payment.findMany({
        where: input.status ? { status: input.status } : undefined,
        include: {
          user: { select: { email: true, name: true } },
          package: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  markPaymentSucceeded: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      verifyAdmin(ctx);
      // For manual_invoice flow — admin confirms the bank transfer arrived.
      const { applyProviderUpdate } = await import("../services/billing/paymentService");
      const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      if (!payment.externalId) {
        // manual payments may not have externalId yet — set a synthetic one
        await prisma.payment.update({
          where: { id: payment.id },
          data: { externalId: `manual-${payment.id}` },
        });
      }
      return applyProviderUpdate({
        externalId: payment.externalId ?? `manual-${payment.id}`,
        status: "SUCCEEDED",
      });
    }),
});
