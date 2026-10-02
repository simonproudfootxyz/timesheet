import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const entryMode = pgEnum("entry_mode", [
  "countup",
  "countdown",
  "manual",
]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  hourlyRateCents: integer("hourly_rate_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("projects_client_id_idx").on(table.clientId)],
);

export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    ticketRef: text("ticket_ref"),
    description: text("description"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    mode: entryMode("mode").notNull(),
    allottedSeconds: integer("allotted_seconds"),
    alertPending: boolean("alert_pending").notNull().default(false),
    // Stored generated column: 1 while the entry is open, null once it is
    // closed. A unique index allows many nulls and only one 1, so a single
    // timer can run at a time.
    openLock: integer("open_lock").generatedAlwaysAs(
      sql`case when "ended_at" is null then 1 else null end`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("time_entries_one_open_idx").on(table.openLock),
    index("time_entries_project_id_idx").on(table.projectId),
    index("time_entries_started_at_idx").on(table.startedAt),
  ],
);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  timezone: text("timezone").notNull(),
  weekStartsOn: integer("week_starts_on").notNull().default(1),
});
