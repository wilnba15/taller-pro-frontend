"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createInventoryProduct,
  deactivateInventoryProduct,
  getInventoryProducts,
  getMyWorkshop,
  type InventoryProduct,
  type InventoryProductPayload,
  updateInventoryProduct,
} from "@/lib/api";

type ProductForm = {
  code: string; name: string; category: string; brand: string;
  stock: string; minimum_stock: string; cost: string; sale_price: string;
  is_active: boolean;
};

const emptyForm: ProductForm = {
  code: "", name: "", category: "", brand: "",
  stock: "0", minimum_stock: "0", cost: "0", sale_price: "0", is_active: true,
};

const money = (value: number) =>
  new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" }).format(value);

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const workshop = await getMyWorkshop();
      if (!workshop.inventory_enabled) {
        setAuthorized(false); setProducts([]); return;
      }
      setAuthorized(true);
      setProducts(await getInventoryProducts({
        search: search.trim() || undefined,
        low_stock: onlyLowStock,
        include_inactive: includeInactive,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el inventario");
    } finally {
      setLoading(false);
    }
  }, [search, onlyLowStock, includeInactive]);

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, 250);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.is_active && p.low_stock).length, [products]
  );
  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + (p.is_active ? Number(p.stock) : 0), 0),
    [products]
  );

  function updateField(field: keyof ProductForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openNew() {
    setEditingId(null); setForm(emptyForm); setShowForm(true);
    setMessage(""); setError("");
  }

  function openEdit(product: InventoryProduct) {
    setEditingId(product.id);
    setForm({
      code: product.code || "", name: product.name,
      category: product.category || "", brand: product.brand || "",
      stock: String(product.stock), minimum_stock: String(product.minimum_stock),
      cost: String(product.cost), sale_price: String(product.sale_price),
      is_active: product.is_active,
    });
    setShowForm(true); setMessage(""); setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true); setMessage(""); setError("");
      const payload: InventoryProductPayload = {
        code: form.code.trim() || null,
        name: form.name.trim(),
        category: form.category.trim() || null,
        brand: form.brand.trim() || null,
        stock: Math.max(0, Number(form.stock) || 0),
        minimum_stock: Math.max(0, Number(form.minimum_stock) || 0),
        cost: Math.max(0, Number(form.cost) || 0),
        sale_price: Math.max(0, Number(form.sale_price) || 0),
        is_active: form.is_active,
      };
      if (!payload.name) throw new Error("Ingresa el nombre del producto");
      if (editingId) {
        await updateInventoryProduct(editingId, payload);
        setMessage("Producto actualizado correctamente.");
      } else {
        await createInventoryProduct(payload);
        setMessage("Producto registrado correctamente.");
      }
      setShowForm(false); setEditingId(null); setForm(emptyForm);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(product: InventoryProduct) {
    if (!window.confirm(`¿Desactivar ${product.name}?`)) return;
    try {
      await deactivateInventoryProduct(product.id);
      setMessage("Producto desactivado correctamente.");
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar");
    }
  }

  if (authorized === false) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h1 className="text-2xl font-bold">Módulo no habilitado</h1>
          <p className="mt-2 text-amber-100/80">
            El inventario no está activo para este taller.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventario</h1>
            <p className="mt-1 text-slate-400">Repuestos y productos del taller.</p>
          </div>
          <button onClick={openNew} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">
            + Nuevo producto
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Productos mostrados" value={products.length} />
          <Stat label="Unidades en stock" value={totalStock.toLocaleString("es-US")} />
          <Stat label="Stock bajo" value={lowStockCount} warning />
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[1fr_auto_auto]">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código, categoría o marca"
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500" />
          <Check label="Solo stock bajo" checked={onlyLowStock} onChange={setOnlyLowStock} />
          <Check label="Incluir inactivos" checked={includeInactive} onChange={setIncludeInactive} />
        </div>

        {message && <Notice text={message} success />}
        {error && <Notice text={error} />}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingId ? "Editar producto" : "Registrar producto"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Cerrar</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre *" value={form.name} onChange={(v) => updateField("name", v)} required />
              <Field label="Código o SKU" value={form.code} onChange={(v) => updateField("code", v)} />
              <Field label="Categoría" value={form.category} onChange={(v) => updateField("category", v)} />
              <Field label="Marca" value={form.brand} onChange={(v) => updateField("brand", v)} />
              <Field label="Stock actual" type="number" value={form.stock} onChange={(v) => updateField("stock", v)} />
              <Field label="Stock mínimo" type="number" value={form.minimum_stock} onChange={(v) => updateField("minimum_stock", v)} />
              <Field label="Costo" type="number" value={form.cost} onChange={(v) => updateField("cost", v)} />
              <Field label="Precio de venta" type="number" value={form.sale_price} onChange={(v) => updateField("sale_price", v)} />
              <Check label="Producto activo" checked={form.is_active} onChange={(v) => updateField("is_active", v)} />
            </div>
            <div className="mt-5 flex gap-3">
              <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold hover:bg-blue-500 disabled:opacity-60">
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-700 px-5 py-2.5 font-semibold hover:bg-slate-800">Cancelar</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          {loading ? <div className="p-6 text-slate-400">Cargando inventario...</div> :
          products.length === 0 ? <div className="p-8 text-center text-slate-400">No hay productos.</div> : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/70 text-slate-200">
                <tr>
                  {["Producto","Categoría / Marca","Stock","Mínimo","Costo","Venta","Estado","Acciones"].map((h) =>
                    <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className="px-4 py-3"><div className="font-semibold">{p.name}</div><div className="text-xs text-slate-500">{p.code || "Sin código"}</div></td>
                    <td className="px-4 py-3 text-slate-300">{p.category || "-"}<div className="text-xs text-slate-500">{p.brand || ""}</div></td>
                    <td className={`px-4 py-3 font-semibold ${p.low_stock ? "text-amber-300" : ""}`}>{Number(p.stock).toLocaleString("es-US")}</td>
                    <td className="px-4 py-3">{Number(p.minimum_stock).toLocaleString("es-US")}</td>
                    <td className="px-4 py-3">{money(Number(p.cost))}</td>
                    <td className="px-4 py-3">{money(Number(p.sale_price))}</td>
                    <td className="px-4 py-3">{!p.is_active ? "Inactivo" : p.low_stock ? "⚠️ Stock bajo" : "Disponible"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800">Editar</button>
                        {p.is_active && <button onClick={() => deactivate(p)} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10">Desactivar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (value: string) => void;
  type?: string; required?: boolean;
}) {
  return <label className="block">
    <span className="mb-1.5 block text-sm text-slate-300">{label}</span>
    <input type={type} value={value} required={required} min={type === "number" ? "0" : undefined}
      step={type === "number" ? "0.01" : undefined}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500" />
  </label>;
}

function Check({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (value: boolean) => void;
}) {
  return <label className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}
  </label>;
}

function Stat({ label, value, warning = false }: {
  label: string; value: string | number; warning?: boolean;
}) {
  return <div className={`rounded-2xl border p-5 ${warning ? "border-amber-500/30 bg-amber-500/10" : "border-slate-800 bg-slate-900"}`}>
    <p className="text-sm text-slate-400">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p>
  </div>;
}

function Notice({ text, success = false }: { text: string; success?: boolean }) {
  return <div className={`mb-5 rounded-2xl border p-4 ${success ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>{text}</div>;
}
