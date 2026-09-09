"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "@/assets/logo.png";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/pickups", label: "Pickup Queue" },
  { href: "/pickups/completed", label: "Pickups Completed" },
  { href: "/map", label: "Live Map" },
  { href: "/agents", label: "Agents" },
  { href: "/users", label: "Users" },
  { href: "/rewards", label: "Rewards" },
  { href: "/challenges", label: "Challenges" },
  { href: "/audits", label: "Quality Audits" },
  { href: "/fraud", label: "Fraud" },
  { href: "/support", label: "Support tickets" },
];

// Only these routes exist so far — the rest render as disabled placeholders
// instead of dead links, matching the full nav from the design.
const BUILT_ROUTES = new Set(["/", "/pickups", "/pickups/completed", "/map", "/audits", "/fraud"]);

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-60 shrink-0 border-r border-zinc-100 bg-white px-4 py-8 dark:border-zinc-800 dark:bg-black">
      <Image src={logo} alt="Takacycle" className="mb-10 h-10 w-auto object-contain" priority />
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isBuilt = BUILT_ROUTES.has(item.href);
          const isActive = pathname === item.href;

          if (!isBuilt) {
            return (
              <li key={item.href}>
                <span className="block cursor-not-allowed rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 dark:text-zinc-700">
                  {item.label}
                </span>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? "bg-[rgba(110,255,158,0.1)] text-[#3ea35f]"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
