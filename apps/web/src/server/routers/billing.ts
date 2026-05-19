// Billing router — user-facing balance, history, packages and payments.
// Admin-only operations (manual grant, company details edit, provider
// credentials, package CRUD) live in the admin router.

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "../db";
import { getBalance, getHistory, PRICING_TABLE } from "../services/tokenService";
import { createPayment, applyProviderUpdate } from "../services/billing/paymentService";
import { listEnabledProviders, getProvider } from "../services/billing/registry";

export const billingRouter = router({
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    return { tokens: await getBalance(ctx.user.id) };
  }),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
    .query(({ ctx, input }) => getHistory(ctx.user.id, input?.limit ?? 30)),

  getPricing: protectedProcedure.query(() => PRICING_TABLE),

  /** Public list of token packages for sale. */
  getPackages: protectedProcedure.query(() =>
    prisma.tokenPackage.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    })
  ),

  /** Public list of enabled providers (slug + display name). */
  getProviders: protectedProcedure.query(() => listEnabledProviders()),

  /** Public company details — used to render invoices on the user side. */
  getCompanyDetails: protectedProcedure.query(async () => {
    return prisma.companyDetails.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
  }),

  /** Create a payment and get a confirmation URL to redirect to. */
  createPayment: protectedProcedure
    .input(
      z.object({
        packageSlug: z.string(),
        providerSlug: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "NEXT_PUBLIC_APP_URL is not configured on the server.",
        });
      }
      try {
        return await createPayment({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          packageSlug: input.packageSlug,
          providerSlug: input.providerSlug,
          appUrl,
        });
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to create payment",
        });
      }
    }),

  /** Polled by /billing/success while we wait for the webhook. */
  getPayment: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const payment = await prisma.payment.findUnique({
        where: { id: input.paymentId },
        include: { package: true },
      });
      if (!payment || payment.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }
      return payment;
    }),

  /**
   * Force-refresh a still-pending payment from the provider. Useful when
   * the user lands on /billing/success before the webhook arrived.
   */
  refreshPayment: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
      if (!payment || payment.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }
      if (payment.status === "SUCCEEDED" || payment.status === "FAILED" || payment.status === "CANCELED") {
        return { status: payment.status };
      }
      if (!payment.externalId) {
        return { status: payment.status };
      }
      try {
        const provider = await getProvider(payment.providerSlug);
        // Re-use parseWebhook by feeding it a synthetic notification body —
        // for YooKassa it re-fetches the canonical payment by externalId.
        const fakeBody = JSON.stringify({
          type: "notification",
          event: "manual_refresh",
          object: { id: payment.externalId },
        });
        const event = await provider.parseWebhook({ rawBody: fakeBody, headers: {} });
        const out = await applyProviderUpdate({
          externalId: event.externalId,
          status: event.status === "PENDING" ? "WAITING" : event.status,
          rawPayload: event.rawPayload,
        });
        return { status: out.payment.status };
      } catch {
        return { status: payment.status };
      }
    }),
});
