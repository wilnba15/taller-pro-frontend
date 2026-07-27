"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getMyWorkshop,
  getRole,
  type WorkshopProfile,
} from "@/lib/api";

const menuItems = [
  { href: "/dashboard", label: "🏠 Dashboard" },
  { href: "/dashboard/clients", label: "👥 Clientes" },
  { href: "/dashboard/vehicles", label: "🚗 Vehículos" },
  { href: "/dashboard/work-orders", label: "📋 Órdenes" },
  { href: "/dashboard/reminders", label: "🔔 Recordatorios" },
  { href: "/dashboard/ai-diagnostic", label: "🤖 Analizar con IA" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [workshop, setWorkshop] = useState<WorkshopProfile | null>(null);

  useEffect(() => {
    setIsSuperadmin(getRole() === "superadmin");

    async function loadWorkshop() {
      try {
        const data = await getMyWorkshop();
        setWorkshop(data);
      } catch {
        // apiFetch controla una sesión vencida.
        // El layout mantiene un respaldo visual mientras redirige.
      }
    }

    loadWorkshop();
  }, []);

  const contactLine = [
    workshop?.phone,
    workshop?.email,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-slate-950 text-white md:flex">
      <aside className="border-b border-slate-800 bg-slate-900 p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:p-6">
        <div className="mb-6 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              {workshop?.logo_url ? (
                <img
                  src={workshop.logo_url}
                  alt={`Logo de ${workshop.name}`}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="text-xl font-bold text-blue-400">
                  {(workshop?.name || "S").charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-tight">
                {workshop?.name || "SIADAUTO"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Gestión automotriz
              </p>
            </div>
          </div>

          {contactLine ? (
            <p className="mt-3 truncate text-xs text-slate-500" title={contactLine}>
              {contactLine}
            </p>
          ) : null}
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

          <Link
            href="/dashboard/change-password"
            className="col-span-2 rounded-xl border border-slate-700 px-3 py-2.5 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            🔐 Cambiar contraseña
          </Link>

          {isSuperadmin && (
            <Link
              href="/dashboard/admin"
              className="col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 font-semibold text-amber-200 transition hover:bg-amber-500/20"
            >
              ⚙️ Administración
            </Link>
          )}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
