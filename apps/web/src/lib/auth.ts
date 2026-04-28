/**
 * @module auth
 * @description Better Auth configuration for SEOSH.AI.
 * 
 * Features:
 *   - Email/password authentication
 *   - Session management (database-backed)
 *   - Role-based access: USER, ADMIN, SUPERADMIN
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { PrismaClient } from "@prisma/client";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { sendEmail } from "./email";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [
    admin()
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disabled since registration is closed and admin creates users
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/sign-up") && ctx.path !== "/sign-up/admin") {
        throw new APIError("BAD_REQUEST", { message: "Registration is closed. Access is invitation only." });
      }
    })
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address - SEOSH.AI",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to SEOSH.AI!</h2>
            <p>Please click the button below to verify your email address and activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email</a>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
          </div>
        `,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // Refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute cache
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
        input: false,
      },
      locale: {
        type: "string",
        defaultValue: "en",
        input: true,
      },
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
