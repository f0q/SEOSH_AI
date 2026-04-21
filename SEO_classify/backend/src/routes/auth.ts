import { Router } from 'express';
import { toNodeHandler, auth } from '../lib/middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Mount all Better Auth routes at /api/auth/*
// Better Auth handles: /sign-in, /sign-up, /sign-out, /session, /callback, etc.
router.all('/*', (req, res) => {
  return toNodeHandler(auth)(req, res);
});

export default router;
