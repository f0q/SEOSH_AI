import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma.js';

export const auth = betterAuth({
  baseURL: process.env.BACKEND_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
    modelName: {
      user: 'user',
      session: 'session',
      account: 'account',
      verification: 'verification',
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
  },

  trustedOrigins: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
  ],

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Give signup bonus tokens
          await prisma.tokenBalance.create({
            data: {
              userId: user.id,
              tokens: 200,
            },
          });
          await prisma.tokenTransaction.create({
            data: {
              userId: user.id,
              amount: 200,
              reason: 'SIGNUP_BONUS',
            },
          });
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
