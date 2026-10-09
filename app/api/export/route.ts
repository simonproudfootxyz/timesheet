import { cookies } from "next/headers";
import { getSettings, listClientsWithProjects, listClosedEntries } from "@/lib/data";
import { activeProjectId, buildCsv, exportFilename, resolveReportSearch } from "@/lib/report";
import { formatDateISO } from "@/lib/time";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { toClientOptions } from "@/lib/view";

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
    project: url.searchParams.get("project") ?? undefined,
    timeZone: settings.timezone,
    weekStartsOn: settings.weekStartsOn,
  });
  const clients = await listClientsWithProjects();
  const projectId = activeProjectId(
    toClientOptions(clients),
    report.clientId,
    report.projectId,
  );
  const entries = await listClosedEntries(
    report.range.start,
    report.range.end,
    report.clientId,
    projectId,
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
