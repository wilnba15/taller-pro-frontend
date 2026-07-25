"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";
import { apiFetch, getMyWorkshop, type WorkshopProfile } from "@/lib/api";

type Vehicle = {
  id: number;
  workshop_id: number;
  client_id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  mileage?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  notes?: string | null;
  created_at?: string;
};

type Client = {
  id: number;
  workshop_id: number;
  full_name: string;
  identification: string;
  phone: string;
  email?: string | null;
};

type VehicleForm = {
  client_id: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  mileage: string;
  fuel_type: string;
  transmission: string;
  notes: string;
};

function splitInspectionNotes(notes?: string | null) {
  if (!notes) return { generalNotes: "", inspectionText: "" };

  const marker = "INSPECCIÓN VISUAL DE INGRESO:";
  const index = notes.indexOf(marker);

  if (index === -1) return { generalNotes: notes, inspectionText: "" };

  return {
    generalNotes: notes.slice(0, index).trim(),
    inspectionText: notes.slice(index).trim(),
  };
}

async function imageUrlToDataUrl(url?: string | null) {
  if (!url) return null;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("No se pudo leer el logo"));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generateReceptionPDF(
  vehicle: Vehicle,
  client: Client | null,
  workshop: WorkshopProfile | null
) {
  const doc = new jsPDF();
  const { generalNotes, inspectionText } = splitInspectionNotes(vehicle.notes);
  const logoDataUrl = await imageUrlToDataUrl(workshop?.logo_url);

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.rect(12, 10, 186, 46);

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "AUTO", 17, 15, 34, 30, undefined, "FAST");
    } catch {
      // El documento continúa aunque el formato del logo no sea compatible.
    }
  }

  const workshopName = workshop?.name || "Taller";
  const identityX = logoDataUrl ? 58 : 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(workshopName, identityX, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  let identityY = 26;

  if (workshop?.business_name && workshop.business_name !== workshopName) {
    doc.text(workshop.business_name, identityX, identityY);
    identityY += 5;
  }

  if (workshop?.ruc) {
    doc.text(`RUC: ${workshop.ruc}`, identityX, identityY);
    identityY += 5;
  }

  const contact = [workshop?.phone, workshop?.email]
    .filter(Boolean)
    .join(" · ");

  if (contact) {
    doc.text(contact, identityX, identityY, { maxWidth: 132 });
    identityY += 5;
  }

  if (workshop?.address) {
    doc.text(workshop.address, identityX, identityY, { maxWidth: 132 });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ACTA DE RECEPCIÓN DEL VEHÍCULO", 55, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-EC")}`, 14, 78);
  doc.text(`No. Vehículo: ${String(vehicle.id).padStart(6, "0")}`, 150, 78);

  doc.rect(12, 84, 186, 34);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del cliente", 16, 92);
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre: ${client?.full_name || "-"}`, 16, 101);
  doc.text(`CI/RUC: ${client?.identification || "-"}`, 16, 109);
  doc.text(`Teléfono: ${client?.phone || "-"}`, 108, 101);
  doc.text(`Email: ${client?.email || "-"}`, 108, 109);

  doc.rect(12, 124, 186, 40);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del vehículo", 16, 132);
  doc.setFont("helvetica", "normal");
  doc.text(`Placa: ${vehicle.plate || "-"}`, 16, 142);
  doc.text(`Marca: ${vehicle.brand || "-"}`, 16, 151);
  doc.text(`Modelo: ${vehicle.model || "-"}`, 74, 151);
  doc.text(`Año: ${vehicle.year || "-"}`, 140, 151);
  doc.text(`Color: ${vehicle.color || "-"}`, 16, 160);
  doc.text(`Kilometraje: ${vehicle.mileage ?? "-"}`, 74, 160);
  doc.text(`Combustible: ${vehicle.fuel_type || "-"}`, 140, 160);

  doc.rect(12, 170, 186, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Observaciones generales", 16, 178);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(generalNotes || "-", 176), 16, 187);

  doc.rect(12, 218, 186, 38);
  doc.setFont("helvetica", "bold");
  doc.text("Inspección visual de ingreso", 16, 226);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(inspectionText || "-", 176), 16, 235);

  doc.line(28, 273, 82, 273);
  doc.line(126, 273, 180, 273);
  doc.setFont("helvetica", "bold");
  doc.text("Firma Taller", 43, 281);
  doc.text("Firma Cliente", 140, 281);

  if (workshop?.footer_text) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const footerLines = doc.splitTextToSize(workshop.footer_text, 176);
    doc.text(footerLines, 105, 291, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`recepcion-vehiculo-${vehicle.plate || vehicle.id}.pdf`);
}

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const vehicleId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [workshop, setWorkshop] = useState<WorkshopProfile | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [form, setForm] = useState<VehicleForm>({
    client_id: "",
    plate: "",
    brand: "",
    model: "",
    year: "",
    color: "",
    mileage: "",
    fuel_type: "",
    transmission: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedClient = useMemo(() => {
    return clients.find((client) => String(client.id) === form.client_id) || null;
  }, [clients, form.client_id]);

  const inspection = splitInspectionNotes(form.notes);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!vehicleId) throw new Error("No se recibió el ID del vehículo");

        setLoading(true);
        setError("");

        const [vehicleData, clientsData, workshopData] = await Promise.all([
          apiFetch<Vehicle>(`/vehicles/${vehicleId}`),
          apiFetch<Client[]>("/clients/"),
          getMyWorkshop(),
        ]);

        setVehicle(vehicleData);
        setClients(clientsData);
        setWorkshop(workshopData);

        setForm({
          client_id: String(vehicleData.client_id),
          plate: vehicleData.plate || "",
          brand: vehicleData.brand || "",
          model: vehicleData.model || "",
          year: String(vehicleData.year || ""),
          color: vehicleData.color || "",
          mileage: vehicleData.mileage != null ? String(vehicleData.mileage) : "",
          fuel_type: vehicleData.fuel_type || "",
          transmission: vehicleData.transmission || "",
          notes: vehicleData.notes || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar vehículo");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [vehicleId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!vehicle) throw new Error("No hay vehículo cargado");

      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        client_id: vehicle.client_id,
        plate: form.plate.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        color: form.color.trim() || null,
        mileage: form.mileage ? Number(form.mileage) : null,
        fuel_type: form.fuel_type.trim() || null,
        transmission: form.transmission.trim() || null,
        notes: form.notes.trim() || null,
      };

      const data = await apiFetch<Vehicle>(`/vehicles/${vehicle.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setVehicle(data);
      setSuccess("Vehículo actualizado correctamente.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleReceptionPdf = async () => {
    if (!vehicle) return;

    try {
      setPdfLoading(true);
      setError("");
      await generateReceptionPDF(vehicle, selectedClient, workshop);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo generar el PDF de recepción"
      );
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-white p-6">Cargando vehículo...</main>;
  }

  if (error && !vehicle) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-4xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Vehículo {vehicle?.plate}</h1>
            <p className="text-slate-400 mt-1">
              Detalle, edición y acta de recepción del vehículo.
            </p>
          </div>

          <div className="flex gap-3">
            {vehicle ? (
              <button
                type="button"
                onClick={handleReceptionPdf}
                disabled={pdfLoading}
                className="rounded-xl bg-emerald-600 px-4 py-2 font-medium transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pdfLoading ? "Generando PDF..." : "📄 PDF recepción"}
              </button>
            ) : null}

            <Link
              href="/dashboard/vehicles"
              className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-900 transition"
            >
              ← Volver
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300">
            {success}
          </div>
        ) : null}

        <form onSubmit={handleSave} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-4">Datos principales</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm mb-2 text-slate-200">Cliente</label>
                <select
                  name="client_id"
                  value={form.client_id}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-300 outline-none opacity-80"
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name} — {client.phone}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  El cliente queda bloqueado para mantener la trazabilidad del vehículo.
                </p>
              </div>

              {[
                ["plate", "Placa", "text"],
                ["brand", "Marca", "text"],
                ["model", "Modelo", "text"],
                ["year", "Año", "number"],
                ["color", "Color", "text"],
                ["mileage", "Kilometraje", "number"],
                ["fuel_type", "Combustible", "text"],
                ["transmission", "Transmisión", "text"],
              ].map(([name, label, type]) => (
                <div key={name}>
                  <label className="block text-sm mb-2 text-slate-200">{label}</label>
                  <input
                    name={name}
                    type={type}
                    value={form[name as keyof VehicleForm]}
                    onChange={handleChange}
                    required={["plate", "brand", "model", "year"].includes(name)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-xl font-bold">Inspección visual guardada</h2>
            <p className="text-sm text-slate-400 mt-1">
              Esta información se guarda dentro de las notas del vehículo.
            </p>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4 whitespace-pre-wrap text-sm text-slate-300">
              {inspection.inspectionText || "Sin inspección visual registrada."}
            </div>
          </section>

          <div>
            <label className="block text-sm mb-2 text-slate-200">Notas completas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={10}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition font-medium"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
