"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, Sprout, Tractor } from "lucide-react";

const links = [
  { href: "/", label: "Recommendations" },
  { href: "/market", label: "Market" },
];

function getLinkClasses(active: boolean) {
  return active
    ? "rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
    : "rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800";
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-white/60 bg-[#fffaf0]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/20">
            <Tractor className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700/80">
              Smart Farmer AI
            </p>
            <p className="text-sm text-slate-600">Crop planning and market intelligence</p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={getLinkClasses(active)}>
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 lg:inline-flex">
          {pathname === "/" ? (
            <Sprout className="h-4 w-4 text-emerald-700" />
          ) : (
            <LineChart className="h-4 w-4 text-amber-700" />
          )}
          Focused on recommendations and market prices
        </div>
      </div>
    </nav>
  );
}
