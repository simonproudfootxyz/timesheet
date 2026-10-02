import type { TimeEntryRecord } from "@/lib/data";
import { secondsBetween, toDateInputValue, toTimeInputValue } from "@/lib/time";
import type { ClientOption, EntryListItem, OpenTimer } from "@/lib/types";

type ClientWithProjects = {
  id: string;
  name: string;
  hourlyRateCents: number;
  currency: string;
  projects: { id: string; name: string }[];
};

export function toClientOptions(clients: ClientWithProjects[]): ClientOption[] {
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    hourlyRateCents: client.hourlyRateCents,
    currency: client.currency,
    projects: client.projects.map((project) => ({
      id: project.id,
      name: project.name,
    })),
  }));
}

export function toOpenTimer(entry: TimeEntryRecord | null): OpenTimer | null {
  if (!entry || entry.endedAt || entry.mode === "manual") return null;
  return {
    id: entry.id,
    mode: entry.mode,
    startedAt: entry.startedAt.toISOString(),
    allottedSeconds: entry.allottedSeconds,
    clientName: entry.clientName,
    projectName: entry.projectName,
    ticketRef: entry.ticketRef,
    description: entry.description,
  };
}

export function toEntryListItem(
  entry: TimeEntryRecord & { endedAt: Date },
  timeZone: string,
): EntryListItem {
  return {
    id: entry.id,
    projectId: entry.projectId,
    clientId: entry.clientId,
    clientName: entry.clientName,
    projectName: entry.projectName,
    ticketRef: entry.ticketRef,
    description: entry.description,
    mode: entry.mode,
    date: toDateInputValue(entry.startedAt, timeZone),
    startTime: toTimeInputValue(entry.startedAt, timeZone),
    endTime: toTimeInputValue(entry.endedAt, timeZone),
    seconds: secondsBetween(entry.startedAt, entry.endedAt),
    hourlyRateCents: entry.hourlyRateCents,
    currency: entry.currency,
  };
}
