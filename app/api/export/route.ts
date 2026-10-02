import { cookies } from "next/headers";
import { getSettings, listClosedEntries } from "@/lib/data";
import { buildCsv, exportFilename, resolveReportSearch } from "@/lib/report";
import { formatDateISO } from "@/lib/time";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function GET(request: Request) {
  const jar = await cookies();
  if (!verifySessionToken(jar.get(SESSION_COOKIE)?.value)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const settings = await getSettings();
  const report = resolveReportSearch({
    period: url.searchParams.get("period") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    client: url.searchParams.get("client") ?? undefined,
    timeZone: settings.timezone,
    weekStartsOn: settings.weekStartsOn,
  });
  const entries = await listClosedEntries(
    report.range.start,
    report.range.end,
    report.clientId,
  );
  const csv = buildCsv(entries, settings.timezone);
  const filename = exportFilename(
    report.period,
    formatDateISO(report.range.startParts),
    formatDateISO(report.range.endParts),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
