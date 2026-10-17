import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { router } from './routes';
import { errorHandler } from './middleware/error';

const app = express();

// Detrás de un reverse proxy (Nginx/CloudPanel): confía en 1 salto para ver la IP real.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Cabeceras de seguridad básicas (sin dependencias).
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
});

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '1mb' })); // evita payloads abusivos

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', router);

// Manejo central de errores (siempre al final)
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
});
