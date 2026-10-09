"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClientOption } from "@/lib/types";
import { formatDateISO, shiftAnchor, type DateParts, type Period } from "@/lib/time";
import { secondaryButtonClass } from "@/lib/styles";

function reportHref(period: Period, date: string, clientId?: string, projectId?: string) {
  const params = new URLSearchParams({ period, date });
  if (clientId) params.set("client", clientId);
  if (projectId) params.set("project", projectId);
  return `/reports?${params.toString()}`;
}

function projectChoices(clients: ClientOption[], clientId: string) {
  const source = clientId ? clients.filter((client) => client.id === clientId) : clients;
  return source.flatMap((client) =>
    client.projects.map((project) => ({
      id: project.id,
      label: clientId ? project.name : `${client.name} / ${project.name}`,
    })),
  );
}

export function ReportControls({
  period,
  anchor,
  date,
  clientId,
  projectId,
  clients,
}: {
  period: Period;
  anchor: DateParts;
  date: string;
  clientId?: string;
  projectId?: string;
  clients: ClientOption[];
}) {
  const [client, setClient] = useState(clientId ?? "");
  const [project, setProject] = useState(projectId ?? "");
  const projects = projectChoices(clients, client);
  const previous = formatDateISO(shiftAnchor(anchor, period, -1));
  const next = formatDateISO(shiftAnchor(anchor, period, 1));
  const exportParams = new URLSearchParams({ period, date });
  if (clientId) exportParams.set("client", clientId);
  if (projectId) exportParams.set("project", projectId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["day", "week", "month"] as const).map((option) => (
          <Link
            key={option}
            href={reportHref(option, date, clientId, projectId)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
              option === period
                ? "bg-accent text-accent-foreground"
                : "bg-white text-foreground ring-1 ring-line hover:bg-stone-50"
            }`}
            aria-current={option === period ? "page" : undefined}
          >
            {option}
          </Link>
        ))}
        <Link href={reportHref(period, previous, clientId, projectId)} className={secondaryButtonClass}>
          Previous
        </Link>
        <Link href={reportHref(period, next, clientId, projectId)} className={secondaryButtonClass}>
          Next
        </Link>
        <a
          href={`/api/export?${exportParams.toString()}`}
          className={secondaryButtonClass}
        >
          Export CSV
        </a>
      </div>
      <form action="/reports" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="period" value={period} />
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="h-10 rounded-lg border border-line bg-white px-3 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">Client</span>
          <select
            name="client"
            value={client}
            className="h-10 rounded-lg border border-line bg-white px-3 text-sm"
            onChange={(event) => {
              const nextClient = event.target.value;
              const allowed = new Set(projectChoices(clients, nextClient).map((item) => item.id));
              setClient(nextClient);
              if (!allowed.has(project)) setProject("");
            }}
          >
            <option value="">All clients</option>
            {clients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">Project</span>
          <select
            name="project"
            value={project}
            className="h-10 min-w-40 rounded-lg border border-line bg-white px-3 text-sm"
            onChange={(event) => setProject(event.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={secondaryButtonClass}>
          Apply
        </button>
      </form>
    </div>
  );
}
