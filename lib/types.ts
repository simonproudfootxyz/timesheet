export type ActionState = { error: string } | null;

export type EntryMode = "countup" | "countdown" | "manual";

export type ProjectOption = {
  id: string;
  name: string;
};

export type ClientOption = {
  id: string;
  name: string;
  hourlyRateCents: number;
  currency: string;
  projects: ProjectOption[];
};

export type OpenTimer = {
  id: string;
  mode: "countup" | "countdown";
  startedAt: string;
  allottedSeconds: number | null;
  clientName: string;
  projectName: string;
  ticketRef: string | null;
  description: string | null;
};

export type PendingAlert = {
  id: string;
  clientName: string;
  projectName: string;
  ticketRef: string | null;
  seconds: number;
};

export type EntryListItem = {
  id: string;
  projectId: string;
  clientId: string;
  clientName: string;
  projectName: string;
  ticketRef: string | null;
  description: string | null;
  mode: EntryMode;
  date: string;
  startTime: string;
  endTime: string;
  seconds: number;
  hourlyRateCents: number;
  currency: string;
};
