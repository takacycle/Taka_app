import { listRewards } from "@/lib/rewards";
import { RewardForm } from "./reward-form";
import { RewardStatusButton } from "./reward-status-button";

export default async function RewardsPage() {
  const rewards = await listRewards();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Rewards</h1>
        <p className="text-zinc-600 dark:text-zinc-400">The catalog consumers redeem Taka Points against.</p>
      </div>

      <RewardForm />

      <div className="space-y-3">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{reward.name}</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    reward.isActive
                      ? "bg-[rgba(62,163,95,0.1)] text-[#3ea35f]"
                      : "bg-[rgba(255,53,53,0.1)] text-[#ff3535]"
                  }`}
                >
                  {reward.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{reward.description}</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {reward.category ?? "No category"} · image: {reward.imageKey ?? "none"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{reward.pointsCost} pts</p>
              <RewardStatusButton rewardId={reward.id} isActive={reward.isActive} />
            </div>
          </div>
        ))}

        {rewards.length === 0 && (
          <p className="py-10 text-center text-zinc-500 dark:text-zinc-400">No rewards yet — create one above.</p>
        )}
      </div>
    </div>
  );
}
