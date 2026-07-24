"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRole } from "@/lib/api";

const menuItems = [
  { href: "/dashboard", label: "🏠 Dashboard" },
  { href: "/dashboard/clients", label: "👥 Clientes" },
  { href: "/dashboard/vehicles", label: "🚗 Vehículos" },
  { href: "/dashboard/work-orders", label: "📋 Órdenes" },
  { href: "/dashboard/reminders", label: "🔔 Recordatorios" },
  { href: "/dashboard/ai-diagnostic", label: "🤖 Analizar con IA" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    setIsSuperadmin(getRole() === "superadmin");
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white md:flex">
      <aside className="border-b border-slate-800 bg-slate-900 p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">SIADAUTO</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Sistema para la Administración de Talleres Automotrices
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-2 text-sm md:flex md:flex-col md:gap-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2.5 text-slate-200 transition hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}

          <div className="col-span-2 my-2 hidden border-t border-slate-800 md:block" />

          <Link
            href="/dashboard/workshop-profile"
            className="col-span-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 font-semibold text-blue-200 transition hover:bg-blue-500/20"
          >
            🏢 Perfil del Taller
          </Link>

          {isSuperadmin && (
            <Link
              href="/dashboard/admin"
              className="col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 font-semibold text-amber-200 transition hover:bg-amber-500/20"
            >
              ⚙️ Administración SIADAUTO
            </Link>
          )}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
