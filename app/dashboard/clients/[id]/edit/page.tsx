"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Client = {
  id: number;
  workshop_id: number;
  full_name: string;
  identification: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

type FormData = {
  full_name: string;
  identification: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [form, setForm] = useState<FormData>({
    full_name: "",
    identification: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Client>(`/clients/${clientId}`)
      .then((client) => {
        setForm({
          full_name: client.full_name || "",
          identification: client.identification || "",
          phone: client.phone || "",
          email: client.email || "",
          address: client.address || "",
          notes: client.notes || "",
        });
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el cliente"
        )
      )
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        full_name: form.full_name.trim(),
        identification: form.identification.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      await apiFetch(`/clients/${clientId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      router.push("/dashboard/clients");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-3xl mx-auto">Cargando cliente...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Editar cliente</h1>
            <p className="text-slate-400 mt-1">
              Solo se puede editar si el cliente pertenece al taller autenticado.
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
            <label className="block text-sm mb-2">Nombre completo</label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none"
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
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Dirección</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 outline-none min-h-28"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </main>
  );
}
