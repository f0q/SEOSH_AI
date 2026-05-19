/**
 * @module trpc/server
 * @description tRPC server setup for SEOSH.AI.
 * 
 * Architecture:
 *   - Context: request + session from Better Auth
 *   - Procedures: public (no auth required) + protected (auth required)
 *   - Routers: organized by domain (projects, semanticCore, content, etc.)
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import superjson from "superjson";
import { ZodError } from "zod";

// ─── Context ────────────────────────────────────────────────────────────────

export async function createTRPCContext(opts: { req: NextRequest }) {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });

  return {
    session,
    req: opts.req,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ─── tRPC Init ───────────────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ─── Middleware ──────────────────────────────────────────────────────────────

/** Middleware: require authenticated session */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

/**
 * Read-only guard for demo accounts. Any mutation issued by a user with
 * isDemo=true is rejected. Queries pass through untouched. Applied on top
 * of enforceAuth so it relies on session.user being present.
 */
const enforceNonDemoForMutations = t.middleware(({ ctx, next, type }) => {
  if (type === "mutation" && (ctx.session?.user as { isDemo?: boolean } | undefined)?.isDemo) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Это демо-режим: изменения недоступны. Зарегистрируйтесь для полного доступа.",
    });
  }
  return next();
});

/** Middleware: require ADMIN or SUPERADMIN role */
const enforceAdmin = t.middleware(({ ctx, next }) => {
  const role = (ctx.session?.user as { role?: string })?.role;
  if (!ctx.session?.user || !["ADMIN", "SUPERADMIN"].includes(role ?? "")) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

/** Middleware: require SUPERADMIN role */
const enforceSuperadmin = t.middleware(({ ctx, next }) => {
  const role = (ctx.session?.user as { role?: string })?.role;
  if (!ctx.session?.user || role !== "SUPERADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

// ─── Procedure Builders ──────────────────────────────────────────────────────

/** Public procedure — no auth required */
export const publicProcedure = t.procedure;

/** Protected procedure — requires valid session; mutations are blocked for demo accounts. */
export const protectedProcedure = t.procedure.use(enforceAuth).use(enforceNonDemoForMutations);

/** Admin procedure — requires ADMIN or SUPERADMIN */
export const adminProcedure = t.procedure.use(enforceAdmin);

/** Superadmin procedure — requires SUPERADMIN only (e.g., AI provider config) */
export const superadminProcedure = t.procedure.use(enforceSuperadmin);

export const router = t.router;
export const mergeRouters = t.mergeRouters;
