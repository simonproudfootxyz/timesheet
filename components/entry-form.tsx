"use client";

import { useActionState, useState } from "react";
import { saveManualEntry } from "@/app/actions/entries";
import { buttonClass, inputClass, labelClass } from "@/lib/styles";
import type { ClientOption } from "@/lib/types";

export function EntryForm({
  clients,
  today,
  entry,
  submitLabel = "Add time",
}: {
  clients: ClientOption[];
  today: string;
  submitLabel?: string;
  entry?: {
    id: string;
    projectId: string;
    clientId: string;
    ticketRef: string | null;
    description: string | null;
    date: string;
    startTime: string;
    endTime: string;
  };
}) {
  const usable = clients.filter((client) => client.projects.length > 0);
  const [clientId, setClientId] = useState(entry?.clientId || usable[0]?.id || "");
  const projects = usable.find((client) => client.id === clientId)?.projects ?? [];
  const [projectId, setProjectId] = useState(entry?.projectId || projects[0]?.id || "");
  const [state, action, pending] = useActionState(saveManualEntry, null);

  if (usable.length === 0) return null;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <label className="text-sm">
        <span className={labelClass}>Client</span>
        <select
          value={clientId}
          className={inputClass}
          onChange={(event) => {
            const nextClient = event.target.value;
            setClientId(nextClient);
            const nextProject =
              usable.find((client) => client.id === nextClient)?.projects[0]?.id ?? "";
            setProjectId(nextProject);
          }}
        >
          {usable.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className={labelClass}>Project</span>
        <select
          name="projectId"
          value={projectId}
          className={inputClass}
          onChange={(event) => setProjectId(event.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className={labelClass}>Ticket</span>
        <input
          name="ticketRef"
          defaultValue={entry?.ticketRef ?? ""}
          placeholder="PROJ-123 or a link"
          className={inputClass}
        />
      </label>
      <label className="text-sm">
        <span className={labelClass}>Description</span>
        <input
          name="description"
          defaultValue={entry?.description ?? ""}
          className={inputClass}
        />
      </label>
      <label className="text-sm">
        <span className={labelClass}>Date</span>
        <input
          type="date"
          name="date"
          required
          defaultValue={entry?.date ?? today}
          className={inputClass}
        />
      </label>
      <label className="text-sm">
        <span className={labelClass}>Start</span>
        <input
          type="time"
          name="startTime"
          required
          defaultValue={entry?.startTime ?? "09:00"}
          className={inputClass}
        />
      </label>
      <label className="text-sm">
        <span className={labelClass}>End</span>
        <input type="time" name="endTime" defaultValue={entry?.endTime ?? ""} className={inputClass} />
      </label>
      {entry ? null : (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className={labelClass}>Or hours</span>
            <input type="number" name="durationHours" min={0} max={24} step={1} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className={labelClass}>Minutes</span>
            <input
              type="number"
              name="durationMinutes"
              min={0}
              max={59}
              step={1}
              className={inputClass}
            />
          </label>
        </div>
      )}
      {entry ? null : (
        <p className="text-sm text-muted sm:col-span-2">
          Leave the end time blank to use a duration instead. Entries stay on one date.
        </p>
      )}
      {state?.error ? (
        <p className="text-sm text-danger sm:col-span-2" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" className={buttonClass} disabled={pending || !projectId}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
