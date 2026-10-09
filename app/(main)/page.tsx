import { DayPicker } from "@/components/day-picker";
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
  addDays,
  formatDateISO,
  formatDayLabel,
  getZonedParts,
  parseDateISO,
  periodRange,
} from "@/lib/time";
import { toClientOptions, toEntryListItem } from "@/lib/view";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const settings = await getSettings();
  const search = await searchParams;
  const todayParts = getZonedParts(new Date(), settings.timezone);
  const selected =
    parseDateISO(search.date ?? "") ?? {
      year: todayParts.year,
      month: todayParts.month,
      day: todayParts.day,
    };
  const selectedDate = formatDateISO(selected);
  const isToday = selectedDate === formatDateISO(todayParts);
  const range = periodRange(selected, "day", settings.weekStartsOn, settings.timezone);
  const previous = formatDateISO(addDays(selected, -1));
  const next = formatDateISO(addDays(selected, 1));
  const timer = await loadTimerState();
  const [entries, clients] = await Promise.all([
    listClosedEntries(range.start, range.end),
    listClientsWithProjects(),
  ]);
  const summary = summarize(entries);
  const clientOptions = toClientOptions(clients);
  const dayLabel = formatDayLabel(selected);
  const openOnDay =
    timer.open != null &&
    timer.open.startedAt >= range.start &&
    timer.open.startedAt < range.end;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{isToday ? "Today" : dayLabel}</h1>
        {isToday ? <p className="mt-1 text-sm text-muted">{dayLabel}</p> : null}
      </div>
      <DayPicker key={selectedDate} date={selectedDate} previous={previous} next={next} />
      {timer.open ? null : <TrackForm clients={clientOptions} />}
      {openOnDay ? (
        <p className="text-sm text-muted">
          A timer is running. {isToday ? "Today's" : "This day's"} total updates when you stop it.
        </p>
      ) : null}
      <PeriodSummary
        label={dayLabel}
        totalSeconds={summary.totalSeconds}
        amountLabel={formatCurrencyTotals(summary.totalsByCurrency)}
      />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Entries</h2>
        <EntryList
          entries={entries.map((entry) => toEntryListItem(entry, settings.timezone))}
          clients={clientOptions}
          today={selectedDate}
        />
      </section>
      {clientOptions.some((client) => client.projects.length > 0) ? (
        <section className={`${cardClass} space-y-4`}>
          <h2 className="text-lg font-semibold">Add time</h2>
          <EntryForm
            key={`${selectedDate}:${entries.length}:${entries[0]?.id ?? "none"}`}
            clients={clientOptions}
            today={selectedDate}
          />
        </section>
      ) : null}
    </div>
  );
}
