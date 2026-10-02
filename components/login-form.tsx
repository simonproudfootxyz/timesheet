"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { buttonClass, inputClass, labelClass } from "@/lib/styles";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form
      action={action}
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        const field = event.currentTarget.elements.namedItem("timezone");
        if (field instanceof HTMLInputElement) {
          field.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        }
      }}
    >
      <input type="hidden" name="timezone" defaultValue="UTC" />
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={`${buttonClass} w-full`} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
