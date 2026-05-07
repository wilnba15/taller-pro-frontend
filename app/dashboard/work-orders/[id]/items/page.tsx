"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type WorkOrder = {
  id: number;
  labor_cost?: number | string | null;
  parts_cost?: number | string | null;
};

type WorkOrderItem = {
  id: number;
  work_order_id: number;
  item_type: "repuesto" | "mano_obra" | string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
};

type DraftItem = {
  item_type: "repuesto" | "mano_obra";
  description: string;
  quantity: string;
  unit_price: string;
};

export default function WorkOrderItemsPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE;
  const params = useParams<{ id: string }>();
  const orderId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [draft, setDraft] = useState<DraftItem>({
    item_type: "repuesto",
    description: "",
    quantity: "1",
    unit_price: "0",
  });

  const subtotalDraft = useMemo(() => {
    return Number(draft.quantity || 0) * Number(draft.unit_price || 0);
  }, [draft.quantity, draft.unit_price]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const subtotal = Number(item.subtotal ?? 0);
        if (item.item_type === "mano_obra") acc.labor += subtotal;
        if (item.item_type === "repuesto") acc.parts += subtotal;
        return acc;
      },
      { labor: 0, parts: 0 }
    );
  }, [items]);

  const totalOrder = totals.labor + totals.parts;

  const loadItems = async () => {
    try {
      if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");
      if (!orderId) throw new Error("No se encontró el ID de la orden");

      setLoading(true);
      setError("");

      const res = await fetch(`${api}/work-order-items/work-order/${orderId}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("No se pudieron cargar los ítems de la orden");

      const data = await res.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar ítems");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, orderId]);

  const syncWorkOrderTotals = async (labor: number, parts: number) => {
    if (!api || !orderId) return;

    const orderRes = await fetch(`${api}/work-orders/${orderId}`, { cache: "no-store" });
    if (!orderRes.ok) return;

    const order: WorkOrder & Record<string, any> = await orderRes.json();

    await fetch(`${api}/work-orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...order,
        labor_cost: labor,
        parts_cost: parts,
      }),
    });
  };

  const addItem = async () => {
    try {
      if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");
      if (!draft.description.trim()) throw new Error("Ingresa una descripción");

      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        work_order_id: Number(orderId),
        item_type: draft.item_type,
        description: draft.description.trim(),
        quantity: Number(draft.quantity || 0),
        unit_price: Number(draft.unit_price || 0),
        subtotal: subtotalDraft,
      };

      const res = await fetch(`${api}/work-order-items/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "No se pudo guardar el ítem");

      const newItems = [...items, data];
      setItems(newItems);

      const labor = newItems
        .filter((item) => item.item_type === "mano_obra")
        .reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      const parts = newItems
        .filter((item) => item.item_type === "repuesto")
        .reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

      await syncWorkOrderTotals(labor, parts);

      setDraft({ item_type: "repuesto", description: "", quantity: "1", unit_price: "0" });
      setMessage("Ítem agregado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar ítem");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: number) => {
    try {
      if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");

      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch(`${api}/work-order-items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar el ítem");

      const newItems = items.filter((item) => item.id !== itemId);
      setItems(newItems);

      const labor = newItems
        .filter((item) => item.item_type === "mano_obra")
        .reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
      const parts = newItems
        .filter((item) => item.item_type === "repuesto")
        .reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

      await syncWorkOrderTotals(labor, parts);
      setMessage("Ítem eliminado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar ítem");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-6 text-white">Cargando ítems...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Detalle económico OT #{orderId}</h1>
            <p className="mt-1 text-slate-400">Repuestos y mano de obra guardados en la nueva tabla.</p>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/dashboard/work-orders/${orderId}/edit`}
              className="rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-800"
            >
              Editar OT
            </Link>
            <Link
              href={`/dashboard/work-orders/${orderId}`}
              className="rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-800"
            >
              Volver
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">{error}</div>
        ) : null}

        {message ? (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">{message}</div>
        ) : null}

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Agregar ítem</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[180px,1fr,120px,160px,140px]">
            <select
              value={draft.item_type}
              onChange={(e) => setDraft((prev) => ({ ...prev, item_type: e.target.value as DraftItem["item_type"] }))}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            >
              <option value="repuesto">Repuesto</option>
              <option value="mano_obra">Mano de obra</option>
            </select>

            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ej: Bujías, cambio de aceite, alineación..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.quantity}
              onChange={(e) => setDraft((prev) => ({ ...prev, quantity: e.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-right outline-none"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.unit_price}
              onChange={(e) => setDraft((prev) => ({ ...prev, unit_price: e.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-right outline-none"
            />

            <button
              type="button"
              onClick={addItem}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Guardando..." : `Agregar $${subtotalDraft.toFixed(2)}`}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Cant.</th>
                  <th className="px-4 py-3 text-right">V. unitario</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Todavía no hay repuestos ni mano de obra registrados.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="bg-slate-950/60">
                      <td className="px-4 py-3">
                        {item.item_type === "mano_obra" ? "Mano de obra" : "Repuesto"}
                      </td>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 text-right">{Number(item.quantity || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${Number(item.unit_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold">${Number(item.subtotal || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          disabled={saving}
                          className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-60"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Mano de obra</p>
            <p className="mt-2 text-3xl font-bold">${totals.labor.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Repuestos</p>
            <p className="mt-2 text-3xl font-bold">${totals.parts.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
            <p className="text-sm text-blue-200">Total orden</p>
            <p className="mt-2 text-3xl font-bold">${totalOrder.toFixed(2)}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
