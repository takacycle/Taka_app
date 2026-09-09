import Link from "next/link";
import { listQueuePickups } from "@/lib/pickups";

export default async function OverviewPage() {
  const queue = await listQueuePickups();
  const pending = queue.filter((p) => p.status === "requested");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Overview</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Here&apos;s how Takacycle is moving today.</p>
      </div>

      <Link
        href="/pickups"
        className="block max-w-xs rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
      >
        <p className="text-4xl font-semibold uppercase text-black dark:text-zinc-50">{pending.length}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Pending requests — go to Pickup Queue</p>
      </Link>
    </div>
  );
}
