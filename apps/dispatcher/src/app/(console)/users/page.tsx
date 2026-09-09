import { listConsumers } from "@/lib/users";

const TIER_LABEL: Record<string, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

export default async function UsersPage() {
  const users = await listConsumers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Users</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Consumer accounts and their recycling activity.</p>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.fullName}</p>
                {user.deletedAt && (
                  <span className="inline-flex items-center rounded-full bg-[rgba(255,53,53,0.1)] px-2 py-0.5 text-xs font-medium text-[#ff3535]">
                    Deleted
                  </span>
                )}
                {user.badgeTier && (
                  <span className="inline-flex items-center rounded-full bg-[rgba(62,163,95,0.1)] px-2 py-0.5 text-xs font-medium text-[#3ea35f]">
                    {TIER_LABEL[user.badgeTier]}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {user.phone || "No phone on file"} · {user.zoneName ?? "No zone"}
              </p>
            </div>

            <div className="text-right text-sm">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{user.kgRecycled.toFixed(1)}kg</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {user.pointsEarned.toFixed(0)} pts · {user.pickupCount} pickups
              </p>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <p className="py-10 text-center text-zinc-500 dark:text-zinc-400">No users yet.</p>
        )}
      </div>
    </div>
  );
}
