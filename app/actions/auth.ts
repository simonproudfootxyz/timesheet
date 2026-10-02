"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureSettings, updateTimezone } from "@/lib/data";
import { refreshApp } from "@/lib/revalidate";
import {
  createSessionToken,
  passwordsMatch,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";
import { isValidTimeZone } from "@/lib/time";
import type { ActionState } from "@/lib/types";

export async function hasSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireSession() {
  if (!(await hasSession())) redirect("/login");
}

export async function login(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!process.env.APP_PASSWORD || !process.env.AUTH_SECRET) {
    return { error: "The server is missing APP_PASSWORD or AUTH_SECRET." };
  }

  const password = String(formData.get("password") ?? "");
  if (!passwordsMatch(password)) {
    return { error: "Wrong password." };
  }

  const timezone = String(formData.get("timezone") ?? "UTC");
  try {
    await ensureSettings(isValidTimeZone(timezone) ? timezone : "UTC");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    console.error(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://***"));
    if (/relation .* does not exist/i.test(message)) {
      return {
        error: "The database is connected, but the tables are missing. Run npm run db:migrate.",
      };
    }
    return {
      error: "The password was right, but the database could not be reached.",
    };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function saveTimezone(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession();
  const result = await updateTimezone(String(formData.get("timezone") ?? "").trim());
  if (!result.ok) return { error: result.error };
  refreshApp();
  return null;
}
