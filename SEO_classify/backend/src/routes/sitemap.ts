import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { parseSitemap } from '../services/sitemapParser.js';
import { generateSiteStructure } from '../services/openrouter.js';

const router = Router();

// Parse structure for an app session using AI
router.post('/structure', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId обязателен' });
    }

    const session = await prisma.appSession.findUnique({
      where: { id: sessionId },
      include: { sitemapPages: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    // If we already have a cached structure, return it
    if (session.siteStructureResult && !req.body.refresh) {
      return res.json(session.siteStructureResult);
    }

    if (session.sitemapPages.length === 0) {
      return res.status(400).json({ error: 'Сначала необходимо спарсить sitemap' });
    }

    const structure = await generateSiteStructure(session.sitemapPages);

    // Cache the result
    await prisma.appSession.update({
      where: { id: sessionId },
      data: { siteStructureResult: structure },
    });

    res.json(structure);
  } catch (error: any) {
    console.error('Sitemap structure error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Parse sitemap for an app session
router.post('/parse', async (req, res) => {
  try {
    const { sessionId, url } = req.body;

    if (!sessionId || !url) {
      return res.status(400).json({ error: 'sessionId и url обязательны' });
    }

    const session = await prisma.appSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    await prisma.sitemapPage.deleteMany({ where: { appSessionId: sessionId } });

    const entries = await parseSitemap(url);

    const pages = await Promise.all(
      entries.map((entry) =>
        prisma.sitemapPage.create({
          data: {
            url: entry.url,
            title: entry.title,
            h1: entry.h1,
            appSessionId: sessionId,
          },
        })
      )
    );

    res.json({
      count: pages.length,
      pages: pages.map((p: any) => ({
        id: p.id,
        url: p.url,
        title: p.title,
        h1: p.h1,
      })),
    });
  } catch (error: any) {
    console.error('Sitemap parse error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sitemap pages for an app session
router.get('/:sessionId', async (req, res) => {
  try {
    const pages = await prisma.sitemapPage.findMany({
      where: { appSessionId: req.params.sessionId },
    });
    res.json(pages);
  } catch (error: any) {
    console.error('Sitemap get error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
