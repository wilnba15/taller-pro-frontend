"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AdminWorkshop,
  changeAdminWorkshopStatus,
  createAdminWorkshop,
  getAdminWorkshops,
  getRole,
  updateAdminWorkshop,
} from "@/lib/api";

type FormData = {
  name: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
};

const emptyForm: FormData = {
  name: "",
  owner_name: "",
  phone: "",
  email: "",
  address: "",
  admin_name: "",
  admin_email: "",
  admin_password: "",
};

export default function AdminPage() {
  const [workshops, setWorkshops] = useState<AdminWorkshop[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadWorkshops = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAdminWorkshops();
      setWorkshops(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los talleres");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getRole() !== "superadmin") {
      window.location.href = "/dashboard";
      return;
    }
    loadWorkshops();
  }, [loadWorkshops]);

  function updateField(field: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openNewForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(workshop: AdminWorkshop) {
    setEditingId(workshop.id);
    setForm({
      name: workshop.name,
      owner_name: workshop.owner_name || "",
      phone: workshop.phone || "",
      email: workshop.email || "",
      address: workshop.address || "",
      admin_name: workshop.admin_name || "",
      admin_email: workshop.admin_email || "",
      admin_password: "",
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await updateAdminWorkshop(editingId, {
          name: form.name,
          owner_name: form.owner_name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          admin_name: form.admin_name,
          admin_email: form.admin_email,
          admin_password: form.admin_password || undefined,
        });
        setMessage("Taller actualizado correctamente.");
      } else {
        await createAdminWorkshop(form);
        setMessage("Taller y usuario creados correctamente.");
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await loadWorkshops();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(workshop: AdminWorkshop) {
    const nextStatus = workshop.status === "activo" ? "suspendido" : "activo";
    const action = nextStatus === "activo" ? "activar" : "suspender";

    if (!window.confirm(`¿Confirmas ${action} el taller ${workshop.name}?`)) return;

    try {
      setError("");
      setMessage("");
      await changeAdminWorkshopStatus(workshop.id, nextStatus);
      setMessage(`Taller ${nextStatus} correctamente.`);
      await loadWorkshops();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    }
  }

  const activeCount = workshops.filter((item) => item.status === "activo").length;
  const suspendedCount = workshops.filter((item) => item.status === "suspendido").length;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Administración SIADAUTO</h1>
            <p className="mt-1 text-slate-400">Crear y administrar talleres registrados.</p>
          </div>

          <button
            onClick={openNewForm}
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-500"
          >
            + Nuevo taller
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total</p>
            <p className="mt-1 text-3xl font-bold">{workshops.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Activos</p>
            <p className="mt-1 text-3xl font-bold">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Suspendidos</p>
            <p className="mt-1 text-3xl font-bold">{suspendedCount}</p>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingId ? "Editar taller" : "Registrar nuevo taller"}</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del taller *" value={form.name} onChange={(value) => updateField("name", value)} required />
              <Field label="Responsable *" value={form.owner_name} onChange={(value) => updateField("owner_name", value)} required />
              <Field label="Teléfono" value={form.phone} onChange={(value) => updateField("phone", value)} />
              <Field label="Correo del taller" type="email" value={form.email} onChange={(value) => updateField("email", value)} />
              <Field label="Dirección" value={form.address} onChange={(value) => updateField("address", value)} />

              <Field
                label="Nombre del usuario administrador *"
                value={form.admin_name}
                onChange={(value) => updateField("admin_name", value)}
                required
              />
              <Field
                label="Correo para ingresar *"
                type="email"
                value={form.admin_email}
                onChange={(value) => updateField("admin_email", value)}
                required
              />
              <Field
                label={editingId ? "Nueva contraseña (opcional)" : "Contraseña inicial *"}
                type="password"
                value={form.admin_password}
                onChange={(value) => updateField("admin_password", value)}
                required={!editingId}
                minLength={form.admin_password ? 6 : undefined}
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold transition hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-700 px-5 py-2.5 font-semibold transition hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          {loading ? (
            <div className="p-6 text-slate-400">Cargando talleres...</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/70 text-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Taller</th>
                  <th className="px-4 py-3 text-left">Responsable</th>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Configuración</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {workshops.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No hay talleres registrados.
                    </td>
                  </tr>
                ) : (
                  workshops.map((workshop) => (
                    <tr key={workshop.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-medium">{workshop.name}</td>
                      <td className="px-4 py-3 text-slate-300">
                        <div>{workshop.owner_name || "-"}</div>
                        <div className="text-xs text-slate-500">{workshop.phone || ""}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <div>{workshop.admin_name || "-"}</div>
                        <div className="text-xs text-slate-500">{workshop.admin_email || ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        {workshop.setup_completed ? (
                          <span className="text-green-300">✅ Completa</span>
                        ) : (
                          <span className="text-amber-300">⚠️ Incompleta</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={workshop.status === "activo" ? "text-green-300" : "text-red-300"}>
                          {workshop.status === "activo" ? "Activo" : "Suspendido"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditForm(workshop)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleStatus(workshop)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800"
                          >
                            {workshop.status === "activo" ? "Suspender" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-blue-500"
      />
    </label>
  );
}
