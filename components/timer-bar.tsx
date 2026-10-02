"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  dismissCountdownAlert,
  finishCountdown,
  startTimer,
  stopTimer,
} from "@/app/actions/entries";
import { formatClock, formatHoursMinutes } from "@/lib/time";
import {
  buttonClass,
  cardClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/lib/styles";
import type { ClientOption, OpenTimer, PendingAlert } from "@/lib/types";
import { TicketRef } from "@/components/ticket-ref";

function playChime() {
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const context = new AudioContextCtor();
  const startAt = context.currentTime;
  [880, 1174].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const noteStart = startAt + index * 0.18;
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.15, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.35);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.4);
  });
  window.setTimeout(() => void context.close(), 1200);
}

async function notify(alert: PendingAlert) {
  if (typeof Notification === "undefined") return;
  const title = "Countdown finished";
  const body = `${formatHoursMinutes(alert.seconds)} saved for ${alert.clientName} / ${alert.projectName}`;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
    return;
  }
  if (Notification.permission === "denied") return;
  const permission = await Notification.requestPermission();
  if (permission === "granted") new Notification(title, { body });
}

export function TimerBar({
  open,
  alert,
}: {
  open: OpenTimer | null;
  alert: PendingAlert | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  const finishing = useRef(false);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  useEffect(() => {
    if (!open || open.mode !== "countdown" || open.allottedSeconds == null) return;
    const end = new Date(open.startedAt).getTime() + open.allottedSeconds * 1000;
    if (Date.now() + 500 < end || finishing.current) return;
    finishing.current = true;
    void finishCountdown()
      .then((result) => {
        if (!result.finished) {
          window.setTimeout(() => {
            finishing.current = false;
          }, 1000);
        }
      })
      .catch(() => {
        window.setTimeout(() => {
          finishing.current = false;
        }, 1000);
      });
  }, [now, open]);

  const played = useRef<string | null>(null);

  useEffect(() => {
    if (!alert || played.current === alert.id) return;
    try {
      const key = `timesheet-alert:${alert.id}`;
      if (sessionStorage.getItem(key)) {
        played.current = alert.id;
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // Private browsing can block storage. Still play the alert once.
    }
    played.current = alert.id;
    playChime();
    void notify(alert);
  }, [alert]);

  if (!open && !alert) return null;

  const started = open ? new Date(open.startedAt).getTime() : 0;
  const elapsed = open ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
  const remaining =
    open?.mode === "countdown" && open.allottedSeconds != null
      ? Math.max(0, open.allottedSeconds - elapsed)
      : null;
  const progress =
    open?.mode === "countdown" && open.allottedSeconds
      ? Math.min(100, (elapsed / open.allottedSeconds) * 100)
      : 0;

  return (
    <div className="border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
        {alert ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent/10 px-3 py-2 text-sm"
          >
            <p>
              Countdown finished. {formatHoursMinutes(alert.seconds)} saved for{" "}
              {alert.clientName} / {alert.projectName}
              {alert.ticketRef ? (
                <>
                  {" "}
                  · <TicketRef value={alert.ticketRef} />
                </>
              ) : null}
              .
            </p>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void dismissCountdownAlert(alert.id)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {open ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {open.mode === "countdown" ? "Countdown" : "Tracking"}
              </p>
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
                {formatClock(remaining ?? elapsed)}
              </p>
              <p className="mt-1 text-sm">
                {open.clientName} / {open.projectName}
                {open.ticketRef ? (
                  <>
                    {" "}
                    · <TicketRef value={open.ticketRef} />
                  </>
                ) : null}
              </p>
              {open.description ? (
                <p className="mt-1 max-w-xl truncate text-sm text-muted">{open.description}</p>
              ) : null}
            </div>
            <form action={stopTimer}>
              <button type="submit" className={buttonClass}>
                Stop
              </button>
            </form>
            {remaining != null ? (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TrackForm({ clients }: { clients: ClientOption[] }) {
  const ready = clients.some((client) => client.projects.length > 0);
  const initialClient = clients.find((client) => client.projects.length > 0);
  const [mode, setMode] = useState<"countup" | "countdown">("countup");
  const [clientId, setClientId] = useState(initialClient?.id ?? "");
  const projects = clients.find((client) => client.id === clientId)?.projects ?? [];
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [state, action, pending] = useActionState(startTimer, null);

  if (!ready) {
    return (
      <section className={cardClass}>
        <h2 className="text-lg font-semibold">Track time</h2>
        <p className="mt-2 text-sm text-muted">
          Add a client and a project before starting a timer.
        </p>
        <Link href="/clients" className={`${buttonClass} mt-4`}>
          Add a client
        </Link>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Track time</h2>
        <div className="flex rounded-lg bg-stone-100 p-1 text-sm">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${mode === "countup" ? "bg-white font-medium shadow-sm" : "text-muted"}`}
            aria-pressed={mode === "countup"}
            onClick={() => setMode("countup")}
          >
            Count up
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${mode === "countdown" ? "bg-white font-medium shadow-sm" : "text-muted"}`}
            aria-pressed={mode === "countdown"}
            onClick={() => setMode("countdown")}
          >
            Countdown
          </button>
        </div>
      </div>
      <form
        action={action}
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={() => {
          if (
            mode === "countdown" &&
            typeof Notification !== "undefined" &&
            Notification.permission === "default"
          ) {
            void Notification.requestPermission();
          }
        }}
      >
        <input type="hidden" name="mode" value={mode} />
        <label className="text-sm">
          <span className={labelClass}>Client</span>
          <select
            value={clientId}
            className={inputClass}
            onChange={(event) => {
              const nextClient = event.target.value;
              setClientId(nextClient);
              const nextProject =
                clients.find((client) => client.id === nextClient)?.projects[0]?.id ?? "";
              setProjectId(nextProject);
            }}
          >
            {clients
              .filter((client) => client.projects.length > 0)
              .map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          <span className={labelClass}>Project</span>
          <select
            name="projectId"
            value={projectId}
            className={inputClass}
            onChange={(event) => setProjectId(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className={labelClass}>Ticket</span>
          <input
            name="ticketRef"
            placeholder="PROJ-123 or a link"
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Description</span>
          <input name="description" placeholder="What you're working on" className={inputClass} />
        </label>
        {mode === "countdown" ? (
          <>
            <label className="text-sm">
              <span className={labelClass}>Hours</span>
              <input
                type="number"
                name="hours"
                min={0}
                max={24}
                step={1}
                defaultValue={1}
                className={inputClass}
              />
            </label>
            <label className="text-sm">
              <span className={labelClass}>Minutes</span>
              <input
                type="number"
                name="minutes"
                min={0}
                max={59}
                step={1}
                defaultValue={0}
                className={inputClass}
              />
            </label>
            <p className="text-sm text-muted sm:col-span-2">
              When this hits zero, this tab plays a sound, shows a banner, and sends a browser
              notification if you allow it. If the tab is closed, the banner appears the next time
              you open the app.
            </p>
          </>
        ) : null}
        {state?.error ? (
          <p className="text-sm text-danger sm:col-span-2" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="sm:col-span-2">
          <button type="submit" className={buttonClass} disabled={pending || !projectId}>
            {pending ? "Starting…" : mode === "countdown" ? "Start countdown" : "Track time"}
          </button>
        </div>
      </form>
    </section>
  );
}
