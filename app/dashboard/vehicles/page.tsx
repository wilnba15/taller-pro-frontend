"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Vehicle = { id: number; workshop_id: number; client_id: number; plate: string; brand: string; model: string; year: number; color?: string | null; mileage?: number | null; fuel_type?: string | null; transmission?: string | null; notes?: string | null; created_at?: string };
type Client = { id: number; full_name: string; identification: string; phone: string };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiFetch<Vehicle[]>("/vehicles/"), apiFetch<Client[]>("/clients/")])
      .then(([v, c]) => { setVehicles(v); setClients(c); })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los vehículos"))
      .finally(() => setLoading(false));
  }, []);

  const clientsMap = new Map<number, Client>(clients.map((client) => [client.id, client]));

  if (loading) return <main className="min-h-screen bg-slate-950 text-white p-6"><div className="max-w-7xl mx-auto">Cargando vehículos...</div></main>;
  if (error) return <main className="min-h-screen bg-slate-950 text-white p-6"><div className="max-w-7xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{error}</div></main>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold">Vehículos</h1><p className="text-slate-400 mt-1">Listado de vehículos del taller autenticado.</p></div>
          <Link href="/dashboard/vehicles/new" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition">+ Nuevo vehículo</Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/70 text-slate-200"><tr><th className="text-left px-4 py-3">Cliente</th><th className="text-left px-4 py-3">Placa</th><th className="text-left px-4 py-3">Marca</th><th className="text-left px-4 py-3">Modelo</th><th className="text-left px-4 py-3">Año</th><th className="text-left px-4 py-3">Color</th><th className="text-left px-4 py-3">KM</th><th className="text-left px-4 py-3">Combustible</th><th className="text-left px-4 py-3">Transmisión</th><th className="text-left px-4 py-3">Acciones</th></tr></thead>
            <tbody>
              {vehicles.length === 0 ? <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-400">No hay vehículos registrados.</td></tr> : vehicles.map((vehicle) => {
                const client = clientsMap.get(vehicle.client_id);
                return <tr key={vehicle.id} className="border-t border-slate-800"><td className="px-4 py-3">{client ? `${client.full_name} (${client.phone})` : `ID ${vehicle.client_id}`}</td><td className="px-4 py-3">{vehicle.plate}</td><td className="px-4 py-3">{vehicle.brand}</td><td className="px-4 py-3">{vehicle.model}</td><td className="px-4 py-3">{vehicle.year}</td><td className="px-4 py-3">{vehicle.color || "-"}</td><td className="px-4 py-3">{vehicle.mileage ?? "-"}</td><td className="px-4 py-3">{vehicle.fuel_type || "-"}</td><td className="px-4 py-3">{vehicle.transmission || "-"}</td><td className="px-4 py-3"><Link href={`/dashboard/vehicles/${vehicle.id}`} className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium hover:bg-blue-500 transition">Ver / Editar</Link></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
