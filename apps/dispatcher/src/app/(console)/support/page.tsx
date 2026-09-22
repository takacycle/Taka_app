import { listOpenSupportTickets } from "@/lib/support-tickets";
import { SupportActions } from "./support-actions";

const CATEGORY_LABEL: Record<string, string> = {
  pickup_issue: "Pickup issue",
  points_rewards: "Points or rewards",
  account: "Account",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function SupportPage() {
  const tickets = await listOpenSupportTickets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Support Tickets</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{tickets.length} open tickets awaiting a response.</p>
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex items-start justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[rgba(62,163,95,0.1)] px-2 py-0.5 text-xs font-medium text-[#3ea35f]">
                  {CATEGORY_LABEL[ticket.category] ?? ticket.category}
                </span>
                <span className="text-xs text-zinc-400">{formatDate(ticket.createdAt)}</span>
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {ticket.filedByName} <span className="text-zinc-400">({ticket.filedByType})</span>
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{ticket.description}</p>
              {ticket.pickupId && (
                <p className="text-xs text-zinc-400">Pickup: {ticket.pickupId.slice(0, 8).toUpperCase()}</p>
              )}
            </div>
            <div className="w-64 shrink-0">
              <SupportActions ticketId={ticket.id} />
            </div>
          </div>
        ))}

        {tickets.length === 0 && (
          <p className="py-10 text-center text-zinc-500 dark:text-zinc-400">No open support tickets right now.</p>
        )}
      </div>
    </div>
  );
}
