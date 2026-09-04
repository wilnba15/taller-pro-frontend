"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  deleteMySriCertificate,
  getMySriCertificate,
  getMySriSettings,
  getMyWorkshop,
  updateMySriSettings,
  updateMyWorkshop,
  uploadMySriCertificate,
  uploadMyWorkshopLogo,
  type SriCertificateInfo,
  type SriSettings,
  type SriSettingsUpdate,
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


type SriFormState = {
  environment: "pruebas";
  establishment_code: string;
  emission_point_code: string;
  default_tax_rate: string;
  accounting_required: boolean;
  special_taxpayer_code: string;
  rimpe_type: string;
};

const EMPTY_SRI_FORM: SriFormState = {
  environment: "pruebas",
  establishment_code: "001",
  emission_point_code: "001",
  default_tax_rate: "15",
  accounting_required: false,
  special_taxpayer_code: "",
  rimpe_type: "",
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


function sriSettingsToForm(settings: SriSettings): SriFormState {
  return {
    environment: "pruebas",
    establishment_code: settings.establishment_code || "001",
    emission_point_code: settings.emission_point_code || "001",
    default_tax_rate: String(settings.default_tax_rate ?? 15),
    accounting_required: Boolean(settings.accounting_required),
    special_taxpayer_code: settings.special_taxpayer_code || "",
    rimpe_type: settings.rimpe_type || "",
  };
}

function toNullable(value: string) {
  const cleaned = value.trim();
  return cleaned || null;
}

export default function WorkshopProfileForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingSri, setSavingSri] = useState(false);
  const [sriForm, setSriForm] = useState<SriFormState>(EMPTY_SRI_FORM);
  const [sriCertificate, setSriCertificate] = useState<SriCertificateInfo | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [certificateError, setCertificateError] = useState("");
  const [certificateSuccess, setCertificateSuccess] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sriError, setSriError] = useState("");
  const [sriSuccess, setSriSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getMyWorkshop();
        setForm(profileToForm(profile));
        setBillingEnabled(Boolean(profile.billing_enabled));

        if (profile.billing_enabled) {
          const [sriSettings, certificateInfo] = await Promise.all([
            getMySriSettings(),
            getMySriCertificate(),
          ]);
          setSriForm(sriSettingsToForm(sriSettings));
          setSriCertificate(certificateInfo);
        } else {
          setSriForm(EMPTY_SRI_FORM);
          setSriCertificate(null);
        }
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

  function updateSriField<K extends keyof SriFormState>(
    field: K,
    value: SriFormState[K]
  ) {
    setSriForm((current) => ({ ...current, [field]: value }));
    setSriSuccess("");
  }

  async function handleSriSubmit() {
    setSavingSri(true);
    setSriError("");
    setSriSuccess("");

    const establishment = sriForm.establishment_code.trim();
    const emissionPoint = sriForm.emission_point_code.trim();
    const taxRate = Number(sriForm.default_tax_rate);

    if (!/^\d{3}$/.test(establishment)) {
      setSavingSri(false);
      setSriError("El establecimiento debe tener exactamente 3 dígitos.");
      return;
    }

    if (!/^\d{3}$/.test(emissionPoint)) {
      setSavingSri(false);
      setSriError("El punto de emisión debe tener exactamente 3 dígitos.");
      return;
    }

    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      setSavingSri(false);
      setSriError("La tarifa de IVA no es válida.");
      return;
    }

    const payload: SriSettingsUpdate = {
      environment: "pruebas",
      establishment_code: establishment,
      emission_point_code: emissionPoint,
      default_tax_rate: taxRate,
      accounting_required: sriForm.accounting_required,
      special_taxpayer_code: toNullable(sriForm.special_taxpayer_code),
      rimpe_type: toNullable(sriForm.rimpe_type),
    };

    try {
      const updated = await updateMySriSettings(payload);
      setSriForm(sriSettingsToForm(updated));
      setSriSuccess("Configuración SRI actualizada correctamente.");
    } catch (err) {
      setSriError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la configuración SRI"
      );
    } finally {
      setSavingSri(false);
    }
  }

  async function handleCertificateUpload() {
    setCertificateError("");
    setCertificateSuccess("");

    if (!certificateFile) {
      setCertificateError("Selecciona un archivo .p12.");
      return;
    }

    if (!certificatePassword) {
      setCertificateError("Ingresa la contraseña del certificado.");
      return;
    }

    try {
      setUploadingCertificate(true);

      const updated = await uploadMySriCertificate(
        certificateFile,
        certificatePassword
      );

      setSriCertificate(updated);
      setCertificateFile(null);
      setCertificatePassword("");
      setCertificateSuccess(
        "Certificado electrónico configurado correctamente."
      );
    } catch (err) {
      setCertificateError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el certificado"
      );
    } finally {
      setUploadingCertificate(false);
    }
  }

  async function handleCertificateDelete() {
    const confirmed = window.confirm(
      "¿Deseas eliminar el certificado electrónico configurado para este taller?"
    );

    if (!confirmed) return;

    setCertificateError("");
    setCertificateSuccess("");

    try {
      setUploadingCertificate(true);
      await deleteMySriCertificate();
      setSriCertificate({ configured: false });
      setCertificateFile(null);
      setCertificatePassword("");
      setCertificateSuccess("Certificado eliminado correctamente.");
    } catch (err) {
      setCertificateError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el certificado"
      );
    } finally {
      setUploadingCertificate(false);
    }
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

      {billingEnabled ? (
        <>
      <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6 shadow-lg">
          <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
            🇪🇨 Facturación electrónica
          </p>
          <h2 className="mt-2 text-xl font-semibold">Configuración SRI</h2>
          <p className="mt-1 text-sm text-slate-300">
            Estos datos se usarán para generar los comprobantes electrónicos del taller.
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Ambiente
              </label>
              <input
                value="PRUEBAS"
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-emerald-300 opacity-80"
              />
              <p className="mt-1 text-xs text-slate-500">
                Producción permanece bloqueado durante esta etapa.
              </p>
            </div>

            <Field
              label="Código de establecimiento"
              required
              value={sriForm.establishment_code}
              onChange={(v) =>
                updateSriField(
                  "establishment_code",
                  v.replace(/\D/g, "").slice(0, 3)
                )
              }
              placeholder="Ej. 004"
            />

            <Field
              label="Punto de emisión"
              required
              value={sriForm.emission_point_code}
              onChange={(v) =>
                updateSriField(
                  "emission_point_code",
                  v.replace(/\D/g, "").slice(0, 3)
                )
              }
              placeholder="Ej. 001"
            />

            <Field
              label="IVA por defecto (%)"
              required
              value={sriForm.default_tax_rate}
              onChange={(v) => updateSriField("default_tax_rate", v)}
              placeholder="15"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Obligado a llevar contabilidad
              </label>
              <select
                value={sriForm.accounting_required ? "si" : "no"}
                onChange={(event) =>
                  updateSriField(
                    "accounting_required",
                    event.target.value === "si"
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>

            <Field
              label="Código contribuyente especial"
              value={sriForm.special_taxpayer_code}
              onChange={(v) => updateSriField("special_taxpayer_code", v)}
              placeholder="Opcional"
            />

            <Field
              label="Régimen RIMPE"
              value={sriForm.rimpe_type}
              onChange={(v) => updateSriField("rimpe_type", v)}
              placeholder="Opcional"
            />
          </div>

          {sriError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {sriError}
            </div>
          ) : null}

          {sriSuccess ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {sriSuccess}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSriSubmit}
              disabled={savingSri}
              className="rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSri ? "Guardando SRI..." : "💾 Guardar configuración SRI"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-6 shadow-lg">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-300">
            🔐 Firma electrónica
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Certificado electrónico del taller
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Cada taller utiliza su propio archivo .p12 para firmar sus comprobantes.
          </p>
        </div>

        {sriCertificate?.configured ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="font-semibold text-emerald-300">
                Certificado configurado ✅
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Archivo: {sriCertificate.filename || "-"}
              </p>
              <p className="mt-1 break-words text-sm text-slate-300">
                Titular: {sriCertificate.certificate_subject || "-"}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Vigencia hasta:{" "}
                {sriCertificate.valid_to
                  ? new Date(sriCertificate.valid_to).toLocaleDateString("es-EC")
                  : "-"}
              </p>
            </div>

            <p className="text-sm text-slate-400">
              Puedes reemplazar el certificado cargando un nuevo archivo .p12.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Este taller todavía no tiene un certificado electrónico propio configurado.
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Archivo .p12
            </label>
            <input
              type="file"
              accept=".p12,application/x-pkcs12"
              onChange={(event) => {
                setCertificateFile(event.target.files?.[0] || null);
                setCertificateError("");
                setCertificateSuccess("");
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-semibold file:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Contraseña del certificado
            </label>
            <input
              type="password"
              value={certificatePassword}
              onChange={(event) => {
                setCertificatePassword(event.target.value);
                setCertificateError("");
                setCertificateSuccess("");
              }}
              autoComplete="new-password"
              placeholder="Contraseña del archivo .p12"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-violet-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              La contraseña no se muestra después de guardar.
            </p>
          </div>
        </div>

        {certificateError ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {certificateError}
          </div>
        ) : null}

        {certificateSuccess ? (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {certificateSuccess}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {sriCertificate?.configured ? (
            <button
              type="button"
              onClick={handleCertificateDelete}
              disabled={uploadingCertificate}
              className="rounded-xl border border-red-500/40 px-5 py-3 font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
            >
              Eliminar certificado
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleCertificateUpload}
            disabled={uploadingCertificate}
            className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadingCertificate
              ? "Guardando certificado..."
              : sriCertificate?.configured
              ? "🔄 Reemplazar certificado"
              : "🔐 Guardar certificado"}
          </button>
        </div>
      </section>
        </>
      ) : null}

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
