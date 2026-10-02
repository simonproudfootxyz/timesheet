import { redirect } from "next/navigation";
import { hasSession } from "@/app/actions/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  if (await hasSession()) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-accent">Timesheet</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          This timesheet is private. Use the password from your server settings.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
