"use server";

import {
  createClient,
  createProject,
  deleteClient,
  deleteProject,
  updateClient,
  updateProject,
} from "@/lib/data";
import { refreshApp } from "@/lib/revalidate";
import type { ActionState } from "@/lib/types";
import { parseCurrency, parseRate, readId, requiredName } from "@/lib/validate";
import { requireSession } from "@/app/actions/auth";

export async function createClientAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const name = requiredName(formData.get("name"), "Client name");
  if (!name.ok) return { error: name.error };
  const rate = parseRate(formData.get("rate"));
  if (!rate.ok) return { error: rate.error };
  const currency = parseCurrency(formData.get("currency"));
  if (!currency.ok) return { error: currency.error };

  await createClient({
    name: name.value,
    hourlyRateCents: rate.value,
    currency: currency.value,
  });
  refreshApp();
  return null;
}

export async function updateClientAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const id = readId(formData.get("id"));
  if (!id) return { error: "That client could not be found." };
  const name = requiredName(formData.get("name"), "Client name");
  if (!name.ok) return { error: name.error };
  const rate = parseRate(formData.get("rate"));
  if (!rate.ok) return { error: rate.error };
  const currency = parseCurrency(formData.get("currency"));
  if (!currency.ok) return { error: currency.error };

  const updated = await updateClient(id, {
    name: name.value,
    hourlyRateCents: rate.value,
    currency: currency.value,
  });
  if (!updated) return { error: "That client could not be found." };
  refreshApp();
  return null;
}

export async function deleteClientAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const id = readId(formData.get("id"));
  if (!id) return { error: "That client could not be found." };
  const result = await deleteClient(id);
  if (result === "has-entries") {
    return { error: "Delete this client's time entries before deleting the client." };
  }
  refreshApp();
  return null;
}

export async function createProjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const clientId = readId(formData.get("clientId"));
  if (!clientId) return { error: "That client could not be found." };
  const name = requiredName(formData.get("name"), "Project name");
  if (!name.ok) return { error: name.error };
  const result = await createProject(clientId, name.value);
  if (result === "missing-client") return { error: "That client could not be found." };
  refreshApp();
  return null;
}

export async function updateProjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const id = readId(formData.get("id"));
  if (!id) return { error: "That project could not be found." };
  const name = requiredName(formData.get("name"), "Project name");
  if (!name.ok) return { error: name.error };
  const updated = await updateProject(id, name.value);
  if (!updated) return { error: "That project could not be found." };
  refreshApp();
  return null;
}

export async function deleteProjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const id = readId(formData.get("id"));
  if (!id) return { error: "That project could not be found." };
  const result = await deleteProject(id);
  if (result === "has-entries") {
    return { error: "Delete this project's time entries before deleting the project." };
  }
  refreshApp();
  return null;
}
