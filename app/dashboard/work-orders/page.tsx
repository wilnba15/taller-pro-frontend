"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type WorkOrder = { id: number; workshop_id: number; client_id: number; vehicle_id: number; entry_date: string; estimated_delivery_date?: string | null; status: "pendiente" | "en_proceso" | "finalizado" | "entregado"; issue_description: string; diagnosis?: string | null; work_performed?: string | null; notes?: string | null; labor_cost: number | string; parts_cost: number | string; total: number | string; created_at?: string; updated_at?: string };
type Client = { id: number; full_name: string; phone: string };
type Vehicle = { id: number; client_id: number; plate: string; brand: string; model: string };
type Stats = { activeCount: number; completedCount: number; deliveredCount: number; pendingCount: number; monthlyRevenue: number };

function statusLabel(status: WorkOrder["status"]) {
  return { pendiente: "Pendiente", en_proceso: "En proceso", finalizado: "Finalizado", entregado: "Entregado" }[status] || status;
}
function statusClasses(status: WorkOrder["status"]) {
  return {
    pendiente: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    en_proceso: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    finalizado: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    entregado: "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30",
  }[status] || "bg-slate-500/15 text-slate-300 border border-slate-500/30";
}
function formatMoney(value: number | string) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value || 0));
}
function buildStats(workOrders: WorkOrder[]): Stats {
  const now = new Date();
  return workOrders.reduce<Stats>((acc, item) => {
    const createdAt = item.created_at ? new Date(item.created_at) : null;
    if (item.status === "pendiente") acc.pendingCount += 1;
    if (item.status === "en_proceso") acc.activeCount += 1;
    if (item.status === "finalizado") acc.completedCount += 1;
    if (item.status === "entregado") acc.deliveredCount += 1;
    if (createdAt && createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()) acc.monthlyRevenue += Number(item.total || 0);
    return acc;
  }, { activeCount: 0, completedCount: 0, deliveredCount: 0, pendingCount: 0, monthlyRevenue: 0 });
}
function buildBars(stats: Stats) {
  const values = [{ label: "Pendientes", value: stats.pendingCount }, { label: "En proceso", value: stats.activeCount }, { label: "Finalizadas", value: stats.completedCount }, { label: "Entregadas", value: stats.deliveredCount }];
  const maxValue = Math.max(...values.map((item) => item.value), 1);
  return values.map((item) => ({ ...item, width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 16 : 6)}%` }));
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiFetch<WorkOrder[]>("/work-orders/"), apiFetch<Client[]>("/clients/"), apiFetch<Vehicle[]>("/vehicles/")])
      .then(([wo, c, v]) => { setWorkOrders(wo); setClients(c); setVehicles(v); })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las órdenes"))
      .finally(() => setLoading(false));
  }, []);

  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const stats = buildStats(workOrders);
  const bars = buildBars(stats);

  if (loading) return <main className="min-h-screen bg-slate-950 text-white p-6"><div className="max-w-7xl mx-auto">Cargando órdenes...</div></main>;
  if (error) return <main className="min-h-screen bg-slate-950 text-white p-6"><div className="max-w-7xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{error}</div></main>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold">Órdenes de trabajo</h1><p className="text-slate-400 mt-1">Control operativo del taller con resumen de estados e ingresos del mes.</p></div>
          <Link href="/dashboard/work-orders/new" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition">+ Nueva orden</Link>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 mb-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">Pendientes</p><p className="mt-2 text-3xl font-bold">{stats.pendingCount}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">En proceso</p><p className="mt-2 text-3xl font-bold">{stats.activeCount}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">Finalizadas</p><p className="mt-2 text-3xl font-bold">{stats.completedCount}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">Entregadas</p><p className="mt-2 text-3xl font-bold">{stats.deliveredCount}</p></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">Ingresos del mes</p><p className="mt-2 text-3xl font-bold">{formatMoney(stats.monthlyRevenue)}</p></div>
        </section>
        <section className="grid gap-6 xl:grid-cols-[1.1fr,1.9fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold">Gráfico operativo</h2><p className="text-slate-400 text-sm mt-1">Vista rápida del volumen actual por estado.</p><div className="mt-6 space-y-4">{bars.map((bar) => <div key={bar.label}><div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-300">{bar.label}</span><span className="font-medium">{bar.value}</span></div><div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: bar.width }} /></div></div>)}</div></div>
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/70 text-slate-200"><tr><th className="text-left px-4 py-3">ID</th><th className="text-left px-4 py-3">Cliente</th><th className="text-left px-4 py-3">Vehículo</th><th className="text-left px-4 py-3">Ingreso</th><th className="text-left px-4 py-3">Entrega</th><th className="text-left px-4 py-3">Estado</th><th className="text-left px-4 py-3">Problema</th><th className="text-left px-4 py-3">Total</th><th className="text-left px-4 py-3">Acciones</th></tr></thead>
              <tbody>{workOrders.length === 0 ? <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-400">No hay órdenes registradas.</td></tr> : workOrders.map((order) => {
                const client = clientMap.get(order.client_id);
                const vehicle = vehicleMap.get(order.vehicle_id);
                return <tr key={order.id} className="border-t border-slate-800 align-top"><td className="px-4 py-3">{order.id}</td><td className="px-4 py-3"><div className="font-medium">{client?.full_name || `Cliente #${order.client_id}`}</div><div className="text-slate-400 text-xs">{client?.phone || "-"}</div></td><td className="px-4 py-3">{vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : `Vehículo #${order.vehicle_id}`}</td><td className="px-4 py-3">{order.entry_date}</td><td className="px-4 py-3">{order.estimated_delivery_date || "-"}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClasses(order.status)}`}>{statusLabel(order.status)}</span></td><td className="px-4 py-3 max-w-[280px]"><div className="line-clamp-2">{order.issue_description}</div></td><td className="px-4 py-3 font-semibold">{formatMoney(order.total)}</td><td className="px-4 py-3"><Link href={`/dashboard/work-orders/${order.id}/edit`} className="rounded-lg bg-blue-600 px-3 py-2 text-center hover:bg-blue-500 transition">Editar orden</Link></td></tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
