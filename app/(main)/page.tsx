import { EntryForm } from "@/components/entry-form";
import { EntryList } from "@/components/entry-list";
import { PeriodSummary } from "@/components/period-summary";
import { TrackForm } from "@/components/timer-bar";
import {
  getSettings,
  listClientsWithProjects,
  listClosedEntries,
  loadTimerState,
} from "@/lib/data";
import { formatCurrencyTotals, summarize } from "@/lib/report";
import { cardClass } from "@/lib/styles";
import {
  formatDateISO,
  formatDayLabel,
  getZonedParts,
  periodRange,
} from "@/lib/time";
import { toClientOptions, toEntryListItem } from "@/lib/view";

export default async function HomePage() {
  const settings = await getSettings();
  const todayParts = getZonedParts(new Date(), settings.timezone);
  const range = periodRange(
    todayParts,
    "day",
    settings.weekStartsOn,
    settings.timezone,
  );
  const timer = await loadTimerState();
  const [entries, clients] = await Promise.all([
    listClosedEntries(range.start, range.end),
    listClientsWithProjects(),
  ]);
  const summary = summarize(entries);
  const clientOptions = toClientOptions(clients);
  const today = formatDateISO(todayParts);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-muted">{formatDayLabel(todayParts)}</p>
      </div>
      {timer.open ? null : <TrackForm clients={clientOptions} />}
      {timer.open ? (
        <p className="text-sm text-muted">
          A timer is running. Today&apos;s total updates when you stop it.
        </p>
      ) : null}
      <PeriodSummary
        label={formatDayLabel(todayParts)}
        totalSeconds={summary.totalSeconds}
        amountLabel={formatCurrencyTotals(summary.totalsByCurrency)}
      />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Entries</h2>
        <EntryList
          entries={entries.map((entry) => toEntryListItem(entry, settings.timezone))}
          clients={clientOptions}
          today={today}
        />
      </section>
      {clientOptions.some((client) => client.projects.length > 0) ? (
        <section className={`${cardClass} space-y-4`}>
          <h2 className="text-lg font-semibold">Add time</h2>
          <EntryForm
            key={`${entries.length}:${entries[0]?.id ?? "none"}`}
            clients={clientOptions}
            today={today}
          />
        </section>
      ) : null}
    </div>
  );
}
