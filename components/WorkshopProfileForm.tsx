"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  getMyWorkshop,
  updateMyWorkshop,
  uploadMyWorkshopLogo,
  type WorkshopProfile,
  type WorkshopProfileUpdate,
} from "@/lib/api";

type FormState = {
  name: string;
  business_name: string;
  ruc: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
  footer_text: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  business_name: "",
  ruc: "",
  owner_name: "",
  phone: "",
  email: "",
  address: "",
  logo_url: "",
  footer_text: "",
};

function profileToForm(profile: WorkshopProfile): FormState {
  return {
    name: profile.name || "",
    business_name: profile.business_name || "",
    ruc: profile.ruc || "",
    owner_name: profile.owner_name || "",
    phone: profile.phone || "",
    email: profile.email || "",
    address: profile.address || "",
    logo_url: profile.logo_url || "",
    footer_text: profile.footer_text || "",
  };
}

function toNullable(value: string) {
  const cleaned = value.trim();
  return cleaned || null;
}

export default function WorkshopProfileForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getMyWorkshop();
        setForm(profileToForm(profile));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el perfil del taller");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess("");
  }

  async function handleLogoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("El logo no puede superar los 3 MB.");
      return;
    }

    try {
      setUploadingLogo(true);
      setError("");
      setSuccess("");
      const updated = await uploadMyWorkshopLogo(file);
      setForm(profileToForm(updated));
      setSuccess("Logo cargado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload: WorkshopProfileUpdate = {
      name: form.name.trim(),
      business_name: toNullable(form.business_name),
      ruc: toNullable(form.ruc),
      owner_name: toNullable(form.owner_name),
      phone: toNullable(form.phone),
      email: toNullable(form.email),
      address: toNullable(form.address),
      logo_url: toNullable(form.logo_url),
      footer_text: toNullable(form.footer_text),
    };

    try {
      const updated = await updateMyWorkshop(payload);
      setForm(profileToForm(updated));
      setSuccess("Perfil del taller actualizado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el perfil del taller");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Cargando perfil del taller...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Identificación del taller</h2>
          <p className="mt-1 text-sm text-slate-400">Datos que identificarán al taller dentro de SIADAUTO y en sus documentos.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Nombre comercial" required value={form.name} onChange={(v) => updateField("name", v)} placeholder="Ej. ELECTROAUTO" />
          <Field label="Razón social" value={form.business_name} onChange={(v) => updateField("business_name", v)} placeholder="Nombre legal o razón social" />
          <Field label="RUC" value={form.ruc} onChange={(v) => updateField("ruc", v)} placeholder="Número de RUC" />
          <Field label="Propietario o responsable" value={form.owner_name} onChange={(v) => updateField("owner_name", v)} placeholder="Nombre del responsable" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Contacto operativo</h2>
          <p className="mt-1 text-sm text-slate-400">Información básica de contacto del taller.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Teléfono" value={form.phone} onChange={(v) => updateField("phone", v)} placeholder="Ej. 0987654321" />
          <Field label="Correo" type="email" value={form.email} onChange={(v) => updateField("email", v)} placeholder="correo@taller.com" />
          <div className="md:col-span-2">
            <Field label="Dirección" value={form.address} onChange={(v) => updateField("address", v)} placeholder="Dirección completa del taller" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Logo del taller</h2>
          <p className="mt-1 text-sm text-slate-400">Selecciona una imagen JPG, PNG o WEBP de máximo 3 MB.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoSelected}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingLogo ? "Cargando logo..." : form.logo_url ? "Cambiar logo" : "Seleccionar logo"}
            </button>

            <p className="text-sm text-slate-400">
              El archivo se carga automáticamente y queda guardado en el perfil del taller.
            </p>
          </div>

          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-4">
            {form.logo_url.trim() ? (
              <img src={form.logo_url} alt="Logo del taller" className="max-h-32 max-w-full object-contain" />
            ) : (
              <div className="text-center text-sm text-slate-500">
                <div className="mb-2 text-4xl">🏢</div>
                Vista previa del logo
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-300">Texto para el pie de los PDF</label>
            <textarea
              value={form.footer_text}
              onChange={(event) => updateField("footer_text", event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Ej. Gracias por confiar en nuestro taller."
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
            <div className="mt-1 text-right text-xs text-slate-500">{form.footer_text.length}/500</div>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{success}</div> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || uploadingLogo || !form.name.trim()}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email";
  required?: boolean;
};

function Field({ label, value, onChange, placeholder, type = "text", required = false }: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
        {required ? <span className="ml-1 text-red-400">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
      />
    </div>
  );
}
