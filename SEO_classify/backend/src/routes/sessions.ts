import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// List all app sessions with summary (filtered by user if logged in)
router.get('/', async (req: Request, res: Response) => {
  try {
    const where = req.user ? { userId: req.user.id } : { userId: null };
    const sessions = await prisma.appSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { queries: true, categories: true, sitemapPages: true } },
      },
    });

    res.json(
      sessions.map((s: any) => ({
        id: s.id,
        url: s.url,
        createdAt: s.createdAt,
        queryCount: s._count.queries,
        categoryCount: s._count.categories,
        pageCount: s._count.sitemapPages,
      }))
    );
  } catch (error: any) {
    console.error('Session list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new app session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL обязателен' });
    }

    const session = await prisma.appSession.create({
      data: {
        url,
        userId: req.user?.id ?? null,
      },
    });

    res.json(session);
  } catch (error: any) {
    console.error('Session create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get app session by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await prisma.appSession.findUnique({
      where: { id: req.params.id },
      include: {
        sitemapPages: true,
        categories: true,
        lexicalGroups: { include: { queries: true } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    res.json(session);
  } catch (error: any) {
    console.error('Session get error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete app session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.appSession.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Session delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
