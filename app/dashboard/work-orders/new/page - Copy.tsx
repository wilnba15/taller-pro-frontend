"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Client = {
  id: number;
  workshop_id: number;
  full_name: string;
  phone: string;
};

type Vehicle = {
  id: number;
  workshop_id: number;
  client_id: number;
  plate: string;
  brand: string;
  model: string;
};

type OrderItem = {
  id: string;
  item_type: "repuesto" | "mano_obra";
  description: string;
  quantity: string;
  unit_price: string;
};

type FormState = {
  client_id: string;
  vehicle_id: string;
  entry_date: string;
  estimated_delivery_date: string;
  status: "pendiente" | "en_proceso" | "finalizado" | "entregado";
  issue_description: string;
  diagnosis: string;
  work_performed: string;
  notes: string;
};

type WorkOrderResponse = {
  id: number;
  workshop_id: number;
  client_id: number;
  vehicle_id: number;
};

const initialForm: FormState = {
  client_id: "",
  vehicle_id: "",
  entry_date: new Date().toISOString().slice(0, 10),
  estimated_delivery_date: "",
  status: "pendiente",
  issue_description: "",
  diagnosis: "",
  work_performed: "",
  notes: "",
};

const createEmptyItem = (type: OrderItem["item_type"]): OrderItem => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  item_type: type,
  description: "",
  quantity: "1",
  unit_price: "0",
});

export default function NewWorkOrderPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [items, setItems] = useState<OrderItem[]>([
    createEmptyItem("repuesto"),
    createEmptyItem("mano_obra"),
  ]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setError("");

        const [clientsData, vehiclesData] = await Promise.all([
          apiFetch<Client[]>("/clients/"),
          apiFetch<Vehicle[]>("/vehicles/"),
        ]);

        // El backend ya devuelve solo datos del taller autenticado.
        setClients(clientsData);
        setVehicles(vehiclesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const filteredVehicles = useMemo(() => {
    const selectedClientId = Number(form.client_id);
    if (!selectedClientId) return [];
    return vehicles.filter((vehicle) => vehicle.client_id === selectedClientId);
  }, [vehicles, form.client_id]);

  const itemSubtotal = (item: OrderItem) => {
    return Number(item.quantity || 0) * Number(item.unit_price || 0);
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const subtotal = itemSubtotal(item);
        if (item.item_type === "repuesto") acc.parts += subtotal;
        if (item.item_type === "mano_obra") acc.labor += subtotal;
        return acc;
      },
      { parts: 0, labor: 0 }
    );
  }, [items]);

  const visualTotal = totals.parts + totals.labor;

  const handleItemChange = (
    id: string,
    field: keyof OrderItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddItem = (type: OrderItem["item_type"]) => {
    setItems((prev) => [...prev, createEmptyItem(type)]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      if (prev.length === 1) {
        return [createEmptyItem("repuesto")];
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const getValidItems = () => {
    return items
      .map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);

        return {
          item_type: item.item_type,
          description: item.description.trim(),
          quantity,
          unit_price: unitPrice,
          subtotal: quantity * unitPrice,
        };
      })
      .filter((item) => item.description && item.quantity > 0);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "client_id") {
        return {
          ...prev,
          client_id: value,
          vehicle_id: "",
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const saveWorkOrderItems = async (workOrderId: number) => {
    const validItems = getValidItems();

    await Promise.all(
      validItems.map(async (item) => {
        await apiFetch("/work-order-items/", {
          method: "POST",
          body: JSON.stringify({
            work_order_id: workOrderId,
            item_type: item.item_type,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          }),
        });
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        // workshop_id ya NO se envía. El backend lo toma del token.
        client_id: Number(form.client_id),
        vehicle_id: Number(form.vehicle_id),
        entry_date: form.entry_date,
        estimated_delivery_date: form.estimated_delivery_date || null,
        status: form.status,
        issue_description: form.issue_description,
        diagnosis: form.diagnosis || null,
        work_performed: form.work_performed || null,
        notes: form.notes.trim() || null,
        labor_cost: totals.labor,
        parts_cost: totals.parts,
      };

      const data = await apiFetch<WorkOrderResponse>("/work-orders/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await saveWorkOrderItems(data.id);

      setSuccess("Orden de trabajo e ítems guardados correctamente");
      setTimeout(() => {
        router.push(`/dashboard/work-orders/${data.id}/edit`);
        router.refresh();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-6xl mx-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
          Cargando clientes y vehículos...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Nueva orden de trabajo</h1>
            <p className="text-slate-400 mt-1">
              Registra el ingreso del vehículo, el problema reportado y los valores estimados.
            </p>
          </div>

          <Link
            href="/dashboard/work-orders"
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition"
          >
            ← Volver
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr,0.8fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5"
          >
            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300">
                {success}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Cliente</label>
                <select
                  name="client_id"
                  value={form.client_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name} ({client.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Vehículo</label>
                <select
                  name="vehicle_id"
                  value={form.vehicle_id}
                  onChange={handleChange}
                  required
                  disabled={!form.client_id}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="">
                    {form.client_id ? "Selecciona un vehículo" : "Primero elige un cliente"}
                  </option>
                  {filteredVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand} {vehicle.model} - {vehicle.plate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha de ingreso</label>
                <input
                  type="date"
                  name="entry_date"
                  value={form.entry_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Entrega estimada</label>
                <input
                  type="date"
                  name="estimated_delivery_date"
                  value={form.estimated_delivery_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="entregado">Entregado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Problema reportado</label>
              <textarea
                name="issue_description"
                value={form.issue_description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Ejemplo: pérdida de fuerza, ruido en frenos, falla de encendido..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Diagnóstico</label>
                <textarea
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Diagnóstico técnico preliminar"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Trabajo realizado</label>
                <textarea
                  name="work_performed"
                  value={form.work_performed}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Mantenimiento, reparación, cambio de piezas..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notas</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Observaciones adicionales. Aquí ya no se guardan repuestos ni mano de obra."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Detalle económico tipo Excel</h2>
                  <p className="text-sm text-slate-400">
                    Agrega mano de obra y repuestos en filas. Se guardarán en la tabla work_order_items.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddItem("mano_obra")}
                    className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/20"
                  >
                    + Mano de obra
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddItem("repuesto")}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
                  >
                    + Repuesto
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-slate-900 text-slate-300">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium">Tipo</th>
                      <th className="px-3 py-3 text-left font-medium">Descripción</th>
                      <th className="px-3 py-3 text-right font-medium">Cant.</th>
                      <th className="px-3 py-3 text-right font-medium">V. unitario</th>
                      <th className="px-3 py-3 text-right font-medium">Subtotal</th>
                      <th className="px-3 py-3 text-center font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {items.map((item) => {
                      const subtotal = itemSubtotal(item);

                      return (
                        <tr key={item.id} className="bg-slate-950/70">
                          <td className="px-3 py-2">
                            <select
                              value={item.item_type}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "item_type",
                                  e.target.value as OrderItem["item_type"]
                                )
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
                            >
                              <option value="mano_obra">Mano de obra</option>
                              <option value="repuesto">Repuesto</option>
                            </select>
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                handleItemChange(item.id, "description", e.target.value)
                              }
                              placeholder="Ej: Cambio de aceite, filtro, bujía..."
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(item.id, "quantity", e.target.value)
                              }
                              className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right outline-none"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleItemChange(item.id, "unit_price", e.target.value)
                              }
                              className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right outline-none"
                            />
                          </td>

                          <td className="px-3 py-2 text-right font-semibold text-slate-100">
                            ${subtotal.toFixed(2)}
                          </td>

                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <p className="text-xs text-slate-400">Mano de obra</p>
                  <p className="mt-1 text-xl font-bold">${totals.labor.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <p className="text-xs text-slate-400">Repuestos</p>
                  <p className="mt-1 text-xl font-bold">${totals.parts.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                  <p className="text-xs text-blue-200">Total orden</p>
                  <p className="mt-1 text-2xl font-bold">${visualTotal.toFixed(2)}</p>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 font-medium transition hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar orden"}
            </button>
          </form>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold">Resumen visual</h2>
              <p className="text-slate-400 text-sm mt-1">
                Estimación rápida del valor de la orden.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Mano de obra</span>
                    <span>${totals.labor.toFixed(2)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${visualTotal > 0 ? (totals.labor / visualTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Repuestos</span>
                    <span>${totals.parts.toFixed(2)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${visualTotal > 0 ? (totals.parts / visualTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Total estimado</p>
                <p className="mt-2 text-3xl font-bold">${visualTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold">Regla SIADAUTO PRO</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>1. Notas solo guarda observaciones generales.</li>
                <li>2. Repuestos y mano de obra se guardan en work_order_items.</li>
                <li>3. La factura se generará desde la tabla de ítems.</li>
                <li>4. Los totales quedan guardados en la orden.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
