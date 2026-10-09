import type { TimeEntryRecord } from "@/lib/data";
import {
  amountCents,
  decimalHours,
  formatDateISO,
  formatDateTime,
  formatMoney,
  getZonedParts,
  parseDateISO,
  parsePeriod,
  periodRange,
  type Period,
} from "@/lib/time";
import { isUuid } from "@/lib/validate";

export type SummaryRow = {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  seconds: number;
  cents: number;
  currency: string;
};

export function summarize(entries: Array<TimeEntryRecord & { endedAt: Date }>) {
  const byProject = new Map<string, SummaryRow>();
  for (const entry of entries) {
    const seconds = Math.max(
      0,
      Math.round((entry.endedAt.getTime() - entry.startedAt.getTime()) / 1000),
    );
    const current = byProject.get(entry.projectId) ?? {
      clientId: entry.clientId,
      clientName: entry.clientName,
      projectId: entry.projectId,
      projectName: entry.projectName,
      seconds: 0,
      cents: 0,
      currency: entry.currency,
    };
    current.seconds += seconds;
    current.cents += amountCents(seconds, entry.hourlyRateCents);
    byProject.set(entry.projectId, current);
  }

  const rows = [...byProject.values()].sort((a, b) =>
    `${a.clientName} ${a.projectName}`.localeCompare(`${b.clientName} ${b.projectName}`),
  );
  const totalSeconds = rows.reduce((sum, row) => sum + row.seconds, 0);
  const totalsByCurrency = new Map<string, number>();
  for (const row of rows) {
    totalsByCurrency.set(row.currency, (totalsByCurrency.get(row.currency) ?? 0) + row.cents);
  }
  return { rows, totalSeconds, totalsByCurrency };
}

export function formatCurrencyTotals(totals: Map<string, number>) {
  if (totals.size === 0) return formatMoney(0, "USD");
  return [...totals.entries()]
    .map(([currency, cents]) => formatMoney(cents, currency))
    .join(" · ");
}

function csvCell(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function buildCsv(
  entries: Array<TimeEntryRecord & { endedAt: Date }>,
  timeZone: string,
) {
  const header = [
    "date",
    "client",
    "project",
    "ticket",
    "description",
    "start",
    "end",
    "hours",
    "rate",
    "amount",
    "currency",
  ];
  const lines = [header.join(",")];
  const ordered = [...entries].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
  );
  for (const entry of ordered) {
    const seconds = Math.max(
      0,
      Math.round((entry.endedAt.getTime() - entry.startedAt.getTime()) / 1000),
    );
    const cents = amountCents(seconds, entry.hourlyRateCents);
    lines.push(
      [
        formatDateTime(entry.startedAt, timeZone).slice(0, 10),
        entry.clientName,
        entry.projectName,
        entry.ticketRef,
        entry.description,
        formatDateTime(entry.startedAt, timeZone),
        formatDateTime(entry.endedAt, timeZone),
        decimalHours(seconds),
        (entry.hourlyRateCents / 100).toFixed(2),
        (cents / 100).toFixed(2),
        entry.currency,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function resolveReportSearch(input: {
  period?: string;
  date?: string;
  client?: string;
  project?: string;
  timeZone: string;
  weekStartsOn: number;
  now?: Date;
}) {
  const period = parsePeriod(input.period);
  const today = getZonedParts(input.now ?? new Date(), input.timeZone);
  const anchor = parseDateISO(input.date ?? "") ?? {
    year: today.year,
    month: today.month,
    day: today.day,
  };
  const range = periodRange(anchor, period, input.weekStartsOn, input.timeZone);
  const clientId = input.client && isUuid(input.client) ? input.client : undefined;
  const projectId = input.project && isUuid(input.project) ? input.project : undefined;
  return {
    period,
    anchor,
    range,
    clientId,
    projectId,
    date: formatDateISO(anchor),
  };
}

export function activeProjectId(
  clients: Array<{ id: string; projects: Array<{ id: string }> }>,
  clientId: string | undefined,
  projectId: string | undefined,
) {
  if (!projectId) return undefined;
  const owner = clients.find((client) =>
    client.projects.some((project) => project.id === projectId),
  );
  if (!owner) return undefined;
  if (clientId && owner.id !== clientId) return undefined;
  return projectId;
}

export function exportFilename(period: Period, start: string, end: string) {
  if (period === "day") return `timesheet-${start}.csv`;
  return `timesheet-${start}-to-${end}.csv`;
}
