import { defineConfig } from 'prisma/config';
import fs from 'fs';
import path from 'path';

try {
  require('dotenv').config();
} catch (err) {
  const envPath = path.join(__dirname, '.env');
  const rootEnvPath = path.join(__dirname, '../../../.env');
  const targetEnv = fs.existsSync(envPath) ? envPath : (fs.existsSync(rootEnvPath) ? rootEnvPath : null);
  if (targetEnv) {
    const lines = fs.readFileSync(targetEnv, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

const hasJsSeed = fs.existsSync(path.join(__dirname, 'prisma/seed.js'));
const seedCommand = hasJsSeed ? 'node prisma/seed.js' : 'ts-node prisma/seed.ts';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: seedCommand,
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
