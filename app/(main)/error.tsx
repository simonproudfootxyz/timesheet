"use client";

import { buttonClass } from "@/lib/styles";

function safeMessage(error: Error) {
  if (error.message === "DATABASE_URL is not set.") return error.message;
  if (/postgres:\/\/|password authentication|ECONNREFUSED/i.test(error.message)) {
    return "The database could not be reached. Check DATABASE_URL and that migrations have been applied.";
  }
  return error.message.slice(0, 300);
}

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-6">
      <h1 className="text-lg font-semibold">This page could not be loaded</h1>
      <p className="mt-2 text-sm text-muted">{safeMessage(error)}</p>
      <button type="button" className={`${buttonClass} mt-4`} onClick={reset}>
        Try again
      </button>
    </div>
  );
}
