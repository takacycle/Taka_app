import Image from "next/image";
import { listCompletedPickups } from "@/lib/pickups";

const GRADE_LABEL: Record<string, string> = {
  clean_pet: "Clean PET",
  mixed_recyclables: "Mixed",
  contaminated: "Contaminated",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PickupsCompletedPage() {
  const pickups = await listCompletedPickups();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Pickups Completed</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {pickups.length} verified pickups — evidence photo, weight, and grade as captured by the agent.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pickups.map((pickup) => (
          <div key={pickup.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
            <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-800">
              {pickup.photoUrl ? (
                <Image
                  src={pickup.photoUrl}
                  alt={`Evidence for pickup ${pickup.id.slice(0, 8)}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">No photo</div>
              )}
              {pickup.isAuditSample && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-500/90 px-2 py-1 text-xs font-medium text-white">
                  Audit sample
                </span>
              )}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs uppercase text-zinc-500">{pickup.id.slice(0, 8)}</span>
                <span className="text-xs text-zinc-500">{formatDate(pickup.completedAt)}</span>
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{pickup.requesterName}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {pickup.addressText} · {pickup.zoneName}
              </p>
              <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-sm dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">
                  {pickup.scaleReadingKg ?? "—"}kg ·{" "}
                  {pickup.materialGrade ? (GRADE_LABEL[pickup.materialGrade] ?? pickup.materialGrade) : "—"}
                </span>
                <span className="font-medium text-[#3ea35f]">
                  {pickup.pointsAwarded !== null ? `+${pickup.pointsAwarded} pts` : "—"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Verified by {pickup.agentName ?? "unknown agent"}
              </p>
            </div>
          </div>
        ))}

        {pickups.length === 0 && (
          <p className="col-span-full py-10 text-center text-zinc-500 dark:text-zinc-400">
            No completed pickups yet.
          </p>
        )}
      </div>
    </div>
  );
}
