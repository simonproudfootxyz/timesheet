import { requireSession } from "@/app/actions/auth";
import { Nav } from "@/components/nav";
import { TimerBar } from "@/components/timer-bar";
import { loadTimerState } from "@/lib/data";
import { toOpenTimer } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  const timer = await loadTimerState();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="sticky top-0 z-30">
        <Nav />
        <TimerBar open={toOpenTimer(timer.open)} alert={timer.alert} />
      </div>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
