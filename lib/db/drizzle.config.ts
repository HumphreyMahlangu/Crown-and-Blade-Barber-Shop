import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED or DATABASE_URL must be set; ensure the database is provisioned",
  );
}

export default defineConfig({
  schema: "./src/schema/barbershop.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
