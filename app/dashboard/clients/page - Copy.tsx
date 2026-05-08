"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Client = { id: number; workshop_id: number; full_name: string; identification: string; phone: string; email?: string | null; address?: string | null; notes?: string | null; created_at?: string };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { apiFetch<Client[]>("/clients/").then(setClients).catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los clientes")).finally(() => setLoading(false)); }, []);

  if (loading) return <main className="min-h-screen bg-slate-950 text-white p-6"><div className="max-w-7xl mx-auto">Cargando clientes...</div></main>;
  if (error) return <main className="min-h-screen bg-slate-950 text-white p-6"><div className="max-w-7xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{error}</div></main>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold">Clientes</h1><p className="text-slate-400 mt-1">Listado de clientes del taller autenticado.</p></div>
          <Link href="/dashboard/clients/new" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition">+ Nuevo cliente</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/70 text-slate-200"><tr><th className="text-left px-4 py-3">Nombre</th><th className="text-left px-4 py-3">Identificación</th><th className="text-left px-4 py-3">Teléfono</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Dirección</th></tr></thead>
            <tbody>
              {clients.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No hay clientes registrados.</td></tr> : clients.map((client) => (
                <tr key={client.id} className="border-t border-slate-800"><td className="px-4 py-3">{client.full_name}</td><td className="px-4 py-3">{client.identification}</td><td className="px-4 py-3">{client.phone}</td><td className="px-4 py-3">{client.email || "-"}</td><td className="px-4 py-3">{client.address || "-"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
