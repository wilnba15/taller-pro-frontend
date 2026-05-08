"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  fuel_level: string;
  transmission: string;
  notes: string;
};

type InspectionNote = {
  zone: string;
  description: string;
};

const DEFAULT_WORKSHOP_ID = 1;

const FUEL_LEVEL_OPTIONS = [
  { value: "vacio", label: "Vacío" },
  { value: "un_cuarto", label: "1/4 tanque" },
  { value: "menos_de_medio", label: "Menos de medio tanque" },
  { value: "medio", label: "Medio tanque" },
  { value: "tres_cuartos", label: "3/4 tanque" },
  { value: "lleno", label: "Lleno" },
];

const VEHICLE_ZONES = [
  { id: "frontal", label: "Frontal", className: "left-[42%] top-[6%]" },
  { id: "capot", label: "Capot", className: "left-[43%] top-[20%]" },
  { id: "techo", label: "Techo", className: "left-[44%] top-[43%]" },
  { id: "posterior", label: "Posterior", className: "left-[40%] top-[80%]" },
  { id: "lateral_izquierdo", label: "Lateral izquierdo", className: "left-[8%] top-[43%]" },
  { id: "lateral_derecho", label: "Lateral derecho", className: "right-[8%] top-[43%]" },
  { id: "llanta_delantera_izquierda", label: "Llanta del. izq.", className: "left-[21%] top-[20%]" },
  { id: "llanta_delantera_derecha", label: "Llanta del. der.", className: "right-[21%] top-[20%]" },
  { id: "llanta_posterior_izquierda", label: "Llanta post. izq.", className: "left-[21%] top-[70%]" },
  { id: "llanta_posterior_derecha", label: "Llanta post. der.", className: "right-[21%] top-[70%]" },
];

function buildInspectionText(notes: InspectionNote[]) {
  if (notes.length === 0) return "";

  return [
    "INSPECCIÓN VISUAL DE INGRESO:",
    ...notes.map((item, index) => `${index + 1}. ${item.zone}: ${item.description}`),
  ].join("\n");
}

function buildFuelLevelText(fuelLevel: string) {
  if (!fuelLevel) return "";

  const selected = FUEL_LEVEL_OPTIONS.find((option) => option.value === fuelLevel);
  if (!selected) return "";

  return `NIVEL DE GASOLINA AL INGRESO: ${selected.label}`;
}

export default function NewVehiclePage() {
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_BASE;

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<VehicleForm>({
    client_id: "",
    plate: "",
    brand: "",
    model: "",
    year: "",
    color: "",
    mileage: "",
    fuel_type: "",
    fuel_level: "",
    transmission: "",
    notes: "",
  });

  const [inspectionNotes, setInspectionNotes] = useState<InspectionNote[]>([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [inspectionDescription, setInspectionDescription] = useState("");

  useEffect(() => {
    const loadClients = async () => {
      if (!api) {
        setError("Falta configurar NEXT_PUBLIC_API_BASE en .env.local");
        setLoadingClients(false);
        return;
      }

      try {
        setError("");
        const res = await fetch(`${api}/clients/`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("No se pudieron cargar los clientes");
        }

        const data: Client[] = await res.json();
        const filtered = data.filter(
          (client) => client.workshop_id === DEFAULT_WORKSHOP_ID
        );
        setClients(filtered);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los clientes.");
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, [api]);

  const selectedClient = useMemo(() => {
    return clients.find((client) => String(client.id) === form.client_id) || null;
  }, [clients, form.client_id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddInspectionNote = () => {
    if (!selectedZone || !inspectionDescription.trim()) return;

    setInspectionNotes((prev) => [
      ...prev,
      {
        zone: selectedZone,
        description: inspectionDescription.trim(),
      },
    ]);

    setSelectedZone("");
    setInspectionDescription("");
  };

  const handleRemoveInspectionNote = (index: number) => {
    setInspectionNotes((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!api) {
      setError("Falta configurar NEXT_PUBLIC_API_BASE en .env.local");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        workshop_id: DEFAULT_WORKSHOP_ID,
        client_id: Number(form.client_id),
        plate: form.plate.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        color: form.color.trim() || null,
        mileage: form.mileage ? Number(form.mileage) : null,
        fuel_type: form.fuel_type.trim() || null,
        transmission: form.transmission.trim() || null,
        notes:
          [form.notes.trim(), buildFuelLevelText(form.fuel_level), buildInspectionText(inspectionNotes)]
            .filter(Boolean)
            .join("\n\n") || null,
      };

      const res = await fetch(`${api}/vehicles/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || "No se pudo guardar el vehículo");
      }

      setSuccess("Vehículo guardado correctamente.");

      setTimeout(() => {
        router.push("/dashboard/vehicles");
        router.refresh();
      }, 900);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al guardar el vehículo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Nuevo vehículo</h1>
            <p className="text-slate-400 mt-1">
              Crea un vehículo y asígnalo a un cliente del taller.
            </p>
          </div>

          <Link
            href="/dashboard/vehicles"
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 transition"
          >
            ← Volver
          </Link>
        </div>

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

          <div>
            <label className="block text-sm mb-2 text-slate-200">Cliente</label>
            <select
              name="client_id"
              value={form.client_id}
              onChange={handleChange}
              required
              disabled={loadingClients || saving}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="">
                {loadingClients ? "Cargando clientes..." : "Selecciona un cliente"}
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name} — {client.phone}
                </option>
              ))}
            </select>
          </div>

          {selectedClient ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              Cliente seleccionado: <span className="font-semibold text-white">{selectedClient.full_name}</span>
              {" "}· CI/RUC: {selectedClient.identification} · Tel: {selectedClient.phone}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm mb-2 text-slate-200">Placa</label>
              <input
                name="plate"
                value={form.plate}
                onChange={handleChange}
                required
                placeholder="ABC-1234"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-slate-200">Año</label>
              <input
                name="year"
                type="number"
                value={form.year}
                onChange={handleChange}
                required
                placeholder="2020"
                min="1950"
                max="2100"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-slate-200">Marca</label>
              <input
                name="brand"
                value={form.brand}
                onChange={handleChange}
                required
                placeholder="Toyota"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-slate-200">Modelo</label>
              <input
                name="model"
                value={form.model}
                onChange={handleChange}
                required
                placeholder="Corolla"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-slate-200">Color</label>
              <input
                name="color"
                value={form.color}
                onChange={handleChange}
                placeholder="Blanco"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-slate-200">Kilometraje</label>
              <input
                name="mileage"
                type="number"
                value={form.mileage}
                onChange={handleChange}
                placeholder="125000"
                min="0"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-slate-200">Combustible</label>
              <select
                name="fuel_type"
                value={form.fuel_type}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Selecciona el tipo de combustible</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Diésel">Diésel</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Eléctrico">Eléctrico</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2 text-slate-200">Nivel de gasolina al ingreso</label>
              <select
                name="fuel_level"
                value={form.fuel_level}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">Selecciona el nivel</option>
                {FUEL_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Este dato quedará registrado como constancia en las notas del vehículo.
              </p>
            </div>

            <div>
              <label className="block text-sm mb-2 text-slate-200">Transmisión</label>
              <input
                name="transmission"
                value={form.transmission}
                onChange={handleChange}
                placeholder="Manual"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <section className="rounded-2xl border border-blue-500/20 bg-slate-950/60 p-5 space-y-5">
            <div>
              <h2 className="text-xl font-bold">🚗 Inspección visual de ingreso</h2>
              <p className="text-sm text-slate-400 mt-1">
                Marca las novedades visibles del vehículo al momento de recibirlo.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="relative min-h-[420px] rounded-3xl border border-slate-800 bg-slate-900 p-6 overflow-hidden">
                <div className="absolute inset-x-0 top-5 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
                  Vista superior del vehículo
                </div>

                <div className="absolute left-1/2 top-1/2 h-[330px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-[70px] border-2 border-slate-500 bg-slate-800 shadow-2xl">
                  <div className="absolute left-1/2 top-5 h-16 w-24 -translate-x-1/2 rounded-t-[40px] border border-slate-600 bg-slate-700" />
                  <div className="absolute left-1/2 top-[125px] h-24 w-24 -translate-x-1/2 rounded-3xl border border-slate-600 bg-slate-700" />
                  <div className="absolute left-1/2 bottom-6 h-16 w-24 -translate-x-1/2 rounded-b-[40px] border border-slate-600 bg-slate-700" />
                </div>

                {VEHICLE_ZONES.map((zone) => {
                  const hasNote = inspectionNotes.some((item) => item.zone === zone.label);
                  const isSelected = selectedZone === zone.label;

                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZone(zone.label)}
                      className={`absolute ${zone.className} rounded-full px-3 py-2 text-xs font-semibold shadow-lg transition-all duration-200 ${
                        isSelected
                          ? "bg-blue-500 text-white scale-105 shadow-blue-500/30"
                          : hasNote
                          ? "bg-emerald-500 text-white hover:bg-emerald-400"
                          : "bg-slate-700 text-slate-100 hover:bg-blue-600"
                      }`}
                    >
                      {zone.label}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-slate-200">Zona seleccionada</label>
                  <input
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    placeholder="Haz clic en una zona del vehículo"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-slate-200">Novedad encontrada</label>
                  <textarea
                    value={inspectionDescription}
                    onChange={(e) => setInspectionDescription(e.target.value)}
                    rows={4}
                    placeholder="Ej: Rayado puerta derecha delantera, sin llanta de emergencia..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddInspectionNote}
                  disabled={!selectedZone || !inspectionDescription.trim()}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  + Agregar novedad
                </button>

                <div className="space-y-3">
                  <h3 className="font-semibold">Novedades registradas</h3>

                  {inspectionNotes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                      Todavía no hay novedades visuales registradas.
                    </div>
                  ) : (
                    inspectionNotes.map((item, index) => (
                      <div
                        key={`${item.zone}-${index}`}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-blue-300">{item.zone}</p>
                            <p className="text-sm text-slate-300 mt-1">{item.description}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveInspectionNote(index)}
                            className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <div>
            <label className="block text-sm mb-2 text-slate-200">Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Observaciones iniciales del vehículo"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || loadingClients || clients.length === 0}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition font-medium"
            >
              {saving ? "Guardando..." : "Guardar vehículo"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
