"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Live Map", href: "/live-map" },
  { label: "SOS Alerts", href: "/sos-alerts" },
  { label: "CCTV Alerts", href: "/cctv-alerts" },
  { label: "Disaster Alerts", href: "/disaster-alerts" },
  { label: "Response Panel", href: "/response-panel" }
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:w-64 lg:self-start">
      <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</p>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}