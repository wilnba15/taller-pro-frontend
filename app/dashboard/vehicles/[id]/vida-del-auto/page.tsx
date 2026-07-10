"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch, getApiBase, requireToken } from "@/lib/api";

type VehicleLifeItem = {
  work_order_id: number;
  work_order_date?: string | null;
  current_km?: number | null;
  status?: string | null;
  item_id: number;
  item_type?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  subtotal?: number | null;
  next_service_km?: number | null;
  next_service_date?: string | null;
  reminder_enabled?: boolean;
  reminder_sent?: boolean;
};

type VehicleLifeReport = {
  vehicle_id: number;
  total_events: number;
  total_invested: number;
  last_km?: number | null;
  items: VehicleLifeItem[];
  next_services: VehicleLifeItem[];
};

function money(value?: number | null) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function km(value?: number | null) {
  if (!value) return "—";
  return `${Number(value).toLocaleString("es-EC")} km`;
}

function itemTypeLabel(value?: string | null) {
  if (value === "mano_obra") return "Mano de obra";
  if (value === "repuesto") return "Repuesto";
  return value || "Servicio";
}

function getParamId(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) return raw[0] || "";
  return raw || "";
}

export default function VidaDelAutoPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const vehicleId = getParamId(params?.id as string | string[] | undefined);

  const plate = searchParams.get("plate") || "";
  const brand = searchParams.get("brand") || "";
  const model = searchParams.get("model") || "";
  const clientName = searchParams.get("client") || "";

  const [report, setReport] = useState<VehicleLifeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");

  const vehicleName = [brand, model].filter(Boolean).join(" ");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        if (!vehicleId || vehicleId === "undefined") {
          setReport(null);
          setError("No se recibió un ID válido del vehículo.");
          return;
        }

        const data = await apiFetch<VehicleLifeReport>(
          `/api/vehicle-life/vehicle/${vehicleId}`
        );
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la Vida del Auto.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [vehicleId]);

  const grouped = useMemo(() => {
    const map = new Map<number, VehicleLifeItem[]>();

    for (const item of report?.items || []) {
      if (!map.has(item.work_order_id)) {
        map.set(item.work_order_id, []);
      }
      map.get(item.work_order_id)?.push(item);
    }

    return Array.from(map.entries()).map(([workOrderId, items]) => ({
      workOrderId,
      items,
      header: items[0],
    }));
  }, [report]);

  const handlePdf = async () => {
    try {
      if (!vehicleId || vehicleId === "undefined") {
        throw new Error("No se recibió un ID válido del vehículo.");
      }

      setPdfLoading(true);
      setError("");

      const api = getApiBase();
      const token = requireToken();

      const response = await fetch(
        `${api}/api/vehicle-life/vehicle/${vehicleId}/pdf`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`No se pudo generar el PDF: ${detail}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-300">SIADAUTO</p>
              <h1 className="text-3xl font-bold">Vida del Auto</h1>
              <p className="mt-1 text-slate-300">
                Historial inteligente de mantenimiento, reparaciones y próximos cuidados.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePdf}
              disabled={pdfLoading || !vehicleId || vehicleId === "undefined"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>📄</span>
              <span>{pdfLoading ? "Generando PDF..." : "Generar reporte PDF"}</span>
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Vehículo</p>
              <p className="font-bold">{vehicleName || "Vehículo"}</p>
              <p className="text-sm text-slate-300">{plate || "Sin placa"}</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Cliente</p>
              <p className="font-bold">{clientName || "Sin cliente"}</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Último km registrado</p>
              <p className="text-xl font-bold">{km(report?.last_km)}</p>
            </div>

            <div className="rounded-xl border border-blue-700 bg-blue-950 p-4">
              <p className="text-sm text-blue-200">Total invertido</p>
              <p className="text-xl font-bold">{money(report?.total_invested)}</p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border bg-white p-5 text-slate-900 shadow-sm">
          <h2 className="text-xl font-bold">Próximos cuidados</h2>

          {loading ? (
            <p className="mt-3 text-slate-500">Cargando...</p>
          ) : !report?.next_services?.length ? (
            <p className="mt-3 text-slate-500">
              Todavía no hay próximos servicios programados.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {report.next_services.map((item) => (
                <div
                  key={`${item.work_order_id}-${item.item_id}`}
                  className="rounded-xl border border-blue-100 bg-blue-50 p-4"
                >
                  <p className="font-bold">{item.description}</p>
                  <p className="text-sm text-slate-600">
                    Realizado en: {km(item.current_km)}
                  </p>
                  <p className="mt-2 text-blue-900">
                    Próximo:{" "}
                    <strong>
                      {item.next_service_km ? km(item.next_service_km) : ""}
                      {item.next_service_km && item.next_service_date ? " · " : ""}
                      {item.next_service_date || ""}
                    </strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-5 text-slate-900 shadow-sm">
          <h2 className="text-xl font-bold">Historial tipo concesionario</h2>

          {loading ? (
            <p className="mt-3 text-slate-500">Cargando historial...</p>
          ) : grouped.length === 0 ? (
            <p className="mt-3 text-slate-500">
              Este vehículo todavía no tiene historial registrado.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {grouped.map(({ workOrderId, items, header }) => {
                const total = items.reduce(
                  (acc, item) => acc + Number(item.subtotal || 0),
                  0
                );

                return (
                  <article
                    key={workOrderId}
                    className="rounded-2xl border bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">
                          Orden #{workOrderId}
                        </p>
                        <h3 className="text-2xl font-bold">
                          {km(header.current_km)}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {header.work_order_date
                            ? new Date(header.work_order_date).toLocaleDateString("es-EC")
                            : "Sin fecha"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                        <p className="text-sm text-slate-300">Total OT</p>
                        <p className="text-lg font-bold">{money(total)}</p>
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-slate-100 text-left text-slate-700">
                          <tr>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Descripción</th>
                            <th className="p-3 text-right">Subtotal</th>
                            <th className="p-3">Próximo cuidado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.item_id} className="border-t">
                              <td className="p-3">{itemTypeLabel(item.item_type)}</td>
                              <td className="p-3 font-medium">
                                {item.description}
                              </td>
                              <td className="p-3 text-right font-semibold">
                                {money(item.subtotal)}
                              </td>
                              <td className="p-3 text-slate-600">
                                {item.next_service_km || item.next_service_date ? (
                                  <>
                                    {item.next_service_km ? km(item.next_service_km) : ""}
                                    {item.next_service_km && item.next_service_date
                                      ? " · "
                                      : ""}
                                    {item.next_service_date || ""}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
