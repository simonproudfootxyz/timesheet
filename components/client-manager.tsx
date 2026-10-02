"use client";

import { useActionState } from "react";
import {
  createClientAction,
  createProjectAction,
  deleteClientAction,
  deleteProjectAction,
  updateClientAction,
  updateProjectAction,
} from "@/app/actions/clients";
import { saveTimezone } from "@/app/actions/auth";
import { formatMoney, formatRate } from "@/lib/time";
import {
  buttonClass,
  cardClass,
  dangerButtonClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/lib/styles";
import type { ActionState, ClientOption } from "@/lib/types";

function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="text-sm text-danger" role="alert">
      {error}
    </p>
  );
}

function DeleteButton({
  action,
  id,
  name,
  label,
  confirm,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
  name: string;
  label: string;
  confirm: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <FormError error={state?.error} />
      <button type="submit" className={dangerButtonClass} disabled={pending}>
        {label}
        {name ? ` ${name}` : ""}
      </button>
    </form>
  );
}

function ProjectRow({ project }: { project: { id: string; name: string } }) {
  const [state, action, pending] = useActionState(updateProjectAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={project.id} />
      <input
        name="name"
        defaultValue={project.name}
        aria-label="Project name"
        className={`${inputClass} min-w-48 flex-1`}
      />
      <button type="submit" className={secondaryButtonClass} disabled={pending}>
        Save
      </button>
      <DeleteButton
        action={deleteProjectAction}
        id={project.id}
        name=""
        label="Delete"
        confirm={`Delete project ${project.name}?`}
      />
      <FormError error={state?.error} />
    </form>
  );
}

function AddProject({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(createProjectAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input
        name="name"
        placeholder="New project"
        aria-label="New project"
        className={`${inputClass} min-w-48 flex-1`}
      />
      <button type="submit" className={secondaryButtonClass} disabled={pending}>
        Add project
      </button>
      <FormError error={state?.error} />
    </form>
  );
}

function ClientCard({ client }: { client: ClientOption }) {
  const [state, action, pending] = useActionState(updateClientAction, null);
  return (
    <article className={cardClass}>
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_8rem_6rem_auto]">
        <input type="hidden" name="id" value={client.id} />
        <label className="text-sm">
          <span className={labelClass}>Client</span>
          <input name="name" defaultValue={client.name} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Hourly rate</span>
          <input
            name="rate"
            inputMode="decimal"
            defaultValue={formatRate(client.hourlyRateCents)}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Currency</span>
          <input
            name="currency"
            defaultValue={client.currency}
            maxLength={3}
            className={inputClass}
          />
        </label>
        <div className="flex items-end">
          <button type="submit" className={buttonClass} disabled={pending}>
            Save
          </button>
        </div>
      </form>
      <p className="mt-3 text-sm text-muted">
        {formatMoney(client.hourlyRateCents, client.currency)} / hour
      </p>
      <FormError error={state?.error} />
      <div className="mt-5 space-y-3">
        <h3 className="text-sm font-medium">Projects</h3>
        {client.projects.length === 0 ? (
          <p className="text-sm text-muted">No projects yet.</p>
        ) : (
          client.projects.map((project) => <ProjectRow key={project.id} project={project} />)
        )}
        <AddProject key={client.projects.length} clientId={client.id} />
      </div>
      <div className="mt-4">
        <DeleteButton
          action={deleteClientAction}
          id={client.id}
          name={client.name}
          label="Delete"
          confirm={`Delete ${client.name}? Projects without time entries will be removed too.`}
        />
      </div>
    </article>
  );
}

export function ClientManager({
  clients,
  timezone,
}: {
  clients: ClientOption[];
  timezone: string;
}) {
  const [createState, createAction, creating] = useActionState(createClientAction, null);
  const [zoneState, zoneAction, savingZone] = useActionState(saveTimezone, null);

  return (
    <div className="space-y-6">
      <form
        key={clients.length}
        action={createAction}
        className={`${cardClass} grid gap-4 sm:grid-cols-[1fr_8rem_6rem_auto]`}
      >
        <label className="text-sm">
          <span className={labelClass}>New client</span>
          <input name="name" placeholder="Client name" className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Hourly rate</span>
          <input name="rate" inputMode="decimal" placeholder="150.00" className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Currency</span>
          <input name="currency" defaultValue="USD" maxLength={3} className={inputClass} />
        </label>
        <div className="flex items-end">
          <button type="submit" className={buttonClass} disabled={creating}>
            Add client
          </button>
        </div>
        <div className="sm:col-span-4">
          <FormError error={createState?.error} />
        </div>
      </form>

      {clients.length === 0 ? (
        <p className="text-sm text-muted">No clients yet. Add one to start tracking time.</p>
      ) : (
        clients.map((client) => <ClientCard key={client.id} client={client} />)
      )}

      <form action={zoneAction} className={cardClass}>
        <h2 className="text-lg font-semibold">Timezone</h2>
        <p className="mt-1 text-sm text-muted">
          Day, week, and month totals use this timezone. Weeks start on Monday. It was set from
          your browser the first time you signed in.
        </p>
        <label className="mt-4 block max-w-sm text-sm">
          <span className={labelClass}>IANA timezone</span>
          <input
            name="timezone"
            defaultValue={timezone}
            placeholder="America/New_York"
            className={inputClass}
          />
        </label>
        <FormError error={zoneState?.error} />
        <button type="submit" className={`${secondaryButtonClass} mt-4`} disabled={savingZone}>
          Save timezone
        </button>
      </form>
    </div>
  );
}
