"use client";

import { useState, useTransition } from "react";
import { createRewardAction } from "@/app/rewards/actions";

// Only these keys actually render anything in the consumer app (see
// apps/consumer/components/reward-image.tsx's REWARD_IMAGES map) — anything else
// silently shows a blank placeholder there. Adding a new key needs a matching
// change in that file too.
const IMAGE_KEYS = [
  { value: "mtn", label: "MTN" },
  { value: "shoprite", label: "Shoprite" },
  { value: "tote-bag", label: "Tote bag" },
  { value: "tshirt", label: "T-shirt" },
];

export function RewardForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState("");
  const [category, setCategory] = useState("");
  const [imageKey, setImageKey] = useState(IMAGE_KEYS[0].value);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && description.trim() && Number(pointsCost) > 0;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await createRewardAction({
          name: name.trim(),
          description: description.trim(),
          pointsCost: Number(pointsCost),
          category: category.trim() || null,
          imageKey: imageKey || null,
        });
        setName("");
        setDescription("");
        setPointsCost("");
        setCategory("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create reward");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">New reward</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-black"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        />
        <input
          type="number"
          min="1"
          value={pointsCost}
          onChange={(e) => setPointsCost(e.target.value)}
          placeholder="Points cost"
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        />
        <select
          value={imageKey}
          onChange={(e) => setImageKey(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        >
          {IMAGE_KEYS.map((key) => (
            <option key={key.value} value={key.value}>
              {key.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="mt-3 w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={isPending || !canSubmit}
          className="rounded-full bg-[#3ea35f] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "…" : "Create reward"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
