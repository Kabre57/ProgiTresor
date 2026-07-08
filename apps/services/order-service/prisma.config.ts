import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import fs from 'fs';
import path from 'path';

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
