import Link from "next/link";
import type { ClientOption } from "@/lib/types";
import { formatDateISO, shiftAnchor, type DateParts, type Period } from "@/lib/time";
import { secondaryButtonClass } from "@/lib/styles";

function reportHref(period: Period, date: string, clientId?: string) {
  const params = new URLSearchParams({ period, date });
  if (clientId) params.set("client", clientId);
  return `/reports?${params.toString()}`;
}

export function ReportControls({
  period,
  anchor,
  date,
  clientId,
  clients,
}: {
  period: Period;
  anchor: DateParts;
  date: string;
  clientId?: string;
  clients: ClientOption[];
}) {
  const previous = formatDateISO(shiftAnchor(anchor, period, -1));
  const next = formatDateISO(shiftAnchor(anchor, period, 1));
  const exportParams = new URLSearchParams({ period, date });
  if (clientId) exportParams.set("client", clientId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["day", "week", "month"] as const).map((option) => (
          <Link
            key={option}
            href={reportHref(option, date, clientId)}
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
        <Link href={reportHref(period, previous, clientId)} className={secondaryButtonClass}>
          Previous
        </Link>
        <Link href={reportHref(period, next, clientId)} className={secondaryButtonClass}>
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
            defaultValue={clientId ?? ""}
            className="h-10 rounded-lg border border-line bg-white px-3 text-sm"
          >
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
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
