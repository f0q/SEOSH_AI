import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { optionalAuth } from './lib/middleware.js';
import sessionsRouter from './routes/sessions.js';
import sitemapRouter from './routes/sitemap.js';
import queriesRouter from './routes/queries.js';
import categorizeRouter from './routes/categorize.js';
import userRouter from './routes/user.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// Better Auth native handler (must be before express.json)
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json({ limit: '10mb' }));
app.use(optionalAuth);

// Routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/sitemap', sitemapRouter);
app.use('/api/queries', queriesRouter);
app.use('/api/categorize', categorizeRouter);
app.use('/api/user', userRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

export default app;
