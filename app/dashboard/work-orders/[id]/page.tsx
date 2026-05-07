"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

/* ======== TYPES ======== */
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
  total: number | string;
  created_at?: string;
  updated_at?: string;
};

type Client = {
  id: number;
  full_name: string;
  phone: string;
  email?: string | null;
};

type Vehicle = {
  id: number;
  client_id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  mileage?: number | null;
};

type Photo = {
  id: number;
  work_order_id: number;
  image_url: string;
  created_at: string;
};

/* ======== HELPERS ======== */

function statusLabel(status: WorkOrder["status"]) {
  switch (status) {
    case "pendiente":
      return "Pendiente";
    case "en_proceso":
      return "En proceso";
    case "finalizado":
      return "Finalizado";
    case "entregado":
      return "Entregado";
    default:
      return status;
  }
}

function statusClasses(status: WorkOrder["status"]) {
  switch (status) {
    case "pendiente":
      return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
    case "en_proceso":
      return "bg-blue-500/15 text-blue-300 border border-blue-500/30";
    case "finalizado":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
    case "entregado":
      return "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border border-slate-500/30";
  }
}

function formatMoney(value: number | string) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

/* ======== WHATSAPP LOGIC ======== */

// limpiar teléfono
function formatPhone(phone: string) {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");

  // si empieza con 0 (Ecuador), reemplazar por 593
  if (cleaned.startsWith("0")) {
    cleaned = "593" + cleaned.slice(1);
  }

  return cleaned;
}

// construir mensaje
function buildWhatsAppMessage(
  order: WorkOrder,
  client: Client | null,
  vehicle: Vehicle | null
) {
  const problema = order.issue_description?.slice(0, 120) || "No especificado";

  return `Hola ${client?.full_name || "cliente"}, 👋

Le compartimos el estado de su Orden de Trabajo #${order.id}.

🚗 Vehículo: ${vehicle?.brand || ""} ${vehicle?.model || ""}
🔢 Placa: ${vehicle?.plate || "-"}

📋 Problema reportado:
${problema}

🔧 Estado actual: ${statusLabel(order.status)}
💰 Total estimado: ${formatMoney(order.total)}

Gracias por confiar en Taller PRO 🙌`;
}

export default function WorkOrderDetailPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE;
  const params = useParams<{ id: string }>();
  const workOrderId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const isDelivered = order?.status === "entregado";

  const loadData = async () => {
    if (!api || !workOrderId) return;

    const [orderRes, clientsRes, vehiclesRes] = await Promise.all([
      fetch(`${api}/work-orders/${workOrderId}`),
      fetch(`${api}/clients/`),
      fetch(`${api}/vehicles/`),
    ]);

    const orderData = await orderRes.json();
    const clientsData = await clientsRes.json();
    const vehiclesData = await vehiclesRes.json();

    setOrder(orderData);
    setClient(clientsData.find((c: Client) => c.id === orderData.client_id));
    setVehicle(vehiclesData.find((v: Vehicle) => v.id === orderData.vehicle_id));

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ======== ACTION ======== */

  const handleSendWhatsApp = () => {
    if (!client || !order) return;

    const phone = formatPhone(client.phone);
    const message = buildWhatsAppMessage(order, client, vehicle);

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  };

  if (loading || !order) {
    return <div className="p-6 text-white">Cargando...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between mb-6">
          <h1 className="text-2xl font-bold">Orden #{order.id}</h1>

          <div className="flex gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl"
            >
              📲 Enviar WhatsApp
            </button>

            <Link
              href="/dashboard/work-orders"
              className="border border-slate-600 px-4 py-2 rounded-xl"
            >
              Volver
            </Link>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="space-y-4">
          <p><b>Cliente:</b> {client?.full_name}</p>
          <p><b>Teléfono:</b> {client?.phone}</p>
          <p><b>Vehículo:</b> {vehicle?.brand} {vehicle?.model}</p>
          <p><b>Placa:</b> {vehicle?.plate}</p>
          <p><b>Estado:</b> {statusLabel(order.status)}</p>
          <p><b>Total:</b> {formatMoney(order.total)}</p>

          <div>
            <b>Problema:</b>
            <p className="text-slate-300">{order.issue_description}</p>
          </div>
        </div>
      </div>
    </main>
  );
}