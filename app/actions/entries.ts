"use server";

import { requireSession } from "@/app/actions/auth";
import {
  deleteEntry,
  dismissAlert,
  finishCountdownIfDue,
  getSettings,
  insertManualEntry,
  insertOpenEntry,
  stopOpenEntry,
  updateClosedEntry,
} from "@/lib/data";
import { refreshApp } from "@/lib/revalidate";
import { parseClock, parseDateISO, secondsBetween, zonedDateTimeToUtc } from "@/lib/time";
import type { ActionState } from "@/lib/types";
import { optionalText, readId } from "@/lib/validate";

const MAX_ENTRY_SECONDS = 24 * 60 * 60;

function entryDetails(formData: FormData) {
  const projectId = readId(formData.get("projectId"));
  if (!projectId) return { ok: false as const, error: "Choose a project." };
  const ticket = optionalText(formData.get("ticketRef"), 200);
  if (!ticket.ok) return { ok: false as const, error: "Ticket reference must be 200 characters or fewer." };
  const description = optionalText(formData.get("description"), 2000);
  if (!description.ok) {
    return { ok: false as const, error: "Description must be 2,000 characters or fewer." };
  }
  return {
    ok: true as const,
    projectId,
    ticketRef: ticket.value,
    description: description.value,
  };
}

async function rangeFromForm(formData: FormData) {
  const settings = await getSettings();
  const date = parseDateISO(String(formData.get("date") ?? ""));
  const startClock = parseClock(String(formData.get("startTime") ?? ""));
  if (!date || !startClock) {
    return { ok: false as const, error: "Enter a date and a start time." };
  }
  const startedAt = zonedDateTimeToUtc(
    { ...date, hour: startClock.hour, minute: startClock.minute, second: 0 },
    settings.timezone,
  );

  const endValue = String(formData.get("endTime") ?? "");
  let endedAt: Date | null = null;
  if (endValue.trim()) {
    const endClock = parseClock(endValue);
    if (!endClock) return { ok: false as const, error: "Enter a valid end time." };
    endedAt = zonedDateTimeToUtc(
      { ...date, hour: endClock.hour, minute: endClock.minute, second: 0 },
      settings.timezone,
    );
  } else {
    const hours = Number(formData.get("durationHours"));
    const minutes = Number(formData.get("durationMinutes"));
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return { ok: false as const, error: "Enter an end time, or a duration." };
    }
    const duration = hours * 3600 + minutes * 60;
    if (duration <= 0) {
      return { ok: false as const, error: "Enter an end time, or a duration." };
    }
    endedAt = new Date(startedAt.getTime() + duration * 1000);
  }

  if (endedAt.getTime() <= startedAt.getTime()) {
    return { ok: false as const, error: "End time has to be after the start time." };
  }
  if (secondsBetween(startedAt, endedAt) > MAX_ENTRY_SECONDS) {
    return { ok: false as const, error: "An entry can't be longer than 24 hours." };
  }
  return { ok: true as const, startedAt, endedAt };
}

export async function startTimer(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const details = entryDetails(formData);
  if (!details.ok) return { error: details.error };

  const mode = formData.get("mode") === "countdown" ? "countdown" : "countup";
  let allottedSeconds: number | null = null;
  if (mode === "countdown") {
    const hours = Number(formData.get("hours"));
    const minutes = Number(formData.get("minutes"));
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 24 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return { error: "Enter a countdown up to 24 hours." };
    }
    allottedSeconds = hours * 3600 + minutes * 60;
    if (allottedSeconds < 60 || allottedSeconds > MAX_ENTRY_SECONDS) {
      return { error: "Enter a countdown from 1 minute to 24 hours." };
    }
  }

  const result = await insertOpenEntry({
    projectId: details.projectId,
    ticketRef: details.ticketRef,
    description: details.description,
    mode,
    allottedSeconds,
  });
  if (result === "busy") {
    return { error: "Stop the current timer before starting another." };
  }
  if (result === "missing-project") {
    return { error: "Choose a project." };
  }
  refreshApp();
  return null;
}

export async function stopTimer() {
  await requireSession();
  await stopOpenEntry();
  refreshApp();
}

export async function finishCountdown() {
  await requireSession();
  const finished = await finishCountdownIfDue();
  if (finished) refreshApp();
  return { finished };
}

export async function dismissCountdownAlert(id: string) {
  await requireSession();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await dismissAlert(id);
  refreshApp();
}

export async function saveManualEntry(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const details = entryDetails(formData);
  if (!details.ok) return { error: details.error };
  const range = await rangeFromForm(formData);
  if (!range.ok) return { error: range.error };

  const id = formData.get("id");
  if (typeof id === "string" && id.length > 0) {
    if (!readId(id)) return { error: "That entry could not be found." };
    const result = await updateClosedEntry(id, {
      projectId: details.projectId,
      ticketRef: details.ticketRef,
      description: details.description,
      startedAt: range.startedAt,
      endedAt: range.endedAt,
    });
    if (result === "missing") return { error: "That entry could not be found." };
    if (result === "open") return { error: "Stop the timer before editing it." };
    if (result === "missing-project") return { error: "Choose a project." };
  } else {
    const result = await insertManualEntry({
      projectId: details.projectId,
      ticketRef: details.ticketRef,
      description: details.description,
      startedAt: range.startedAt,
      endedAt: range.endedAt,
    });
    if (result === "missing-project") return { error: "Choose a project." };
  }

  refreshApp();
  return null;
}

export async function removeEntry(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const id = readId(formData.get("id"));
  if (!id) return { error: "That entry could not be found." };
  await deleteEntry(id);
  refreshApp();
  return null;
}
