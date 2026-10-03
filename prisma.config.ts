// Конфіг Prisma CLI (migrate, generate, studio, seed).
// Next.js читає .env.local — тому й Prisma спершу бере його, а потім .env.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx src/db/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
