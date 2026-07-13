"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type ReminderStatus = "vencido" | "hoy" | "urgente" | "proximo" | "programado" | "enviado";
type ReminderSummary = { vencido: number; hoy: number; urgente: number; proximo: number; programado: number; enviado: number; total: number };
type Reminder = {
  item_id: number; work_order_id: number; work_order_number: number; client_id: number;
  client_name?: string | null; client_phone?: string | null; vehicle_id: number;
  vehicle?: string | null; plate?: string | null; year?: number | null;
  service_description: string; last_service_date?: string | null; next_service_date: string;
  days_remaining: number; status: ReminderStatus; reminder_enabled: boolean; reminder_sent: boolean;
  whatsapp_message: string; whatsapp_url?: string | null;
};
type RemindersResponse = { generated_at: string; summary: ReminderSummary; reminders: Reminder[] };

const STATUS_ORDER: ReminderStatus[] = ["vencido", "hoy", "urgente", "proximo", "programado", "enviado"];
const STATUS_LABEL: Record<ReminderStatus, string> = { vencido: "Vencido", hoy: "Para hoy", urgente: "Urgente", proximo: "Próximo", programado: "Programado", enviado: "Enviado" };
const STATUS_STYLE: Record<ReminderStatus, string> = {
  vencido: "border-red-500/40 bg-red-500/10 text-red-200",
  hoy: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  urgente: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  proximo: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  programado: "border-slate-600 bg-slate-800 text-slate-200",
  enviado: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" });
}
function daysText(days: number) {
  if (days < 0) return `Venció hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
  if (days === 0) return "Corresponde hoy";
  return `Faltan ${days} ${days === 1 ? "día" : "días"}`;
}
function normalizeEcuadorPhone(value?: string | null) {
  let phone = String(value || "").replace(/\D/g, "");
  if (!phone) return "";
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("09") && phone.length === 10) return `593${phone.slice(1)}`;
  if (phone.startsWith("9") && phone.length === 9) return `593${phone}`;
  return phone;
}
function buildWhatsappUrl(reminder: Reminder) {
  const phone = normalizeEcuadorPhone(reminder.client_phone);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(reminder.whatsapp_message)}`;
}

export default function RemindersPage() {
  const [data, setData] = useState<RemindersResponse | null>(null);
  const [filter, setFilter] = useState<"todos" | ReminderStatus>("todos");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReminders = useCallback(async () => {
    try {
      setLoading(true); setError("");
      setData(await apiFetch<RemindersResponse>("/reminders/?include_programmed=true"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los recordatorios.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadReminders(); }, [loadReminders]);

  const filteredReminders = useMemo(() => {
    const reminders = data?.reminders || [];
    return filter === "todos" ? reminders : reminders.filter((reminder) => reminder.status === filter);
  }, [data, filter]);

  async function handleSend(reminder: Reminder) {
    setError(""); setNotice("");
    const whatsappUrl = buildWhatsappUrl(reminder);
    if (!whatsappUrl) { setError(`El cliente ${reminder.client_name || ""} no tiene un teléfono válido.`); return; }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    try {
      setActionId(reminder.item_id);
      await apiFetch(`/reminders/${reminder.item_id}/mark-sent`, { method: "POST" });
      setNotice(`Recordatorio de ${reminder.service_description} marcado como enviado.`);
      await loadReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "WhatsApp se abrió, pero no se pudo registrar el envío.");
    } finally { setActionId(null); }
  }

  async function handleMarkPending(reminder: Reminder) {
    try {
      setActionId(reminder.item_id); setError(""); setNotice("");
      await apiFetch(`/reminders/${reminder.item_id}/mark-pending`, { method: "POST" });
      setNotice("El recordatorio volvió al estado pendiente.");
      await loadReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo devolver el recordatorio a pendiente.");
    } finally { setActionId(null); }
  }

  const summary = data?.summary;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div><p className="text-sm font-semibold text-blue-300">SIADAUTO</p><h1 className="text-3xl font-bold">Recordatorios de mantenimiento</h1><p className="mt-2 max-w-3xl text-slate-400">Próximos servicios calculados por la fecha estimada registrada en cada orden de trabajo.</p></div>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={loadReminders} disabled={loading} className="rounded-xl bg-slate-800 px-4 py-2 font-semibold hover:bg-slate-700 disabled:opacity-60">{loading ? "Actualizando..." : "↻ Actualizar"}</button><Link href="/dashboard" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">Volver al Dashboard</Link></div>
          </div>
        </section>

        {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        {notice ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200">{notice}</div> : null}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {STATUS_ORDER.map((status) => (
            <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${STATUS_STYLE[status]} ${filter === status ? "ring-2 ring-white/50" : ""}`}>
              <p className="text-sm opacity-80">{STATUS_LABEL[status]}</p><p className="mt-1 text-3xl font-bold">{summary?.[status] || 0}</p>
            </button>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><h2 className="text-xl font-bold">Listado de mantenimientos</h2><p className="mt-1 text-sm text-slate-400">{filteredReminders.length} registro(s) visibles</p></div>
            <button type="button" onClick={() => setFilter("todos")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === "todos" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>Ver todos ({summary?.total || 0})</button>
          </div>

          {loading ? <div className="py-12 text-center text-slate-400">Cargando recordatorios...</div> : filteredReminders.length === 0 ? <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">No hay recordatorios en esta categoría.</div> : (
            <div className="space-y-4">
              {filteredReminders.map((reminder) => {
                const isWorking = actionId === reminder.item_id;
                const hasValidPhone = Boolean(normalizeEcuadorPhone(reminder.client_phone));
                return (
                  <article key={reminder.item_id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLE[reminder.status]}`}>{STATUS_LABEL[reminder.status]}</span><span className="text-sm text-slate-400">{daysText(reminder.days_remaining)}</span></div>
                        <h3 className="text-xl font-bold">{reminder.service_description}</h3>
                        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                          <div><p className="text-slate-500">Cliente</p><p className="font-semibold text-slate-200">{reminder.client_name || "Sin nombre"}</p><p className="text-slate-400">{reminder.client_phone || "Sin teléfono"}</p></div>
                          <div><p className="text-slate-500">Vehículo</p><p className="font-semibold text-slate-200">{reminder.vehicle || "Vehículo"}</p><p className="text-slate-400">{reminder.plate || "Sin placa"}</p></div>
                          <div><p className="text-slate-500">Próximo mantenimiento</p><p className="font-semibold text-slate-200">{formatDate(reminder.next_service_date)}</p></div>
                          <div><p className="text-slate-500">Orden de origen</p><p className="font-semibold text-slate-200">OT #{reminder.work_order_number}</p><p className="text-slate-400">{formatDate(reminder.last_service_date)}</p></div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                        {reminder.status === "enviado" ? <button type="button" onClick={() => handleMarkPending(reminder)} disabled={isWorking} className="rounded-xl bg-slate-700 px-5 py-3 font-semibold hover:bg-slate-600 disabled:opacity-60">{isWorking ? "Procesando..." : "Marcar como pendiente"}</button> : <button type="button" onClick={() => handleSend(reminder)} disabled={isWorking || !hasValidPhone} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{isWorking ? "Registrando..." : hasValidPhone ? "💬 Enviar por WhatsApp" : "Sin teléfono válido"}</button>}
                        <Link href={`/dashboard/vehicles/${reminder.vehicle_id}/vida-del-auto?plate=${encodeURIComponent(reminder.plate || "")}&client=${encodeURIComponent(reminder.client_name || "")}`} className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold text-slate-200 hover:bg-slate-800">Ver Vida del Auto</Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
