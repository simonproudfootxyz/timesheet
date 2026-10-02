"use client";

import { useActionState, useState } from "react";
import { removeEntry } from "@/app/actions/entries";
import { EntryForm } from "@/components/entry-form";
import { TicketRef } from "@/components/ticket-ref";
import { amountCents, decimalHours, formatHoursMinutes, formatMoney } from "@/lib/time";
import { cardClass, dangerButtonClass, secondaryButtonClass } from "@/lib/styles";
import type { ClientOption, EntryListItem, EntryMode } from "@/lib/types";

const modeLabel: Record<EntryMode, string> = {
  countup: "Count up",
  countdown: "Countdown",
  manual: "Manual",
};

function DeleteEntry({ id }: { id: string }) {
  const [state, action, pending] = useActionState(removeEntry, null);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Delete this time entry?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button type="submit" className={dangerButtonClass} disabled={pending}>
        Delete
      </button>
    </form>
  );
}

function EntryRow({
  entry,
  clients,
  today,
}: {
  entry: EntryListItem;
  clients: ClientOption[];
  today: string;
}) {
  const snapshot = [
    entry.projectId,
    entry.date,
    entry.startTime,
    entry.endTime,
    entry.ticketRef,
    entry.description,
  ].join("|");
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(snapshot);
  if (snapshot !== seen) {
    setSeen(snapshot);
    setOpen(false);
  }

  return (
    <li className="border-b border-line py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {entry.clientName} / {entry.projectName}
          </p>
          <p className="mt-1 text-sm text-muted">
            {entry.date} · {entry.startTime}–{entry.endTime} · {formatHoursMinutes(entry.seconds)} ·{" "}
            {modeLabel[entry.mode]}
          </p>
          {entry.ticketRef ? (
            <p className="mt-1 text-sm">
              <TicketRef value={entry.ticketRef} />
            </p>
          ) : null}
          {entry.description ? <p className="mt-1 text-sm">{entry.description}</p> : null}
        </div>
        <div className="text-right">
          <p className="font-medium tabular-nums">
            {formatMoney(amountCents(entry.seconds, entry.hourlyRateCents), entry.currency)}
          </p>
          <p className="text-sm text-muted tabular-nums">{decimalHours(entry.seconds)} h</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={secondaryButtonClass} onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "Edit"}
        </button>
        <DeleteEntry id={entry.id} />
      </div>
      {open ? (
        <div className="mt-4">
          <EntryForm
            clients={clients}
            today={today}
            submitLabel="Save changes"
            entry={{
              id: entry.id,
              projectId: entry.projectId,
              clientId: entry.clientId,
              ticketRef: entry.ticketRef,
              description: entry.description,
              date: entry.date,
              startTime: entry.startTime,
              endTime: entry.endTime,
            }}
          />
        </div>
      ) : null}
    </li>
  );
}

export function EntryList({
  entries,
  clients,
  today,
}: {
  entries: EntryListItem[];
  clients: ClientOption[];
  today: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted">No time saved in this period.</p>;
  }

  return (
    <ul className={cardClass}>
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} clients={clients} today={today} />
      ))}
    </ul>
  );
}
