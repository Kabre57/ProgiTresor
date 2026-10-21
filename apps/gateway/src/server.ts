// ============================================================
// 1. IMPORTS
// ============================================================

import express, { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt, { JwtPayload } from 'jsonwebtoken';
import pino from 'pino';
import client from 'prom-client';
import { config } from './config';

// Import des routes depuis le dossier dédié
import { allRoutes } from './routes/index';
import { getProxyTimeoutMs } from './utils/proxyTimeout';
import { permissionMiddleware } from './middlewares/permission.middleware';

// ============================================================
// 2. CONFIGURATION DU LOGGER & EXPRESS
// ============================================================

const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.token',
      'token',
      'authorization',
      'headers.authorization',
      'password'
    ],
    censor: '***'
  },
  transport: config.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    : undefined,
});

const app = express();
// Nginx est le seul proxy public en production. Cela permet à Express et au
// rate limiter de déterminer correctement l'adresse IP du client via XFF.
app.set('trust proxy', 1);
const PORT = config.PORT;
const JWT_SECRET = config.JWT_SECRET;
const CORS_ORIGINS = config.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

interface GatewayUser extends JwtPayload {
  userId: number;
  role: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: GatewayUser;
      cookies?: Record<string, string>;
    }
  }
}

const isGatewayUser = (payload: string | JwtPayload): payload is GatewayUser => {
  return typeof payload !== 'string'
    && typeof payload.userId === 'number'
    && typeof payload.role === 'string'
    && typeof payload.username === 'string';
};

// ============================================================
// 3. MÉTRIQUES PROMETHEUS
// ============================================================

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const httpRequestsCounter = new client.Counter({
  name: 'gateway_http_requests_total',
  help: "Nombre total de requêtes HTTP traitées par l'API Gateway",
  labelNames: ['method', 'path', 'status'],
});

const httpRequestsDuration = new client.Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'Durée des requêtes HTTP via la passerelle en secondes',
  labelNames: ['method', 'path'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// ============================================================
// 4. MIDDLEWARES GÉNÉRIQUES
// ============================================================

// Sécurité des headers HTTP
app.use(helmet());

// Compression des réponses (hors flux temps réel SSE)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['accept'] === 'text/event-stream' || req.headers['content-type'] === 'text/event-stream') {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// CORS — accept credentials (cookies)
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));

// Cookie parser minimal pour éviter une dépendance runtime supplémentaire.
app.use((req, _res, next) => {
  req.cookies = parseCookieHeader(req.headers.cookie);
  next();
});

// Collecte des métriques sur chaque requête
app.use((req, res, next) => {
  const end = httpRequestsDuration.startTimer({ method: req.method, path: req.path });
  res.on('finish', () => {
    end();
    httpRequestsCounter.inc({
      method: req.method,
      path: req.path,
      status: res.statusCode.toString(),
    });
  });
  next();
});

// Rate Limiting (protection contre le spam)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requêtes par IP
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
});
app.use(limiter);

// Logging des requêtes entrantes
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Requête reçue par le Gateway');
  next();
});

// ============================================================
// 5. AUTHENTIFICATION JWT & AUTORISATION RBAC
// ============================================================


const ROLE_MAP: Record<string, string> = {
  ADMIN: 'Administrateur',
  COMPTABLE: 'Comptable',
  BUDGET: 'Agent Budget',
  CHEF_COMPTABLE: 'Chef Comptable',
  DF: 'Directeur Financier',
  CONSULTANT: 'Consultant',
  ETUDIANT: 'Etudiant',
};

const authorize = (...allowedRoles: string[]): RequestHandler => (req, res, next) => {
  const role = req.user?.role;
  const mappedRole = role ? (ROLE_MAP[role] || role) : null;
  if (!mappedRole || !allowedRoles.includes(mappedRole)) {
    logger.warn(
      { user: req.user?.username, role, mappedRole, path: req.path },
      "Tentative d'accès non autorisée"
    );
    return res.status(403).json({ error: 'Accès refusé : privilèges insuffisants' });
  }
  next();
};

const hasPerimeterAccess = (
  perms: Record<string, number>,
  denies: string[],
  perimeter: string,
  action: string,
  requiredLevel: number,
) => {
  if (denies.includes(`${perimeter}:${action}`)) {
    return false;
  }
  return (perms[perimeter] || 0) >= requiredLevel;
};

const isStudentOwnTransactionRead = (req: express.Request, perimeter: string, action: string) => {
  const role = req.user?.role;
  const mappedRole = role ? (ROLE_MAP[role] || role) : null;
  const requestedMatricule = String(req.query.etudiantMatricule ?? '').trim().toUpperCase();
  const username = String(req.user?.username ?? '').trim().toUpperCase();

  return (
    mappedRole === 'Etudiant' &&
    perimeter === 'IMPORT' &&
    action === 'READ' &&
    req.method === 'GET' &&
    req.baseUrl === '/api/transactions' &&
    requestedMatricule.length > 0 &&
    requestedMatricule === username
  );
};

const authorizePerimeter = (
  perimeter: string,
  action: string,
  requiredLevel: number,
): RequestHandler => (req, res, next) => {
  const reqWithPerms = req as express.Request & {
    userPerms?: Record<string, number>;
    userDenies?: string[];
  };

  const allowed = hasPerimeterAccess(
    reqWithPerms.userPerms ?? {},
    reqWithPerms.userDenies ?? [],
    perimeter,
    action,
    requiredLevel,
  );

  if (!allowed && !isStudentOwnTransactionRead(req, perimeter, action)) {
    logger.warn(
      {
        user: req.user?.username,
        perimeter,
        action,
        requiredLevel,
        path: req.path,
      },
      'Acces refuse par niveau de perimetre',
    );
    res.status(403).json({ error: 'Acces refuse : niveau de perimetre insuffisant' });
    return;
  }

  next();
};

const parseCookieHeader = (header: string | undefined): Record<string, string> => {
  if (!header) return {};

  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
};

const postJson = async <T>(
  url: string,
  body: unknown,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number; data: T }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
};

// ============================================================
// 6. ENDPOINTS DE MÉTRIQUES ET DE SANTÉ
// ============================================================

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

// ============================================================
// 6.5 COOKIE-BASED AUTH ENDPOINTS
// ============================================================

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

// Body parser for JSON (needed for auth endpoints)
app.use('/api/auth/login', express.json());
app.use('/api/auth/refresh-token', express.json());
app.use('/api/auth/logout', express.json());

// POST /api/auth/login — proxy to auth-service, set HttpOnly cookies
app.post('/api/auth/login', async (req, res) => {
  try {
    const response = await postJson<{ token: string; refreshToken: string; user: unknown }>(
      `${config.AUTH_SERVICE_URL}/login`,
      req.body,
      10000,
    );
    if (!response.ok) {
      res.status(response.status).json(response.data);
      return;
    }

    const { token, refreshToken, user } = response.data;

    // Retirer d'anciens cookies limités à l'hôte avant d'écrire les cookies
    // partagés entre le domaine principal et son sous-domaine www.
    res.clearCookie('pt_access_token', { path: '/' });
    res.clearCookie('pt_refresh_token', { path: '/' });

    // Set HttpOnly cookies
    res.cookie('pt_access_token', token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    res.cookie('pt_refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user profile only (no tokens in body)
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Service d\'authentification indisponible' });
  }
});

// POST /api/auth/refresh-token — read refresh token from cookie, return new access
app.post('/api/auth/refresh-token', async (req, res) => {
  try {
    // Check cookie first, then body (backwards compat)
    const refreshToken = req.cookies?.pt_refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token manquant' });
      return;
    }

    const response = await postJson<{ accessToken: string }>(
      `${config.AUTH_SERVICE_URL}/refresh-token`,
      { refreshToken },
      10000,
    );
    if (!response.ok) {
      res.status(response.status).json(response.data);
      return;
    }

    const { accessToken } = response.data;

    // Update access token cookie
    res.cookie('pt_access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch {
    res.status(500).json({ error: 'Impossible de rafraîchir le token' });
  }
});

// POST /api/auth/logout — clear cookies and revoke token
app.post('/api/auth/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.pt_refresh_token;
    if (refreshToken) {
      await postJson(
        `${config.AUTH_SERVICE_URL}/logout`,
        { refreshToken },
        5000,
      ).catch(() => {}); // best-effort revocation
    }
  } finally {
    res.clearCookie('pt_access_token', { path: '/' });
    res.clearCookie('pt_refresh_token', { path: '/' });
    if (COOKIE_DOMAIN) {
      res.clearCookie('pt_access_token', { path: '/', domain: COOKIE_DOMAIN });
      res.clearCookie('pt_refresh_token', { path: '/', domain: COOKIE_DOMAIN });
    }
    res.json({ success: true });
  }
});

// ============================================================
// 7. ENREGISTREMENT DES PROXYS POUR CHAQUE SERVICE
// ============================================================

// ─── Stub endpoints (template UI components) ─────────────────────────────────
app.get('/api/notifications/count', permissionMiddleware, (_req, res) => {
  res.json({ count: 0 });
});

app.get('/api/notifications', permissionMiddleware, (_req, res) => {
  res.json([]);
});

app.get('/api/account/profile', permissionMiddleware, (_req, res) => {
  res.json({
    id: '1',
    name: "Administrateur",
    firstName: "Admin",
    lastName: "Progi",
    email: "admin@progi.ci",
    img: "/img/avatars/thumb-1.jpg",
    location: "Abidjan, Côte d'Ivoire",
    address: "Cocody Mermoz",
    postcode: "00225",
    city: "Abidjan",
    country: "CI",
    dialCode: "+225",
    birthday: "1990-01-01",
    phoneNumber: "0707070707"
  });
});

app.get('/api/account/notification', permissionMiddleware, (_req, res) => {
  res.json({
    email: ["newsAndUpdate", "tipsAndTutorial"],
    desktop: true,
    unreadMessageBadge: true,
    notifymeAbout: "allNewMessage"
  });
});

app.get('/api/account/billing', permissionMiddleware, (_req, res) => {
  res.json({
    paymentMethods: [
      {
        cardId: "1",
        cardHolderName: "Admin Progi",
        cardType: "visa",
        expMonth: "12",
        expYear: "28",
        last4Number: "4242",
        primary: true
      }
    ],
    transactionHistory: [],
    currentPlan: {
      plan: "Standard",
      status: "active",
      billingCycle: "monthly",
      nextPaymentDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      amount: 0
    }
  });
});

app.get('/api/account/integration', permissionMiddleware, (_req, res) => {
  res.json([]);
});

app.get('/api/logs', permissionMiddleware, (_req, res) => {
  res.json({
    data: [],
    loadable: false
  });
});


allRoutes.forEach((service) => {
  const middlewares: RequestHandler[] = [];
  const proxyTimeoutMs = getProxyTimeoutMs(service.path);

  // Si la route est sécurisée, ajout des middlewares d'auth et RBAC
  if (service.secure) {
    middlewares.push(permissionMiddleware as any);
    if (service.roles && service.roles.length > 0) {
      middlewares.push(authorize(...service.roles));
    }
    if (service.perimeter && service.requiredLevel !== undefined) {
      middlewares.push(authorizePerimeter(service.perimeter, service.action ?? 'ACCESS', service.requiredLevel));
    }
  }

  app.use(
    service.path,
    ...middlewares,
    createProxyMiddleware({
      target: service.target,
      changeOrigin: true, // Modification de l'en-tête Host

      // Réécriture du chemin avant de forwarder au service
      // Si serviceBasePath est défini, on préfixe l'URL avec ce chemin.
      // Sinon, Express a déjà strippé le préfixe (service.path) donc on ne touche à rien.
      pathRewrite: service.serviceBasePath
        ? { '^/': `${service.serviceBasePath}/` }
        : undefined,

      // ⏱️ TIMEOUTS
      // Les imports massifs peuvent prendre plusieurs minutes : ne pas couper
      // le tunnel HTTP pendant que le transaction-service traite le fichier.
      timeout: proxyTimeoutMs,
      proxyTimeout: proxyTimeoutMs,

      // Niveau de log du proxy (debug en développement)
      logger: logger,

      // Événements du proxy
      on: {
        // Avant d'envoyer la requête au service cible
        proxyReq: (proxyReq, req) => {
           const expressReq = req as any;
           const authorization = expressReq.headers?.authorization;
           if (authorization) {
             proxyReq.setHeader('Authorization', authorization);
           } else if (expressReq.cookies?.pt_access_token) {
             proxyReq.setHeader('Authorization', `Bearer ${expressReq.cookies.pt_access_token}`);
           }
           // Injection des headers utilisateur si authentifié
           if (expressReq.userId) {
             proxyReq.setHeader('X-User-Id', String(expressReq.userId));
             proxyReq.setHeader('X-User-Role', String(expressReq.userRole));
           }
           if (expressReq.user?.username || expressReq.headers['x-user-name']) {
             proxyReq.setHeader(
               'X-User-Name',
               String(expressReq.user?.username || expressReq.headers['x-user-name']),
             );
           }
           if (expressReq.headers['x-user-permissions']) {
             proxyReq.setHeader('X-User-Permissions', expressReq.headers['x-user-permissions']);
           }
           if (expressReq.headers['x-user-denies']) {
             proxyReq.setHeader('X-User-Denies', expressReq.headers['x-user-denies']);
           }
           if (process.env.INTERNAL_API_SECRET) {
             proxyReq.setHeader('X-Internal-Secret', process.env.INTERNAL_API_SECRET);
           }
          logger.debug({
            path: expressReq.path,
            target: service.target,
            method: expressReq.method,
          }, 'Requête proxyée');
        },

        // Les services internes utilisent parfois `Access-Control-Allow-Origin: *`.
        // Le navigateur refuse ce header quand les cookies sont envoyés, donc le
        // gateway reprend la main sur les headers CORS exposés au frontend.
        proxyRes: (proxyRes, req) => {
          const requestOrigin = req.headers.origin;
          delete proxyRes.headers['access-control-allow-origin'];
          delete proxyRes.headers['access-control-allow-credentials'];
          if (requestOrigin && CORS_ORIGINS.includes(requestOrigin)) {
            proxyRes.headers['access-control-allow-origin'] = requestOrigin;
            proxyRes.headers['access-control-allow-credentials'] = 'true';
          }

          const vary = proxyRes.headers.vary;
          const varyValue = Array.isArray(vary) ? vary.join(', ') : vary;
          const hasOrigin = varyValue
            ?.split(',')
            .some((item) => item.trim().toLowerCase() === 'origin');

          if (!hasOrigin) {
            proxyRes.headers.vary = varyValue ? `${varyValue}, Origin` : 'Origin';
          }
        },

        // En cas d'erreur de proxy (timeout, connexion refusée, etc.)
        error: (err, req, res) => {
          const expressReq = req as express.Request;
          logger.error(
            { err, path: expressReq.path, target: service.target },
            'Erreur de proxy'
          );
          const response = res as express.Response;
          if (!response.headersSent) {
            response.status(504).json({
              error: 'Service indisponible',
              details: err.message,
            });
          }
        },
      },
    })
  );
});

// ============================================================
// 8. DÉMARRAGE DU SERVEUR
// ============================================================

const server = app.listen(PORT, () => {
  logger.info(`🚀 Gateway API avec Prometheus et RBAC démarré sur le port ${PORT}`);
  logger.info(`📊 Métriques disponibles sur /metrics`);
  logger.info(`❤️  Santé disponible sur /health`);
});

const gatewayServerTimeoutMs = Number(process.env.GATEWAY_SERVER_TIMEOUT_MS ?? 16 * 60 * 1000);
server.requestTimeout = gatewayServerTimeoutMs;
server.headersTimeout = gatewayServerTimeoutMs + 30 * 1000;
server.timeout = gatewayServerTimeoutMs;

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`📴 Réception de ${signal}, arrêt en cours...`);
  server.close(() => {
    logger.info('✅ Serveur arrêté');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
