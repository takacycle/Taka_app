import { listChallenges, listChallengeZones } from "@/lib/challenges";
import { ChallengeForm } from "./challenge-form";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function ChallengesPage() {
  const [challenges, zones] = await Promise.all([listChallenges(), listChallengeZones()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Community Challenges</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Zone-wide targets consumers see and track progress toward on the home screen.
        </p>
      </div>

      <ChallengeForm zones={zones} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {challenges.map((challenge) => {
          const pct = challenge.targetKg > 0 ? Math.min(100, Math.max(0, (challenge.progressKg / challenge.targetKg) * 100)) : 0;
          return (
            <div key={challenge.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{challenge.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {challenge.zoneName} · {formatDate(challenge.startsAt)} – {formatDate(challenge.endsAt)}
                  </p>
                </div>
                {challenge.isActive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(110,255,158,0.1)] px-2 py-1 text-xs font-medium text-[#3ea35f]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3ea35f]" /> Active
                  </span>
                )}
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-[#3ea35f]" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {challenge.progressKg.toFixed(1)}kg / {challenge.targetKg}kg ({pct.toFixed(0)}%)
                </p>
              </div>
            </div>
          );
        })}

        {challenges.length === 0 && (
          <p className="col-span-full py-10 text-center text-zinc-500 dark:text-zinc-400">
            No challenges yet — create one above.
          </p>
        )}
      </div>
    </div>
  );
}
