import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let database: NeonHttpDatabase<typeof schema> | undefined;

// Neon console strings include channel_binding=require. The serverless HTTP
// driver does not support that parameter and the query fails closed.
export function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  const parsed = new URL(url);
  parsed.searchParams.delete("channel_binding");
  return parsed.toString();
}

export function getDb() {
  if (!database) {
    database = drizzle(neon(databaseUrl()), { schema });
  }
  return database;
}
