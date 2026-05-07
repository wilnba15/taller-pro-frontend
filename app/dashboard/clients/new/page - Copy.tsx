"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FormData = {
  workshop_id: string;
  full_name: string;
  identification: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export default function NewClientPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormData>({
    workshop_id: "1",
    full_name: "",
    identification: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE;

      if (!api) {
        throw new Error("Falta NEXT_PUBLIC_API_BASE en las variables de entorno");
      }

      const payload = {
        workshop_id: Number(form.workshop_id),
        full_name: form.full_name,
        identification: form.identification,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
      };

      const res = await fetch(`${api}/clients/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error al crear cliente: ${res.status} ${text}`);
      }

      router.push("/dashboard/clients");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Nuevo cliente</h1>
            <p className="text-slate-400 mt-1">
              Crea un cliente y guárdalo en el backend staging.
            </p>
          </div>

          <Link
            href="/dashboard/clients"
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition"
          >
            ← Volver
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm mb-2">Workshop ID</label>
            <input
              name="workshop_id"
              value={form.workshop_id}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none"
              placeholder="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Nombre completo</label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none"
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Identificación</label>
            <input
              name="identification"
              value={form.identification}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none"
              placeholder="1712345678"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Teléfono</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none"
              placeholder="0999999999"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Dirección</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none"
              placeholder="Quito, Ecuador"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none min-h-28"
              placeholder="Observaciones del cliente"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition"
          >
            {loading ? "Guardando..." : "Guardar cliente"}
          </button>
        </form>
      </div>
    </main>
  );
}
