import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

function loadEnvFile(path, override) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }
  const parsed = new URL(url);
  parsed.searchParams.delete("channel_binding");
  return parsed.toString();
}

loadEnvFile(".env", false);
loadEnvFile(".env.local", true);

const url = databaseUrl();
const host = new URL(url);
console.log(`Migrating ${host.hostname}${host.pathname}`);

const sql = neon(url, {
  fetchOptions: { signal: AbortSignal.timeout(20000) },
});

await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
