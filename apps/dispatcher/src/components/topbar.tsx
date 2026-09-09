import { SignOutButton } from "@/components/sign-out-button";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-100 bg-white px-6 dark:border-zinc-800 dark:bg-black">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#1f4520] dark:text-[#6eff9e]">
        Dispatcher Console
      </span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{email}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
