/**
 * @router team
 * @description Manage project-level team members: invite, list, update role, remove.
 * Access is gated by billing tier (currently: only SUPERADMIN/ADMIN can invite).
 */

import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db";
import crypto from "crypto";

// ─── Billing Tier Gate ──────────────────────────────────────────────────────
// In the future, this will check the user's billing plan.
// For now: SUPERADMIN always allowed, ADMIN allowed, USER blocked (Free plan).
function canManageTeam(userRole: string): boolean {
  return userRole === "SUPERADMIN" || userRole === "ADMIN";
}

export const teamRouter = router({
  /** Check whether the current user can invite team members */
  canInvite: protectedProcedure.query(async ({ ctx }) => {
    return {
      allowed: canManageTeam(ctx.user.role),
      reason: canManageTeam(ctx.user.role)
        ? null
        : "Team management is available on paid plans. Upgrade to invite team members.",
    };
  }),

  /** List all members across ALL projects owned by the current user */
  listAllMembers: protectedProcedure
    .query(async ({ ctx }) => {
      // Get all projects owned by this user
      const projects = await prisma.project.findMany({
        where: { userId: ctx.user.id },
        select: { id: true, name: true, userId: true },
        orderBy: { name: "asc" },
      });

      if (!projects.length) return { projects: [], members: [], owner: null };

      const projectIds = projects.map(p => p.id);

      const members = await prisma.projectMember.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          projectId: true,
          createdAt: true,
          acceptedAt: true,
        },
      });

      // Attach project name to each member
      const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
      const membersWithProject = members.map(m => ({
        ...m,
        projectName: projectMap[m.projectId] || "Unknown",
      }));

      const owner = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { email: true, name: true, createdAt: true },
      });

      return {
        projects: projects.map(p => ({ id: p.id, name: p.name })),
        members: membersWithProject,
        owner: owner ? { email: owner.email, name: owner.name, joinedAt: owner.createdAt } : null,
      };
    }),

  /** Invite a new team member by email */
  inviteMember: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      email: z.string().email(),
      role: z.enum(["VIEWER", "EDITOR", "ADMIN"]).default("VIEWER"),
    }))
    .mutation(async ({ input, ctx }) => {
      // Gate by billing tier
      if (!canManageTeam(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Team management is available on paid plans. Upgrade your account to invite team members.",
        });
      }

      // Verify ownership
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can invite team members." });
      }

      // Prevent inviting yourself
      if (input.email === ctx.user.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot invite yourself." });
      }

      // Check for existing active/pending invite
      const existing = await prisma.projectMember.findFirst({
        where: {
          projectId: input.projectId,
          email: input.email,
          status: { in: ["PENDING", "ACTIVE"] },
        },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This email already has access to this project." });
      }

      // Generate credentials
      const accessToken = crypto.randomBytes(32).toString("hex");
      const tempPassword = crypto.randomBytes(6).toString("hex");

      const member = await prisma.projectMember.create({
        data: {
          projectId: input.projectId,
          email: input.email,
          role: input.role,
          invitedBy: ctx.user.id,
          accessToken,
          tempPassword,
          status: "PENDING",
        },
      });

      // Dev mode: log to console
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${accessToken}`;
      console.log(`
╔══════════════════════════════════════════════════════════
║  PROJECT INVITE (dev mode — email not sent)
╠══════════════════════════════════════════════════════════
║  To:       ${input.email}
║  Project:  ${project.name}
║  Role:     ${input.role}
║  URL:      ${inviteUrl}
║  Password: ${tempPassword}
╚══════════════════════════════════════════════════════════
      `);

      return { success: true, memberId: member.id };
    }),

  /** Update a team member's role */
  updateRole: protectedProcedure
    .input(z.object({
      memberId: z.string(),
      role: z.enum(["VIEWER", "EDITOR", "ADMIN"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const member = await prisma.projectMember.findUnique({
        where: { id: input.memberId },
        include: { project: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      // Only project owner or SUPERADMIN can change roles
      if (member.project.userId !== ctx.user.id && ctx.user.role !== "SUPERADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can change roles." });
      }

      return prisma.projectMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
      });
    }),

  /** Remove a team member */
  removeMember: protectedProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const member = await prisma.projectMember.findUnique({
        where: { id: input.memberId },
        include: { project: true },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      // Only project owner or SUPERADMIN can remove
      if (member.project.userId !== ctx.user.id && ctx.user.role !== "SUPERADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can remove members." });
      }

      return prisma.projectMember.update({
        where: { id: input.memberId },
        data: { status: "REVOKED" },
      });
    }),
});
