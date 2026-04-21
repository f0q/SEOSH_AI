import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { groupQueriesLexically, normalizeForStorage } from '../services/lexicalGrouper.js';

const router = Router();

// Upload queries and perform lexical grouping
router.post('/upload', async (req, res) => {
  try {
    const { sessionId, queries } = req.body;

    if (!sessionId || !queries || !Array.isArray(queries)) {
      return res.status(400).json({ error: 'sessionId и queries[] обязательны' });
    }

    const cleanedQueries = [...new Set(
      queries
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0)
    )];

    if (cleanedQueries.length === 0) {
      return res.status(400).json({ error: 'Нет валидных запросов' });
    }

    // Clear existing data for this session
    await prisma.query.deleteMany({ where: { appSessionId: sessionId } });
    await prisma.lexicalGroup.deleteMany({ where: { appSessionId: sessionId } });
    await prisma.category.deleteMany({ where: { appSessionId: sessionId } });

    const groups = groupQueriesLexically(cleanedQueries);

    const savedGroups = [];

    for (const group of groups) {
      const dbGroup = await prisma.lexicalGroup.create({
        data: {
          representativeQuery: group.representative,
          appSessionId: sessionId,
        },
      });

      const dbQueries = await Promise.all(
        group.queries.map((q) =>
          prisma.query.create({
            data: {
              text: q,
              normalizedText: normalizeForStorage(q),
              appSessionId: sessionId,
              groupId: dbGroup.id,
            },
          })
        )
      );

      savedGroups.push({
        id: dbGroup.id,
        representative: group.representative,
        queryCount: dbQueries.length,
        queries: dbQueries.map((q) => ({ id: q.id, text: q.text })),
      });
    }

    res.json({
      totalQueries: cleanedQueries.length,
      totalGroups: savedGroups.length,
      representativeCount: savedGroups.length,
      groups: savedGroups,
    });
  } catch (error: any) {
    console.error('Query upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get queries for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const queries = await prisma.query.findMany({
      where: { appSessionId: req.params.sessionId },
      include: { group: true, category: true },
    });
    res.json(queries);
  } catch (error: any) {
    console.error('Query get error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a single query
router.delete('/:queryId', async (req, res) => {
  try {
    await prisma.query.delete({ where: { id: req.params.queryId } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Query delete error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Update a query's text
router.patch('/:queryId/text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text обязателен' });
    }
    await prisma.query.update({
      where: { id: req.params.queryId },
      data: { text: text.trim(), normalizedText: text.trim().toLowerCase() },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Query update text error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
