import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { paperRouter } from './routes/paperRoutes.js';
import { platformRouter } from './routes/platformRoutes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (req, res) => {
    res.json({ ok: true, name: 'AI CRAFTER Backend', time: new Date().toISOString() });
  });

  app.use('/api/v1', requireAuth, paperRouter);
  app.use('/api/v1/platform', requireAuth, platformRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
