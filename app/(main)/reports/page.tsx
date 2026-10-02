import { EntryList } from "@/components/entry-list";
import { PeriodSummary } from "@/components/period-summary";
import { ReportControls } from "@/components/report-controls";
import {
  getSettings,
  listClientsWithProjects,
  listClosedEntries,
  loadTimerState,
} from "@/lib/data";
import { formatCurrencyTotals, resolveReportSearch, summarize } from "@/lib/report";
import { formatDateISO, formatPeriodLabel } from "@/lib/time";
import { toClientOptions, toEntryListItem } from "@/lib/view";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string; client?: string }>;
}) {
  const settings = await getSettings();
  const search = await searchParams;
  const report = resolveReportSearch({
    period: search.period,
    date: search.date,
    client: search.client,
    timeZone: settings.timezone,
    weekStartsOn: settings.weekStartsOn,
  });
  const timer = await loadTimerState();
  const [entries, clients] = await Promise.all([
    listClosedEntries(report.range.start, report.range.end, report.clientId),
    listClientsWithProjects(),
  ]);
  const summary = summarize(entries);
  const clientOptions = toClientOptions(clients);
  const label = formatPeriodLabel(report.period, report.range.startParts, report.range.endParts);
  const openInRange =
    timer.open != null &&
    timer.open.startedAt >= report.range.start &&
    timer.open.startedAt < report.range.end;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">{label}</p>
        <p className="mt-1 text-sm text-muted">
          Weeks start on Monday. Dates use {settings.timezone}.
        </p>
      </div>
      <ReportControls
        period={report.period}
        anchor={report.anchor}
        date={report.date}
        clientId={report.clientId}
        clients={clientOptions}
      />
      {openInRange ? (
        <p className="text-sm text-muted">
          A timer is still running in this period, so it is not included in the total yet.
        </p>
      ) : null}
      <PeriodSummary
        label={label}
        totalSeconds={summary.totalSeconds}
        amountLabel={formatCurrencyTotals(summary.totalsByCurrency)}
        rows={summary.rows}
      />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Entries</h2>
        <EntryList
          entries={entries.map((entry) => toEntryListItem(entry, settings.timezone))}
          clients={clientOptions}
          today={formatDateISO(report.anchor)}
        />
      </section>
    </div>
  );
}
