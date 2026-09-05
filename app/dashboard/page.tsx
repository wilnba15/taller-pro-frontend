"use client";

import { useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  clearSession,
  getMyWorkshop,
  type WorkshopProfile,
} from "@/lib/api";

type Client = { id: number };
type Vehicle = { id: number };
type WorkOrder = {
  id: number;
  order_number?: number;
  status: string;
  total: string | number;
  entry_date: string;
  created_at?: string;
};
type WorkOrderItem = {
  id: number;
  work_order_id: number;
  subtotal: string | number;
};
type ReminderSummary = {
  vencido: number;
  hoy: number;
  urgente: number;
  proximo: number;
  programado: number;
  enviado: number;
  total: number;
};

const EMPTY_REMINDERS: ReminderSummary = {
  vencido: 0,
  hoy: 0,
  urgente: 0,
  proximo: 0,
  programado: 0,
  enviado: 0,
  total: 0,
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function parseOrderDate(order: WorkOrder) {
  if (order.entry_date) return new Date(`${order.entry_date}T00:00:00`);
  return order.created_at ? new Date(order.created_at) : null;
}

export default function DashboardPage() {
  const now = new Date();
  const [workshop, setWorkshop] = useState<WorkshopProfile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [orderTotals, setOrderTotals] = useState<Record<number, number>>({});
  const [reminders, setReminders] = useState<ReminderSummary>(EMPTY_REMINDERS);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [workshopData, clientsData, vehiclesData, workOrdersData, reminderData] =
          await Promise.all([
            getMyWorkshop(),
            apiFetch<Client[]>("/clients/"),
            apiFetch<Vehicle[]>("/vehicles/"),
            apiFetch<WorkOrder[]>("/work-orders/"),
            apiFetch<ReminderSummary>("/reminders/summary"),
          ]);

        const totalsEntries = await Promise.all(
          workOrdersData.map(async (order) => {
            try {
              const items = await apiFetch<WorkOrderItem[]>(
                `/work-order-items/work-order/${order.id}`,
              );
              const total = items.reduce(
                (sum, item) => sum + Number(item.subtotal || 0),
                0,
              );
              return [order.id, total] as const;
            } catch {
              return [order.id, Number(order.total || 0)] as const;
            }
          }),
        );

        setWorkshop(workshopData);
        setClients(clientsData);
        setVehicles(vehiclesData);
        setWorkOrders(workOrdersData);
        setOrderTotals(Object.fromEntries(totalsEntries));
        setReminders(reminderData);
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
  const pendingOrders = workOrders.filter(
    (order) => order.status?.toLowerCase() === "pendiente",
  ).length;
  const attentionReminders = reminders.vencido + reminders.hoy + reminders.urgente;

  const recentOrders = useMemo(
    () =>
      [...workOrders]
        .sort((a, b) => {
          const dateA = parseOrderDate(a)?.getTime() || 0;
          const dateB = parseOrderDate(b)?.getTime() || 0;
          return dateB - dateA;
        })
        .slice(0, 3),
    [workOrders],
  );

  const annualRevenue = useMemo(
    () =>
      workOrders.reduce((sum, order) => {
        const date = parseOrderDate(order);
        if (!date || date.getFullYear() !== selectedYear) return sum;
        return sum + (orderTotals[order.id] ?? Number(order.total || 0));
      }, 0),
    [workOrders, orderTotals, selectedYear],
  );

  const monthlyRevenue = useMemo(
    () =>
      workOrders.reduce((sum, order) => {
        const date = parseOrderDate(order);
        if (
          !date ||
          date.getFullYear() !== selectedYear ||
          date.getMonth() !== selectedMonth
        ) {
          return sum;
        }
        return sum + (orderTotals[order.id] ?? Number(order.total || 0));
      }, 0),
    [workOrders, orderTotals, selectedMonth, selectedYear],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">Cargando dashboard...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          <h1 className="mb-2 text-2xl font-bold">No se pudo cargar SIADAUTO</h1>
          <p>{error}</p>
          <button
            onClick={handleLogout}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 font-semibold hover:bg-red-500"
          >
            Volver al login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
              {workshop?.logo_url ? (
                <img
                  src={workshop.logo_url}
                  alt={`Logo de ${workshop.name}`}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-3xl font-bold text-blue-400">
                  {(workshop?.name || "S").charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold md:text-4xl">
                {(workshop?.name || "TALLER").toUpperCase()}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {[workshop?.phone, workshop?.email].filter(Boolean).join(" · ") ||
                  "Gestión automotriz"}
              </p>
              {workshop?.address ? (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {workshop.address}
                </p>
              ) : null}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="self-start rounded-xl bg-red-600 px-5 py-2.5 font-semibold transition hover:bg-red-500 sm:self-auto"
          >
            Salir
          </button>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon="👥" label="Total clientes" value={totalClients} />
          <SummaryCard icon="🚗" label="Total vehículos" value={totalVehicles} />
          <SummaryCard icon="📋" label="Órdenes de trabajo" value={totalWorkOrders} />
          <SummaryCard icon="⏳" label="Órdenes pendientes" value={pendingOrders} />

          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-amber-200">
                  Mantenimientos por atender
                </p>
                <p className="mt-2 text-3xl font-bold">{attentionReminders}</p>
              </div>
              <span className="text-2xl">🔔</span>
            </div>
            <p className="mt-3 text-xs text-slate-300">
              {reminders.vencido} vencidos · {reminders.hoy} para hoy · {reminders.urgente} urgentes
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr,0.8fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">📋 Órdenes recientes</h2>
              <p className="mt-1 text-sm text-slate-400">
                Últimos {recentOrders.length} registros
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-800 text-slate-300">
                  <tr>
                    <th className="py-3 pr-4 text-left">OT</th>
                    <th className="py-3 pr-4 text-left">Estado</th>
                    <th className="py-3 pr-4 text-left">Total real</th>
                    <th className="py-3 pr-4 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-5 text-slate-400">
                        No hay órdenes recientes.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => {
                      const date = parseOrderDate(order);
                      return (
                        <tr key={order.id} className="border-b border-slate-800/70">
                          <td className="py-3 pr-4 font-semibold">#{order.order_number ?? order.id}</td>
                          <td className="py-3 pr-4 capitalize">
                            {order.status.replace("_", " ")}
                          </td>
                          <td className="py-3 pr-4 font-semibold">
                            {formatMoney(orderTotals[order.id] ?? Number(order.total || 0))}
                          </td>
                          <td className="py-3 pr-4">
                            {date ? date.toLocaleDateString("es-EC") : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-xl font-semibold">💰 Facturación</h2>
            <p className="mt-1 text-sm text-slate-400">
              Totales calculados desde los ítems de las órdenes.
            </p>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Facturación anual {selectedYear}</p>
              <p className="mt-2 text-3xl font-bold">{formatMoney(annualRevenue)}</p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">Facturación mensual</p>
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(Number(event.target.value))}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mt-3 text-3xl font-bold">{formatMoney(monthlyRevenue)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {MONTHS[selectedMonth]} {selectedYear}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type SummaryCardProps = {
  icon: string;
  label: string;
  value: number;
};

function SummaryCard({ icon, label, value }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}
