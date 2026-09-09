import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = (data?.claims?.email as string | undefined) ?? "unknown";

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-black">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar email={email} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
