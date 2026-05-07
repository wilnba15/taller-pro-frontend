"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_WORKSHOP_ID = 1;

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

export default function NewWorkOrderPage() {
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_BASE;

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [partsItems, setPartsItems] = useState<OrderItem[]>([
    { description: "", quantity: "1", unit_price: "0" },
  ]);
  const [laborItems, setLaborItems] = useState<OrderItem[]>([
    { description: "", quantity: "1", unit_price: "0" },
  ]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!api) {
          throw new Error("Falta NEXT_PUBLIC_API_BASE");
        }

        const [clientsRes, vehiclesRes] = await Promise.all([
          fetch(`${api}/clients/`),
          fetch(`${api}/vehicles/`),
        ]);

        if (!clientsRes.ok) {
          throw new Error("No se pudieron cargar los clientes");
        }

        if (!vehiclesRes.ok) {
          throw new Error("No se pudieron cargar los vehículos");
        }

        const [clientsData, vehiclesData] = await Promise.all([
          clientsRes.json(),
          vehiclesRes.json(),
        ]);

        setClients(
          clientsData.filter((client: Client) => client.workshop_id === DEFAULT_WORKSHOP_ID)
        );
        setVehicles(
          vehiclesData.filter((vehicle: Vehicle) => vehicle.workshop_id === DEFAULT_WORKSHOP_ID)
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [api]);

  const filteredVehicles = useMemo(() => {
    const selectedClientId = Number(form.client_id);
    if (!selectedClientId) return [];
    return vehicles.filter((vehicle) => vehicle.client_id === selectedClientId);
  }, [vehicles, form.client_id]);

  const calculateItemsTotal = (items: OrderItem[]) => {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      return total + quantity * unitPrice;
    }, 0);
  };

  const partsTotal = useMemo(() => calculateItemsTotal(partsItems), [partsItems]);
  const laborTotal = useMemo(() => calculateItemsTotal(laborItems), [laborItems]);
  const visualTotal = useMemo(() => partsTotal + laborTotal, [partsTotal, laborTotal]);

  const handleItemChange = (
    type: "parts" | "labor",
    index: number,
    field: keyof OrderItem,
    value: string
  ) => {
    const setter = type === "parts" ? setPartsItems : setLaborItems;

    setter((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddItem = (type: "parts" | "labor") => {
    const setter = type === "parts" ? setPartsItems : setLaborItems;
    setter((prev) => [...prev, { description: "", quantity: "1", unit_price: "0" }]);
  };

  const handleRemoveItem = (type: "parts" | "labor", index: number) => {
    const setter = type === "parts" ? setPartsItems : setLaborItems;
    setter((prev) => {
      if (prev.length === 1) {
        return [{ description: "", quantity: "1", unit_price: "0" }];
      }
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const buildOrderDetailsText = () => {
    const cleanParts = partsItems.filter((item) => item.description.trim());
    const cleanLabor = laborItems.filter((item) => item.description.trim());

    const partsText = cleanParts.length
      ? [
          "REPUESTOS:",
          ...cleanParts.map(
            (item, index) =>
              `${index + 1}. ${item.description.trim()} | Cant: ${item.quantity || 0} | V.Unit: $${Number(item.unit_price || 0).toFixed(2)} | Subtotal: $${(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}`
          ),
        ].join("\n")
      : "";

    const laborText = cleanLabor.length
      ? [
          "MANO DE OBRA:",
          ...cleanLabor.map(
            (item, index) =>
              `${index + 1}. ${item.description.trim()} | Cant/Horas: ${item.quantity || 0} | V.Unit: $${Number(item.unit_price || 0).toFixed(2)} | Subtotal: $${(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}`
          ),
        ].join("\n")
      : "";

    return [partsText, laborText].filter(Boolean).join("\n\n");
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


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!api) {
        throw new Error("Falta NEXT_PUBLIC_API_BASE");
      }

      const payload = {
        workshop_id: DEFAULT_WORKSHOP_ID,
        client_id: Number(form.client_id),
        vehicle_id: Number(form.vehicle_id),
        entry_date: form.entry_date,
        estimated_delivery_date: form.estimated_delivery_date || null,
        status: form.status,
        issue_description: form.issue_description,
        diagnosis: form.diagnosis || null,
        work_performed: form.work_performed || null,
        notes:
          [form.notes.trim(), buildOrderDetailsText()]
            .filter(Boolean)
            .join("\n\n") || null,
        labor_cost: laborTotal,
        parts_cost: partsTotal,
      };

      const res = await fetch(`${api}/work-orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "No se pudo guardar la orden de trabajo");
      }

      setSuccess("Orden de trabajo guardada correctamente");
      setTimeout(() => {
        router.push("/dashboard/work-orders");
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
        <div className="max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
          Cargando clientes y vehículos...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
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

        <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
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



            <div>
              <label className="block text-sm font-medium mb-2">Diagnóstico</label>
              <textarea
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleChange}
                rows={10}
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
                rows={3}
                placeholder="Mantenimiento, reparación, cambio de piezas..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notas</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Observaciones adicionales"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">🔩 Repuestos</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Detalla los repuestos utilizados o presupuestados para esta orden.
                </p>
              </div>

              <div className="space-y-3">
                {partsItems.map((item, index) => (
                  <div
                    key={`part-${index}`}
                    className="grid gap-3 md:grid-cols-[1.5fr,0.55fr,0.75fr,0.75fr,auto] items-end rounded-xl border border-slate-800 bg-slate-900 p-3"
                  >
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                      <input
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("parts", index, "description", e.target.value)
                        }
                        placeholder="Ej: Filtro de aceite"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Cant.</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange("parts", index, "quantity", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">V. unitario</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleItemChange("parts", index, "unit_price", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Subtotal</label>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold">
                        ${(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem("parts", index)}
                      className="rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleAddItem("parts")}
                  className="rounded-xl border border-blue-500/30 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/10"
                >
                  + Agregar repuesto
                </button>

                <p className="text-sm text-slate-300">
                  Total repuestos: <span className="font-bold text-white">${partsTotal.toFixed(2)}</span>
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">🛠 Mano de obra</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Detalla los trabajos realizados, cantidad u horas y valor unitario.
                </p>
              </div>

              <div className="space-y-3">
                {laborItems.map((item, index) => (
                  <div
                    key={`labor-${index}`}
                    className="grid gap-3 md:grid-cols-[1.5fr,0.55fr,0.75fr,0.75fr,auto] items-end rounded-xl border border-slate-800 bg-slate-900 p-3"
                  >
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Trabajo</label>
                      <input
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("labor", index, "description", e.target.value)
                        }
                        placeholder="Ej: Cambio de aceite"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Cant/Horas</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange("labor", index, "quantity", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">V. unitario</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleItemChange("labor", index, "unit_price", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Subtotal</label>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold">
                        ${(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem("labor", index)}
                      className="rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleAddItem("labor")}
                  className="rounded-xl border border-blue-500/30 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/10"
                >
                  + Agregar mano de obra
                </button>

                <p className="text-sm text-slate-300">
                  Total mano de obra: <span className="font-bold text-white">${laborTotal.toFixed(2)}</span>
                </p>
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
                    <span>${laborTotal.toFixed(2)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${visualTotal > 0 ? (laborTotal / visualTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Repuestos</span>
                    <span>${partsTotal.toFixed(2)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${visualTotal > 0 ? (partsTotal / visualTotal) * 100 : 0}%`,
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
              <h2 className="text-lg font-semibold">Flujo recomendado</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>1. Selecciona el cliente.</li>
                <li>2. Elige uno de sus vehículos.</li>
                <li>3. Registra el problema reportado.</li>
                <li>4. Registra el diagnóstico preliminar del mecánico.</li>
                <li>5. Ajusta costos y fecha estimada.</li>
                <li>6. Guarda la orden para que el sistema calcule el total.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
