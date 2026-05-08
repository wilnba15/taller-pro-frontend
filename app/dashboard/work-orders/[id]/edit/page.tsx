"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type WorkOrder = {
  id: number;
  workshop_id: number;
  client_id: number;
  vehicle_id: number;
  entry_date: string;
  estimated_delivery_date?: string | null;
  status: "pendiente" | "en_proceso" | "finalizado" | "entregado";
  issue_description: string;
  diagnosis?: string | null;
  work_performed?: string | null;
  notes?: string | null;
  labor_cost: number | string;
  parts_cost: number | string;
};

type Client = {
  id: number;
  workshop_id: number;
  full_name: string;
  phone: string;
};

type Vehicle = {
  id: number;
  workshop_id: number;
  client_id: number;
  plate: string;
  brand: string;
  model: string;
};

type Photo = {
  id: number;
  work_order_id?: number;
  image_url: string;
  public_id?: string | null;
  created_at?: string;
};

type FormState = {
  workshop_id: number;
  client_id: number;
  vehicle_id: number;
  entry_date: string;
  estimated_delivery_date: string;
  status: WorkOrder["status"];
  issue_description: string;
  diagnosis: string;
  work_performed: string;
  notes: string;
  labor_cost: string;
  parts_cost: string;
};

type CostItem = {
  id: string;
  dbId?: number;
  type: "labor" | "part";
  description: string;
  quantity: string;
  unit_price: string;
};

type WorkOrderItemDB = {
  id: number;
  work_order_id: number;
  item_type: "repuesto" | "mano_obra" | string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
  created_at?: string;
};

const parseAmount = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return 0;

  const normalized = String(value)
    .trim()
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getAuthHeaders = (): HeadersInit => {
  if (typeof window === "undefined") return {};

  const token =
    localStorage.getItem("tallerpro_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("siadauto_token");

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
};

export default function EditWorkOrderPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE;
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");


  const normalizePhotosResponse = (data: any): Photo[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.photos)) return data.photos;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const requestFirstOk = async (
    urls: string[],
    options?: RequestInit
  ): Promise<Response | null> => {
    for (const url of urls) {
      try {
        const headers = new Headers(options?.headers);
        const authHeaders = getAuthHeaders();

        if (authHeaders instanceof Headers) {
          authHeaders.forEach((value, key) => headers.set(key, value));
        } else if (Array.isArray(authHeaders)) {
          authHeaders.forEach(([key, value]) => headers.set(key, value));
        } else {
          Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
        }

        const res = await fetch(url, {
          ...options,
          headers,
        });
        if (res.ok) return res;
      } catch {
        // probar siguiente URL
      }
    }
    return null;
  };

  const loadPhotos = async () => {
    if (!api || !orderId) return;

    const urls = [
      `${api}/work-orders/${orderId}/photos`,
      `${api}/work-order-photos/work-order/${orderId}`,
      `${api}/work-order-photos/?work_order_id=${orderId}`,
    ];

    const res = await requestFirstOk(urls, { cache: "no-store" });
    if (!res) return;

    const data = await res.json().catch(() => []);
    setPhotos(normalizePhotosResponse(data));
  };

  const [form, setForm] = useState<FormState>({
    workshop_id: 1,
    client_id: 0,
    vehicle_id: 0,
    entry_date: "",
    estimated_delivery_date: "",
    status: "pendiente",
    issue_description: "",
    diagnosis: "",
    work_performed: "",
    notes: "",
    labor_cost: "0",
    parts_cost: "0",
  });

  const [costItems, setCostItems] = useState<CostItem[]>([
    { id: "labor-initial", type: "labor", description: "Mano de obra", quantity: "1", unit_price: "0" },
    { id: "parts-initial", type: "part", description: "Repuestos", quantity: "1", unit_price: "0" },
  ]);

  const normalizeCostItemsResponse = (data: any): WorkOrderItemDB[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const mapDbItemToCostItem = (item: WorkOrderItemDB): CostItem => ({
    id: `db-${item.id}`,
    dbId: item.id,
    type: item.item_type === "mano_obra" ? "labor" : "part",
    description: item.description || "",
    quantity: String(item.quantity ?? "1"),
    unit_price: String(item.unit_price ?? "0"),
  });

  const buildItemPayload = (item: CostItem) => {
    const quantity = parseAmount(item.quantity);
    const unitPrice = parseAmount(item.unit_price);

    return {
      work_order_id: Number(orderId),
      item_type: item.type === "labor" ? "mano_obra" : "repuesto",
      description: item.description.trim(),
      quantity,
      unit_price: unitPrice,
      subtotal: quantity * unitPrice,
    };
  };

  const loadCostItems = async (order: WorkOrder) => {
    if (!api || !orderId) return;

    try {
      const data = await apiFetch<WorkOrderItemDB[]>(`/work-order-items/work-order/${orderId}`);
      const dbItems = normalizeCostItemsResponse(data);

      if (dbItems.length > 0) {
        setCostItems(dbItems.map(mapDbItemToCostItem));
        return;
      }
    } catch {
      // Si no existen ítems todavía, reconstruimos desde los costos guardados en la orden.
    }

    setCostItems([
      {
        id: "labor-initial",
        type: "labor",
        description: "Mano de obra registrada",
        quantity: "1",
        unit_price: String(order.labor_cost ?? "0"),
      },
      {
        id: "parts-initial",
        type: "part",
        description: "Repuestos registrados",
        quantity: "1",
        unit_price: String(order.parts_cost ?? "0"),
      },
    ]);
  };

  const isDelivered = form.status === "entregado";

  useEffect(() => {
    const load = async () => {
      try {
        if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");

        const [order, clientsData, vehiclesData] = await Promise.all([
          apiFetch<WorkOrder>(`/work-orders/${orderId}`),
          apiFetch<Client[]>("/clients/"),
          apiFetch<Vehicle[]>("/vehicles/"),
        ]);

        setClients(clientsData);
        setVehicles(vehiclesData);

        setForm({
          workshop_id: order.workshop_id,
          client_id: order.client_id,
          vehicle_id: order.vehicle_id,
          entry_date: order.entry_date || "",
          estimated_delivery_date: order.estimated_delivery_date || "",
          status: order.status,
          issue_description: order.issue_description || "",
          diagnosis: order.diagnosis || "",
          work_performed: order.work_performed || "",
          notes: order.notes || "",
          labor_cost: String(order.labor_cost ?? "0"),
          parts_cost: String(order.parts_cost ?? "0"),
        });

        await Promise.all([loadCostItems(order), loadPhotos()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar la orden");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api, orderId]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === Number(form.client_id)) || null,
    [clients, form.client_id]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === Number(form.vehicle_id)) || null,
    [vehicles, form.vehicle_id]
  );

  const costTotals = useMemo(() => {
    return costItems.reduce(
      (acc, item) => {
        const quantity = parseAmount(item.quantity);
        const unitPrice = parseAmount(item.unit_price);
        const subtotal = quantity * unitPrice;

        if (item.type === "labor") acc.labor += subtotal;
        if (item.type === "part") acc.parts += subtotal;

        return acc;
      },
      { labor: 0, parts: 0 }
    );
  }, [costItems]);

  const estimatedTotal = costTotals.labor + costTotals.parts;

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      labor_cost: costTotals.labor.toFixed(2),
      parts_cost: costTotals.parts.toFixed(2),
    }));
  }, [costTotals.labor, costTotals.parts]);

  const bars = useMemo(() => {
    const labor = costTotals.labor;
    const parts = costTotals.parts;
    const total = Math.max(labor + parts, 1);
    return {
      labor: `${Math.max((labor / total) * 100, labor > 0 ? 12 : 4)}%`,
      parts: `${Math.max((parts / total) * 100, parts > 0 ? 12 : 4)}%`,
    };
  }, [costTotals.labor, costTotals.parts]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "vehicle_id" || name === "workshop_id" || name === "client_id") {
      setForm((prev) => ({
        ...prev,
        [name]: Number(value),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const handleCostItemChange = (
    id: string,
    field: keyof CostItem,
    value: string
  ) => {
    setCostItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addCostItem = (type: CostItem["type"]) => {
    setCostItems((prev) => [
      ...prev,
      {
        id: `${type}-${Date.now()}`,
        type,
        description: "",
        quantity: "1",
        unit_price: "0",
      },
    ]);
  };

  const removeCostItem = async (item: CostItem) => {
    try {
      if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");

      if (item.dbId) {
        await apiFetch(`/work-order-items/${item.dbId}`, {
          method: "DELETE",
        });
      }

      setCostItems((prev) => prev.filter((row) => row.id !== item.id));
      setMessage("Ítem eliminado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el ítem");
    }
  };

  const saveCostItems = async () => {
    if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");

    let currentItems: WorkOrderItemDB[] = [];

    try {
      currentItems = normalizeCostItemsResponse(
        await apiFetch<WorkOrderItemDB[]>(`/work-order-items/work-order/${orderId}`)
      );
    } catch {
      currentItems = [];
    }

    await Promise.all(
      currentItems.map((item) =>
        apiFetch(`/work-order-items/${item.id}`, { method: "DELETE" })
      )
    );

    const validItems = costItems
      .map(buildItemPayload)
      .filter((item) => item.description && (item.quantity > 0 || item.unit_price > 0));

    await Promise.all(
      validItems.map((item) =>
        apiFetch("/work-order-items/", {
          method: "POST",
          body: JSON.stringify(item),
        })
      )
    );
  };


  const handleUploadPhoto = async (file: File | null) => {
    if (!file) return;

    try {
      if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");
      if (isDelivered) throw new Error("No se pueden agregar fotos a una orden entregada.");

      const cloudName =
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "di9wmi5rq";
      const uploadPreset =
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "tallerpro_upload";

      if (!cloudName || !uploadPreset) {
        throw new Error("Faltan variables de Cloudinary en el frontend.");
      }

      setUploadingPhoto(true);
      setPhotoError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const cloudinaryData = await cloudinaryRes.json();

      if (!cloudinaryRes.ok) {
        throw new Error(
          `${cloudinaryData?.error?.message || "No se pudo subir la imagen a Cloudinary"}. Preset usado: ${uploadPreset}`
        );
      }

      const imageUrl = cloudinaryData.secure_url;
      const publicId = cloudinaryData.public_id;

      const payload = {
        work_order_id: Number(orderId),
        image_url: imageUrl,
        public_id: publicId,
      };

      const saveUrls = [
        `${api}/work-orders/${orderId}/photos`,
        `${api}/work-order-photos/`,
      ];

      const saveRes = await requestFirstOk(saveUrls, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!saveRes) {
        throw new Error("La imagen subió a Cloudinary, pero no se pudo guardar en la orden.");
      }

      await loadPhotos();
      setMessage("Foto agregada correctamente.");
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    try {
      if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");
      if (isDelivered) throw new Error("No se pueden eliminar fotos de una orden entregada.");

      setPhotoError("");

      const deleteUrls = [
        `${api}/work-orders/${orderId}/photos/${photo.id}`,
        `${api}/work-order-photos/${photo.id}`,
      ];

      const res = await requestFirstOk(deleteUrls, {
        method: "DELETE",
      });

      if (!res) throw new Error("No se pudo eliminar la foto.");

      setPhotos((prev) => prev.filter((item) => item.id !== photo.id));
      setMessage("Foto eliminada correctamente.");
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Error al eliminar la foto");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");

      const payload = {
        client_id: form.client_id,
        vehicle_id: form.vehicle_id,
        entry_date: form.entry_date,
        estimated_delivery_date: form.estimated_delivery_date || null,
        status: form.status,
        issue_description: form.issue_description,
        diagnosis: form.diagnosis || null,
        work_performed: form.work_performed || null,
        notes: form.notes || null,
        labor_cost: Number(costTotals.labor.toFixed(2)),
        parts_cost: Number(costTotals.parts.toFixed(2)),
      };

      await apiFetch(`/work-orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await saveCostItems();

      setMessage("Orden e ítems actualizados correctamente");
      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndInvoice = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");

      const payload = {
        client_id: form.client_id,
        vehicle_id: form.vehicle_id,
        entry_date: form.entry_date,
        estimated_delivery_date: form.estimated_delivery_date || null,
        status: form.status,
        issue_description: form.issue_description,
        diagnosis: form.diagnosis || null,
        work_performed: form.work_performed || null,
        notes: form.notes || null,
        labor_cost: Number(costTotals.labor.toFixed(2)),
        parts_cost: Number(costTotals.parts.toFixed(2)),
      };

      await apiFetch(`/work-orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await saveCostItems();

      setMessage("Orden guardada. Generando factura...");

      const pdfRes = await fetch(`${api}/work-orders/invoice/${orderId}/pdf`, {
        headers: getAuthHeaders(),
      });

      if (!pdfRes.ok) {
        throw new Error("No se pudo generar la factura PDF");
      }

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");

      setTimeout(() => URL.revokeObjectURL(url), 60000);

      setTimeout(() => {
        setMessage("");
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al generar factura");
    } finally {
      setSaving(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!api) throw new Error("Falta NEXT_PUBLIC_API_BASE");
      if (!selectedClient) throw new Error("No se pudo identificar el cliente");
      if (!selectedVehicle) throw new Error("No se pudo identificar el vehículo");

      const payload = {
        client_id: form.client_id,
        vehicle_id: form.vehicle_id,
        entry_date: form.entry_date,
        estimated_delivery_date: form.estimated_delivery_date || null,
        status: form.status,
        issue_description: form.issue_description,
        diagnosis: form.diagnosis || null,
        work_performed: form.work_performed || null,
        notes: form.notes || null,
        labor_cost: Number(costTotals.labor.toFixed(2)),
        parts_cost: Number(costTotals.parts.toFixed(2)),
      };

      await apiFetch(`/work-orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await saveCostItems();

      const rawPhone = selectedClient.phone?.replace(/\D/g, "") || "";
      const finalPhone = rawPhone.startsWith("593")
        ? rawPhone
        : `593${rawPhone.replace(/^0/, "")}`;

      const whatsappMessage = `Hola ${selectedClient.full_name},

Le compartimos el estado de su Orden de Trabajo #${orderId}.

- Vehículo: ${selectedVehicle.brand} ${selectedVehicle.model}
- Placa: ${selectedVehicle.plate}

- Problema reportado:
${form.issue_description || "Sin información registrada"}

- Estado actual: ${form.status.replace("_", " ")}
- Total estimado: $${estimatedTotal.toFixed(2)}

Gracias por confiar en Taller PRO`;

      setMessage("Orden guardada. Abriendo WhatsApp...");
      window.open(
        `https://wa.me/${finalPhone}?text=${encodeURIComponent(whatsappMessage)}`,
        "_blank"
      );

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al enviar WhatsApp");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-white p-6">Cargando orden...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Editar orden #{orderId}</h1>
            <p className="text-slate-400 mt-1">
              Actualiza estado, diagnóstico, trabajo realizado, notas y costos.
            </p>
          </div>

          <Link
            href="/dashboard/work-orders"
            className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800 transition"
          >
            ← Volver
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr,0.9fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5"
          >
            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                {message}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Cliente</label>
                <input
                  type="text"
                  value={selectedClient ? `${selectedClient.full_name} (${selectedClient.phone})` : ""}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-300 outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Vehículo</label>
                <input
                  type="text"
                  value={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plate})` : ""}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-300 outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Fecha de ingreso</label>
                <input
                  type="date"
                  name="entry_date"
                  value={form.entry_date}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-300 outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Entrega estimada</label>
                <input
                  type="date"
                  name="estimated_delivery_date"
                  value={form.estimated_delivery_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Estado</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="entregado">Entregado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Problema reportado</label>
              <textarea
                name="issue_description"
                value={form.issue_description}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                required
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Diagnóstico</label>
                <textarea
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={handleChange}
                  rows={5}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Trabajo realizado</label>
                <textarea
                  name="work_performed"
                  value={form.work_performed}
                  onChange={handleChange}
                  rows={5}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notas</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              />
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Detalle económico tipo Excel</h2>
                  <p className="text-sm text-slate-400">
                    Agrega mano de obra y repuestos en filas. El total se calcula automáticamente.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addCostItem("labor")}
                    className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/20"
                  >
                    + Mano de obra
                  </button>
                  <button
                    type="button"
                    onClick={() => addCostItem("part")}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
                  >
                    + Repuesto
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-slate-900 text-slate-300">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium">Tipo</th>
                      <th className="px-3 py-3 text-left font-medium">Descripción</th>
                      <th className="px-3 py-3 text-right font-medium">Cant.</th>
                      <th className="px-3 py-3 text-right font-medium">V. unitario</th>
                      <th className="px-3 py-3 text-right font-medium">Subtotal</th>
                      <th className="px-3 py-3 text-center font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {costItems.map((item) => {
                      const subtotal = parseAmount(item.quantity) * parseAmount(item.unit_price);

                      return (
                        <tr key={item.id} className="bg-slate-950/70">
                          <td className="px-3 py-2">
                            <select
                              value={item.type}
                              onChange={(e) => handleCostItemChange(item.id, "type", e.target.value as CostItem["type"])}
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
                            >
                              <option value="labor">Mano de obra</option>
                              <option value="part">Repuesto</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleCostItemChange(item.id, "description", e.target.value)}
                              placeholder="Ej: Cambio de aceite, filtro, bujía..."
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => handleCostItemChange(item.id, "quantity", e.target.value)}
                              className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleCostItemChange(item.id, "unit_price", e.target.value)}
                              className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-right outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-100">
                            ${subtotal.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeCostItem(item)}
                              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <p className="text-xs text-slate-400">Mano de obra</p>
                  <p className="mt-1 text-xl font-bold">${costTotals.labor.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <p className="text-xs text-slate-400">Repuestos</p>
                  <p className="mt-1 text-xl font-bold">${costTotals.parts.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                  <p className="text-xs text-blue-200">Total orden</p>
                  <p className="mt-1 text-2xl font-bold">${estimatedTotal.toFixed(2)}</p>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Link
                href="/dashboard/work-orders"
                className="rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-800 transition"
              >
                Volver al listado
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 transition disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={handleSaveAndInvoice}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500 transition disabled:opacity-60"
              >
                {saving ? "Procesando..." : "🧾 Generar factura"}
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={saving}
                className="rounded-xl bg-green-600 px-5 py-3 font-medium hover:bg-green-500 transition disabled:opacity-60"
              >
                {saving ? "Procesando..." : "💬 Enviar por WhatsApp"}
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold">Resumen económico</h2>
              <p className="text-sm text-slate-400 mt-1">
                Vista rápida de costos y total estimado.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Mano de obra</span>
                    <span>${costTotals.labor.toFixed(2)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: bars.labor }} />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Repuestos</span>
                    <span>${costTotals.parts.toFixed(2)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: bars.parts }} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-4">
                  <p className="text-sm text-slate-400">Total estimado</p>
                  <p className="mt-2 text-3xl font-bold">${estimatedTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">📸 Fotos de la orden</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Registra evidencias del vehículo antes, durante y después del trabajo.
                  </p>
                </div>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">
                  {photos.length} foto{photos.length === 1 ? "" : "s"}
                </span>
              </div>

              {photoError ? (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {photoError}
                </div>
              ) : null}

              {isDelivered ? (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Esta orden está entregada. Las fotos quedan bloqueadas para mantener la trazabilidad.
                </div>
              ) : (
                <div className="mt-4">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:bg-blue-500 hover:shadow-blue-500/40 active:scale-95">
                    <span>📷</span>
                    <span>{uploadingPhoto ? "Subiendo..." : "Subir foto"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleUploadPhoto(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>

                  <p className="mt-2 text-xs text-slate-400">
                    JPG, PNG o WEBP desde cámara o galería.
                  </p>
                </div>
              )}

              <div className="mt-5">
                {photos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm text-slate-400">
                    Todavía no hay fotos registradas para esta orden.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        style={{
                          width: "120px",
                          maxWidth: "120px",
                          overflow: "hidden",
                          borderRadius: "12px",
                          border: "1px solid rgb(30, 41, 59)",
                          backgroundColor: "rgb(2, 6, 23)",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                        }}
                      >
                        <a
                          href={photo.image_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "block",
                            width: "120px",
                            height: "90px",
                            cursor: "zoom-in",
                            overflow: "hidden",
                          }}
                          title="Abrir foto en tamaño completo"
                        >
                          <img
                            src={photo.image_url}
                            alt={`Foto orden ${orderId}`}
                            style={{
                              width: "120px",
                              height: "90px",
                              maxWidth: "120px",
                              maxHeight: "90px",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </a>

                        <div style={{ padding: "6px" }}>
                          <p
                            style={{
                              fontSize: "10px",
                              color: "rgb(148, 163, 184)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              marginBottom: "6px",
                            }}
                          >
                            {photo.created_at
                              ? new Date(photo.created_at).toLocaleDateString("es-EC")
                              : "Foto registrada"}
                          </p>

                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo)}
                            disabled={isDelivered}
                            style={{
                              width: "100%",
                              borderRadius: "8px",
                              border: "1px solid rgba(239, 68, 68, 0.35)",
                              padding: "4px 6px",
                              fontSize: "11px",
                              color: "rgb(254, 202, 202)",
                              backgroundColor: "transparent",
                              cursor: isDelivered ? "not-allowed" : "pointer",
                              opacity: isDelivered ? 0.5 : 1,
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
