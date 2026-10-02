import { ClientManager } from "@/components/client-manager";
import { getSettings, listClientsWithProjects } from "@/lib/data";
import { toClientOptions } from "@/lib/view";

export default async function ClientsPage() {
  const [clients, settings] = await Promise.all([
    listClientsWithProjects(),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="mt-1 text-sm text-muted">
          Rates are used for billable totals and CSV export. Changing a rate updates those
          totals for existing entries.
        </p>
      </div>
      <ClientManager clients={toClientOptions(clients)} timezone={settings.timezone} />
    </div>
  );
}
