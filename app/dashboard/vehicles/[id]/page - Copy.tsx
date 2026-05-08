"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";

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

const WORKSHOP_CONFIG = {
  name: "ELECTROAUTO",
  slogan: "Laboratorio Automotriz",
  phone: "098-717-8172",
  address: "Av. Río Zamora y Ushimana (Sector Alangasí)",
  schedule: "Lunes a Viernes 07:30 - 17:30 | Sábados 08:30 - 14:00",
  logoText: "EA",
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

function generateReceptionPDF(vehicle: Vehicle, client: Client | null) {
  const doc = new jsPDF();
  const { generalNotes, inspectionText } = splitInspectionNotes(vehicle.notes);

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);

  doc.rect(12, 10, 186, 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(WORKSHOP_CONFIG.name, 18, 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(WORKSHOP_CONFIG.slogan, 18, 30);
  doc.text(WORKSHOP_CONFIG.schedule, 18, 36);
  doc.text(`Teléfono: ${WORKSHOP_CONFIG.phone}`, 125, 23);
  doc.text(`Dirección: ${WORKSHOP_CONFIG.address}`, 125, 30, { maxWidth: 65 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ACTA DE RECEPCIÓN DEL VEHÍCULO", 58, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-EC")}`, 14, 65);
  doc.text(`No. Vehículo: ${String(vehicle.id).padStart(6, "0")}`, 150, 65);

  doc.rect(12, 72, 186, 34);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del cliente", 16, 80);
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre: ${client?.full_name || "-"}`, 16, 89);
  doc.text(`CI/RUC: ${client?.identification || "-"}`, 16, 97);
  doc.text(`Teléfono: ${client?.phone || "-"}`, 108, 89);
  doc.text(`Email: ${client?.email || "-"}`, 108, 97);

  doc.rect(12, 112, 186, 40);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del vehículo", 16, 120);
  doc.setFont("helvetica", "normal");
  doc.text(`Placa: ${vehicle.plate || "-"}`, 16, 130);
  doc.text(`Marca: ${vehicle.brand || "-"}`, 16, 139);
  doc.text(`Modelo: ${vehicle.model || "-"}`, 74, 139);
  doc.text(`Año: ${vehicle.year || "-"}`, 140, 139);
  doc.text(`Color: ${vehicle.color || "-"}`, 16, 148);
  doc.text(`Kilometraje: ${vehicle.mileage ?? "-"}`, 74, 148);
  doc.text(`Combustible: ${vehicle.fuel_type || "-"}`, 140, 148);

  doc.rect(12, 158, 186, 46);
  doc.setFont("helvetica", "bold");
  doc.text("Observaciones generales", 16, 166);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(generalNotes || "-", 176), 16, 175);

  doc.rect(12, 210, 186, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Inspección visual de ingreso", 16, 218);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(inspectionText || "-", 176), 16, 227);

  doc.line(28, 278, 82, 278);
  doc.line(126, 278, 180, 278);
  doc.setFont("helvetica", "bold");
  doc.text("Firma Taller", 43, 286);
  doc.text("Firma Cliente", 140, 286);

  doc.save(`recepcion-vehiculo-${vehicle.plate || vehicle.id}.pdf`);
}

export default function VehicleDetailPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE;
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
        if (!api) throw new Error("Falta configurar NEXT_PUBLIC_API_BASE");
        if (!vehicleId) throw new Error("No se recibió el ID del vehículo");

        setLoading(true);
        setError("");

        const [vehicleRes, clientsRes] = await Promise.all([
          fetch(`${api}/vehicles/${vehicleId}`, { cache: "no-store" }),
          fetch(`${api}/clients/`, { cache: "no-store" }),
        ]);

        if (!vehicleRes.ok) throw new Error("No se pudo cargar el vehículo");
        if (!clientsRes.ok) throw new Error("No se pudieron cargar los clientes");

        const vehicleData: Vehicle = await vehicleRes.json();
        const clientsData: Client[] = await clientsRes.json();

        setVehicle(vehicleData);
        setClients(clientsData);

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
  }, [api, vehicleId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!api) throw new Error("Falta configurar NEXT_PUBLIC_API_BASE");
      if (!vehicle) throw new Error("No hay vehículo cargado");

      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        workshop_id: vehicle.workshop_id,
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

      const res = await fetch(`${api}/vehicles/${vehicle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.detail || "No se pudo actualizar el vehículo");

      setVehicle(data);
      setSuccess("Vehículo actualizado correctamente.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar cambios");
    } finally {
      setSaving(false);
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
                onClick={() => generateReceptionPDF(vehicle, selectedClient)}
                className="rounded-xl bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 transition"
              >
                📄 PDF recepción
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
