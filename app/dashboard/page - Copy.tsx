"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, clearSession, getUserName, getWorkshopId } from "@/lib/api";

type Client = { id: number };
type Vehicle = { id: number };
type WorkOrder = { id: number; status: string; total: string | number; created_at?: string };

function formatMoney(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(num || 0);
}

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [workshopId, setWorkshopId] = useState("");

  useEffect(() => {
    setUserName(getUserName());
    setWorkshopId(getWorkshopId());

    async function loadData() {
      try {
        const [clientsData, vehiclesData, workOrdersData] = await Promise.all([
          apiFetch<Client[]>("/clients/"),
          apiFetch<Vehicle[]>("/vehicles/"),
          apiFetch<WorkOrder[]>("/work-orders/"),
        ]);
        setClients(clientsData);
        setVehicles(vehiclesData);
        setWorkOrders(workOrdersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function handleLogout() {
    clearSession();
    window.location.href = "/login";
  }

  const totalClients = clients.length;
  const totalVehicles = vehicles.length;
  const totalWorkOrders = workOrders.length;
  const pendingOrders = workOrders.filter((order) => order.status?.toLowerCase() === "pendiente").length;
  const totalSales = workOrders.reduce((acc, order) => acc + Number(order.total || 0), 0);
  const recentOrders = [...workOrders].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  }).slice(0, 5);

  if (loading) return <main className="min-h-screen bg-slate-950 text-white p-6"><div className="max-w-7xl mx-auto">Cargando dashboard...</div></main>;

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-3xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          <h1 className="text-2xl font-bold mb-2">No se pudo cargar SIADAUTO</h1>
          <p>{error}</p>
          <button onClick={handleLogout} className="mt-4 rounded-xl bg-red-600 px-4 py-2 font-semibold hover:bg-red-500">Volver al login</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Dashboard SIADAUTO</h1>
            <p className="text-slate-400 mt-2">Bienvenido {userName || "usuario"} · Taller ID {workshopId || "-"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/clients" className="rounded-xl bg-slate-800 px-4 py-2 hover:bg-slate-700">Clientes</Link>
            <Link href="/dashboard/vehicles" className="rounded-xl bg-slate-800 px-4 py-2 hover:bg-slate-700">Vehículos</Link>
            <Link href="/dashboard/work-orders" className="rounded-xl bg-slate-800 px-4 py-2 hover:bg-slate-700">Órdenes</Link>
            <button onClick={handleLogout} className="rounded-xl bg-red-600 px-4 py-2 hover:bg-red-500">Salir</button>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"><p className="text-sm text-slate-400">Total clientes</p><h2 className="text-3xl font-bold mt-2">{totalClients}</h2></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"><p className="text-sm text-slate-400">Total vehículos</p><h2 className="text-3xl font-bold mt-2">{totalVehicles}</h2></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"><p className="text-sm text-slate-400">Órdenes de trabajo</p><h2 className="text-3xl font-bold mt-2">{totalWorkOrders}</h2></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"><p className="text-sm text-slate-400">Órdenes pendientes</p><h2 className="text-3xl font-bold mt-2">{pendingOrders}</h2></div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
          <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-semibold">Órdenes recientes</h3><span className="text-sm text-slate-400">Últimos {recentOrders.length} registros</span></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-300 border-b border-slate-800"><tr><th className="text-left py-3 pr-4">ID</th><th className="text-left py-3 pr-4">Estado</th><th className="text-left py-3 pr-4">Total</th><th className="text-left py-3 pr-4">Fecha</th></tr></thead>
                <tbody>
                  {recentOrders.length === 0 ? <tr><td colSpan={4} className="py-4 text-slate-400">No hay órdenes recientes.</td></tr> : recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-800/70"><td className="py-3 pr-4">{order.id}</td><td className="py-3 pr-4 capitalize">{order.status}</td><td className="py-3 pr-4 font-medium">{formatMoney(order.total)}</td><td className="py-3 pr-4">{order.created_at ? new Date(order.created_at).toLocaleDateString("es-EC") : "-"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"><h3 className="text-xl font-semibold mb-4">Facturación estimada</h3><p className="text-sm text-slate-400 mb-2">Suma de totales registrados en órdenes.</p><div className="text-4xl font-bold mb-6">{formatMoney(totalSales)}</div></div>
        </section>
      </div>
    </main>
  );
}
