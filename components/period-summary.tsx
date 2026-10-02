import { decimalHours, formatHoursMinutes, formatMoney } from "@/lib/time";
import type { SummaryRow } from "@/lib/report";
import { cardClass } from "@/lib/styles";

export function PeriodSummary({
  label,
  totalSeconds,
  amountLabel,
  rows,
}: {
  label: string;
  totalSeconds: number;
  amountLabel: string;
  rows?: SummaryRow[];
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cardClass}>
          <p className="text-sm text-muted">Hours</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
            {decimalHours(totalSeconds)}
          </p>
          <p className="mt-1 text-sm text-muted">{formatHoursMinutes(totalSeconds)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-muted">Billable</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{amountLabel}</p>
          <p className="mt-1 text-sm text-muted">{label}</p>
        </div>
      </div>
      {rows && rows.length > 0 ? (
        <div className={`${cardClass} overflow-x-auto`}>
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 text-right font-medium">Hours</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.projectId} className="border-b border-line last:border-b-0">
                  <td className="py-3">{row.clientName}</td>
                  <td className="py-3">{row.projectName}</td>
                  <td className="py-3 text-right tabular-nums">{decimalHours(row.seconds)}</td>
                  <td className="py-3 text-right tabular-nums">
                    {formatMoney(row.cents, row.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
