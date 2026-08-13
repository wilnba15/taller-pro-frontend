"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, getApiBase, getToken } from "@/lib/api";

type InvoiceItem = {
  id: number;
  invoice_id: number;
  item_type: string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  discount: number | string;
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total: number | string;
  created_at: string;
};

type ElectronicDocument = {
  id: number;
  workshop_id: number;
  invoice_id: number;
  document_type: string;
  xml_version: string;
  environment: string;
  numeric_code: string;
  access_key: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Invoice = {
  id: number;
  workshop_id: number;
  work_order_id: number;
  client_id: number;
  establishment_code: string;
  emission_point_code: string;
  sequential: number;
  invoice_number: string;
  issue_date: string;
  client_name: string;
  client_identification: string;
  client_email?: string | null;
  client_address?: string | null;
  subtotal_0: number | string;
  subtotal_taxed: number | string;
  tax_amount: number | string;
  discount: number | string;
  total: number | string;
  status: string;
  created_at: string;
  updated_at: string;
  items: InvoiceItem[];
};

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const statusLabel = (status: string) => {
  if (status === "borrador") return "Borrador";
  return status.replaceAll("_", " ");
};

export default function BillingInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sriDocument, setSriDocument] = useState<ElectronicDocument | null>(null);
  const [generatingSri, setGeneratingSri] = useState(false);
  const [sriError, setSriError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        if (!invoiceId) throw new Error("Factura no válida");

        const data = await apiFetch<Invoice>(`/invoices/${invoiceId}`);
        setInvoice(data);

        try {
          const doc = await apiFetch<ElectronicDocument>(
            `/sri-documents/invoice/${invoiceId}`
          );
          setSriDocument(doc);
        } catch {
          setSriDocument(null);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar la factura"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [invoiceId]);

  const handleGenerateSriXml = async () => {
    setGeneratingSri(true);
    setSriError("");
    try {
      const doc = await apiFetch<ElectronicDocument>(
        `/sri-documents/invoice/${invoiceId}/generate`,
        { method: "POST" }
      );
      setSriDocument(doc);
    } catch (err) {
      setSriError(err instanceof Error ? err.message : "No se pudo generar el XML SRI");
    } finally {
      setGeneratingSri(false);
    }
  };

  const handleViewXml = async () => {
    setSriError("");

    try {
      const base = getApiBase().replace(/\/$/, "");
      const token = getToken();

      if (!token) {
        throw new Error("Sesión no iniciada");
      }

      const response = await fetch(
        `${base}/sri-documents/invoice/${invoiceId}/xml`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let message = "No se pudo abrir el XML";

        try {
          const data = await response.json();
          message = data?.detail || message;
        } catch {
          // La respuesta puede no ser JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      window.setTimeout(
        () => URL.revokeObjectURL(url),
        60000
      );
    } catch (err) {
      setSriError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir el XML"
      );
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-6xl">Cargando factura...</div>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            {error || "Factura no encontrada"}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
              Facturación SIADAUTO
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              🧾 Factura {invoice.invoice_number}
            </h1>
            <p className="mt-1 text-slate-400">
              Generada desde la OT #{invoice.work_order_id}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/work-orders/${invoice.work_order_id}/edit`}
              className="rounded-xl border border-slate-700 px-4 py-3 transition hover:bg-slate-800"
            >
              ← Volver a la OT
            </Link>
            <Link
              href="/dashboard/work-orders"
              className="rounded-xl bg-blue-600 px-4 py-3 font-medium transition hover:bg-blue-500"
            >
              Órdenes de trabajo
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr,0.8fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Datos del cliente</h2>
                  <p className="mt-1 text-slate-400">
                    Información congelada al momento de crear la factura.
                  </p>
                </div>

                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200">
                  {statusLabel(invoice.status)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Cliente
                  </p>
                  <p className="mt-2 font-semibold">{invoice.client_name}</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Identificación
                  </p>
                  <p className="mt-2 font-semibold">
                    {invoice.client_identification}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Email
                  </p>
                  <p className="mt-2">{invoice.client_email || "-"}</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Dirección
                  </p>
                  <p className="mt-2">{invoice.client_address || "-"}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 p-6">
                <h2 className="text-xl font-semibold">Detalle</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Repuestos y mano de obra copiados desde la orden.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[850px] w-full text-sm">
                  <thead className="bg-slate-800/70 text-slate-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Descripción</th>
                      <th className="px-4 py-3 text-right">Cant.</th>
                      <th className="px-4 py-3 text-right">V. unit.</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                      <th className="px-4 py-3 text-right">IVA</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-800"
                      >
                        <td className="px-4 py-3">
                          {item.item_type === "mano_obra"
                            ? "Mano de obra"
                            : "Repuesto"}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {Number(item.quantity).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {money(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {money(item.subtotal)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {money(item.tax_amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {money(item.total)}
                        </td>
                      </tr>
                    ))}

                    {invoice.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          Esta factura no tiene ítems.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
              <p className="text-sm text-blue-200">Número de factura</p>
              <p className="mt-2 text-2xl font-bold">
                {invoice.invoice_number}
              </p>
              <p className="mt-4 text-sm text-slate-300">
                Fecha de emisión: {invoice.issue_date}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Totales</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Subtotal tarifa 0%</span>
                  <span>{money(invoice.subtotal_0)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Subtotal gravado</span>
                  <span>{money(invoice.subtotal_taxed)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Descuento</span>
                  <span>{money(invoice.discount)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">IVA</span>
                  <span>{money(invoice.tax_amount)}</span>
                </div>

                <div className="my-4 border-t border-slate-700" />

                <div className="flex items-end justify-between gap-4">
                  <span className="text-lg font-semibold">TOTAL</span>
                  <span className="text-3xl font-bold">
                    {money(invoice.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <p className="text-sm uppercase tracking-[0.14em] text-emerald-200">
                🇪🇨 Comprobante electrónico SRI
              </p>
              <h2 className="mt-2 text-xl font-semibold">Sprint Facturación 2A</h2>

              {!sriDocument ? (
                <>
                  <p className="mt-4 text-sm text-slate-300">
                    Genera la clave de acceso y el XML SRI de esta factura.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateSriXml}
                    disabled={generatingSri}
                    className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {generatingSri ? "Generando..." : "🔐 Generar XML SRI"}
                  </button>
                </>
              ) : (
                <div className="mt-5 space-y-4 text-sm">
                  <div className="rounded-xl bg-slate-950/60 p-4">
                    <p className="text-xs uppercase text-slate-400">Ambiente</p>
                    <p className="mt-1 font-semibold uppercase">{sriDocument.environment}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950/60 p-4">
                    <p className="text-xs uppercase text-slate-400">Clave de acceso</p>
                    <p className="mt-2 break-all font-mono leading-6 text-emerald-100">
                      {sriDocument.access_key}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {sriDocument.access_key.length} dígitos
                    </p>
                  </div>
                  <div className="flex justify-between rounded-xl bg-slate-950/60 p-4">
                    <span>XML v{sriDocument.xml_version}</span>
                    <span className="font-semibold uppercase">{sriDocument.status}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleViewXml}
                    className="w-full rounded-xl border border-emerald-400/30 px-4 py-3 font-semibold hover:bg-emerald-400/10"
                  >
                    📄 Ver XML
                  </button>
                </div>
              )}

              {sriError ? (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {sriError}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
              <p className="font-semibold">Documento todavía no autorizado</p>
              <p className="mt-2 text-amber-100/80">
                En Sprint 2A generamos la clave de acceso y el XML. Todavía no
                firmamos electrónicamente ni enviamos el comprobante al SRI.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
