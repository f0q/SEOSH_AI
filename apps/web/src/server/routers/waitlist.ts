// Waitlist — public sign-up while the product is in private beta.
// Anyone can POST a new entry; admins read/manage them.

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "../db";

function assertAdmin(ctx: { user: { role?: string } }) {
  if (!["ADMIN", "SUPERADMIN"].includes(ctx.user.role ?? "")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
}

export const waitlistRouter = router({
  /** Public: anyone can join the waitlist. */
  join: publicProcedure
    .input(
      z.object({
        email: z.string().email("Введите корректный email"),
        name: z.string().max(120).optional(),
        company: z.string().max(120).optional(),
        message: z.string().max(2000).optional(),
        source: z.string().max(60).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.waitlistEntry.findFirst({
        where: { email: input.email.toLowerCase() },
      });
      if (existing) {
        // Idempotent — we don't reveal whether the email is new vs already-known.
        return { success: true as const, alreadyOnList: true };
      }
      await prisma.waitlistEntry.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name ?? null,
          company: input.company ?? null,
          message: input.message ?? null,
          source: input.source ?? "landing",
        },
      });
      return { success: true as const, alreadyOnList: false };
    }),

  // ─── Admin operations ──────────────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["NEW", "CONTACTED", "ONBOARDED", "REJECTED"]).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx);
      return prisma.waitlistEntry.findMany({
        where: input?.status ? { status: input.status } : undefined,
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 200,
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["NEW", "CONTACTED", "ONBOARDED", "REJECTED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      return prisma.waitlistEntry.update({
        where: { id: input.id },
        data: {
          status: input.status,
          contacted: input.status !== "NEW",
          notes: input.notes ?? undefined,
        },
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx);
      await prisma.waitlistEntry.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
