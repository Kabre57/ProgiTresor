import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AUTH_SERVICE_URL: z.string().url().default('http://auth-service:5001'),
  ETUDIANT_SERVICE_URL: z.string().url().default('http://etudiant-service:5002'),
  TRANSACTION_SERVICE_URL: z.string().url().default('http://transaction-service:5003'),
  ORDER_SERVICE_URL: z.string().url().default('http://order-service:5004'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ ERREUR CRITIQUE DE DÉMARRAGE : Validation des variables d\'environnement échouée !');
  console.error('Veuillez vérifier votre fichier .env (JWT_SECRET doit faire au moins 32 caractères, etc.).');
  console.error('Détails des erreurs :');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof configSchema>;
