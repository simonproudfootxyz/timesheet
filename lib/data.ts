import { and, desc, eq, gte, isNotNull, isNull, lt, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, projects, settings, timeEntries } from "@/lib/db/schema";
import { isValidTimeZone, secondsBetween } from "@/lib/time";
import type { EntryMode, PendingAlert } from "@/lib/types";

const entryColumns = {
  id: timeEntries.id,
  projectId: timeEntries.projectId,
  clientId: clients.id,
  clientName: clients.name,
  projectName: projects.name,
  ticketRef: timeEntries.ticketRef,
  description: timeEntries.description,
  startedAt: timeEntries.startedAt,
  endedAt: timeEntries.endedAt,
  mode: timeEntries.mode,
  allottedSeconds: timeEntries.allottedSeconds,
  hourlyRateCents: clients.hourlyRateCents,
  currency: clients.currency,
  alertPending: timeEntries.alertPending,
};

export type TimeEntryRecord = {
  id: string;
  projectId: string;
  clientId: string;
  clientName: string;
  projectName: string;
  ticketRef: string | null;
  description: string | null;
  startedAt: Date;
  endedAt: Date | null;
  mode: EntryMode;
  allottedSeconds: number | null;
  hourlyRateCents: number;
  currency: string;
  alertPending: boolean;
};

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; message?: string; cause?: unknown };
  if (maybe.code === "23505") return true;
  if (
    typeof maybe.message === "string" &&
    (maybe.message.includes("23505") || maybe.message.includes("time_entries_one_open"))
  ) {
    return true;
  }
  return maybe.cause ? isUniqueViolation(maybe.cause) : false;
}

export async function getSettings() {
  const db = getDb();
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  if (existing[0]) return existing[0];

  await db
    .insert(settings)
    .values({ id: 1, timezone: "UTC", weekStartsOn: 1 })
    .onConflictDoNothing();

  const created = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  if (!created[0]) {
    throw new Error("Could not read app settings.");
  }
  return created[0];
}

export async function ensureSettings(timezone: string) {
  const tz = isValidTimeZone(timezone) ? timezone : "UTC";
  const db = getDb();
  await db
    .insert(settings)
    .values({ id: 1, timezone: tz, weekStartsOn: 1 })
    .onConflictDoNothing();
  return getSettings();
}

export async function updateTimezone(timezone: string) {
  if (!isValidTimeZone(timezone)) {
    return { ok: false as const, error: "Enter a valid IANA timezone, like America/New_York." };
  }
  await getSettings();
  await getDb()
    .update(settings)
    .set({ timezone })
    .where(eq(settings.id, 1));
  return { ok: true as const };
}

export async function listClientsWithProjects() {
  const db = getDb();
  const clientRows = await db.select().from(clients).orderBy(clients.name);
  const projectRows = await db.select().from(projects).orderBy(projects.name);
  return clientRows.map((client) => ({
    ...client,
    projects: projectRows.filter((project) => project.clientId === client.id),
  }));
}

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

async function selectEntries(where: SQL) {
  const rows = await getDb()
    .select(entryColumns)
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(where)
    .orderBy(desc(timeEntries.startedAt));
  return rows.map((row) => ({
    ...row,
    startedAt: asDate(row.startedAt),
    endedAt: row.endedAt ? asDate(row.endedAt) : null,
  }));
}

export async function listClosedEntries(start: Date, end: Date, clientId?: string) {
  const filters = [
    gte(timeEntries.startedAt, start),
    lt(timeEntries.startedAt, end),
    isNotNull(timeEntries.endedAt),
  ];
  if (clientId) filters.push(eq(clients.id, clientId));
  const where = and(...filters);
  if (!where) return [];
  const rows = await selectEntries(where);
  return rows.filter((row): row is TimeEntryRecord & { endedAt: Date } => row.endedAt !== null);
}

export async function closeExpiredCountdowns(now = new Date()) {
  const db = getDb();
  const open = await db
    .select({
      id: timeEntries.id,
      startedAt: timeEntries.startedAt,
      allottedSeconds: timeEntries.allottedSeconds,
      mode: timeEntries.mode,
    })
    .from(timeEntries)
    .where(isNull(timeEntries.endedAt));

  for (const entry of open) {
    if (entry.mode !== "countdown" || entry.allottedSeconds == null) continue;
    const startedAt = asDate(entry.startedAt);
    const end = new Date(startedAt.getTime() + entry.allottedSeconds * 1000);
    if (now.getTime() < end.getTime()) continue;
    await db
      .update(timeEntries)
      .set({
        endedAt: end,
        alertPending: true,
        updatedAt: now,
      })
      .where(and(eq(timeEntries.id, entry.id), isNull(timeEntries.endedAt)));
  }
}

export async function getOpenEntry() {
  const rows = await selectEntries(isNull(timeEntries.endedAt));
  return rows[0] ?? null;
}

export async function getPendingAlert(): Promise<PendingAlert | null> {
  const rows = await getDb()
    .select(entryColumns)
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(timeEntries.alertPending, true))
    .orderBy(desc(timeEntries.endedAt))
    .limit(1);
  const row = rows[0];
  if (!row?.endedAt) return null;
  return {
    id: row.id,
    clientName: row.clientName,
    projectName: row.projectName,
    ticketRef: row.ticketRef,
    seconds: secondsBetween(asDate(row.startedAt), asDate(row.endedAt)),
  };
}

export async function loadTimerState() {
  await closeExpiredCountdowns();
  const [open, alert] = await Promise.all([getOpenEntry(), getPendingAlert()]);
  return { open, alert };
}

export async function projectExists(projectId: string) {
  const rows = await getDb()
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return Boolean(rows[0]);
}

export async function insertOpenEntry(input: {
  projectId: string;
  ticketRef: string | null;
  description: string | null;
  mode: "countup" | "countdown";
  allottedSeconds: number | null;
}) {
  await closeExpiredCountdowns();
  if (await getOpenEntry()) return "busy" as const;
  if (!(await projectExists(input.projectId))) return "missing-project" as const;

  try {
    await getDb().insert(timeEntries).values({
      projectId: input.projectId,
      ticketRef: input.ticketRef,
      description: input.description,
      startedAt: new Date(),
      mode: input.mode,
      allottedSeconds: input.allottedSeconds,
    });
    return "ok" as const;
  } catch (error) {
    if (isUniqueViolation(error)) return "busy" as const;
    throw error;
  }
}

export async function finishCountdownIfDue() {
  const db = getDb();
  const openRows = await db
    .select({
      id: timeEntries.id,
      mode: timeEntries.mode,
      startedAt: timeEntries.startedAt,
      allottedSeconds: timeEntries.allottedSeconds,
    })
    .from(timeEntries)
    .where(isNull(timeEntries.endedAt))
    .limit(1);
  const open = openRows[0];
  if (!open || open.mode !== "countdown" || open.allottedSeconds == null) return false;

  const now = new Date();
  const scheduled = new Date(
    asDate(open.startedAt).getTime() + open.allottedSeconds * 1000,
  );
  if (now.getTime() + 1000 < scheduled.getTime()) return false;

  const updated = await db
    .update(timeEntries)
    .set({
      endedAt: scheduled,
      alertPending: true,
      updatedAt: now,
    })
    .where(and(eq(timeEntries.id, open.id), isNull(timeEntries.endedAt)))
    .returning({ id: timeEntries.id });
  return updated.length > 0;
}

export async function stopOpenEntry() {
  const db = getDb();
  const openRows = await db
    .select({
      id: timeEntries.id,
      mode: timeEntries.mode,
      startedAt: timeEntries.startedAt,
      allottedSeconds: timeEntries.allottedSeconds,
    })
    .from(timeEntries)
    .where(isNull(timeEntries.endedAt))
    .limit(1);
  const open = openRows[0];
  if (!open) return;

  const now = new Date();
  let endedAt = now;
  let alertPending = false;
  if (open.mode === "countdown" && open.allottedSeconds != null) {
    const scheduled = new Date(
      asDate(open.startedAt).getTime() + open.allottedSeconds * 1000,
    );
    if (now.getTime() + 1000 >= scheduled.getTime()) {
      endedAt = scheduled;
      alertPending = true;
    }
  }

  await db
    .update(timeEntries)
    .set({ endedAt, alertPending, updatedAt: now })
    .where(and(eq(timeEntries.id, open.id), isNull(timeEntries.endedAt)));
}

export async function dismissAlert(id: string) {
  await getDb()
    .update(timeEntries)
    .set({ alertPending: false, updatedAt: new Date() })
    .where(eq(timeEntries.id, id));
}

export async function insertManualEntry(input: {
  projectId: string;
  ticketRef: string | null;
  description: string | null;
  startedAt: Date;
  endedAt: Date;
}) {
  if (!(await projectExists(input.projectId))) return "missing-project" as const;
  await getDb().insert(timeEntries).values({
    projectId: input.projectId,
    ticketRef: input.ticketRef,
    description: input.description,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    mode: "manual",
  });
  return "ok" as const;
}

export async function updateClosedEntry(
  id: string,
  input: {
    projectId: string;
    ticketRef: string | null;
    description: string | null;
    startedAt: Date;
    endedAt: Date;
  },
) {
  if (!(await projectExists(input.projectId))) return "missing-project" as const;
  const rows = await getDb()
    .select({ id: timeEntries.id, endedAt: timeEntries.endedAt })
    .from(timeEntries)
    .where(eq(timeEntries.id, id))
    .limit(1);
  const existing = rows[0];
  if (!existing) return "missing" as const;
  if (!existing.endedAt) return "open" as const;

  await getDb()
    .update(timeEntries)
    .set({
      projectId: input.projectId,
      ticketRef: input.ticketRef,
      description: input.description,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      updatedAt: new Date(),
    })
    .where(eq(timeEntries.id, id));
  return "ok" as const;
}

export async function deleteEntry(id: string) {
  await getDb().delete(timeEntries).where(eq(timeEntries.id, id));
}

export async function createClient(input: {
  name: string;
  hourlyRateCents: number;
  currency: string;
}) {
  const [created] = await getDb()
    .insert(clients)
    .values(input)
    .returning({ id: clients.id });
  return created;
}

export async function updateClient(
  id: string,
  input: { name: string; hourlyRateCents: number; currency: string },
) {
  const rows = await getDb()
    .update(clients)
    .set(input)
    .where(eq(clients.id, id))
    .returning({ id: clients.id });
  return rows.length > 0;
}

export async function deleteClient(id: string) {
  const db = getDb();
  const entries = await db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(eq(projects.clientId, id))
    .limit(1);
  if (entries[0]) {
    return "has-entries" as const;
  }
  await db.delete(clients).where(eq(clients.id, id));
  return "ok" as const;
}

export async function createProject(clientId: string, name: string) {
  const client = await getDb()
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client[0]) return "missing-client" as const;
  await getDb().insert(projects).values({ clientId, name });
  return "ok" as const;
}

export async function updateProject(id: string, name: string) {
  const rows = await getDb()
    .update(projects)
    .set({ name })
    .where(eq(projects.id, id))
    .returning({ id: projects.id });
  return rows.length > 0;
}

export async function deleteProject(id: string) {
  const db = getDb();
  const entries = await db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .where(eq(timeEntries.projectId, id))
    .limit(1);
  if (entries[0]) return "has-entries" as const;
  await db.delete(projects).where(eq(projects.id, id));
  return "ok" as const;
}
