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

type CertificateInfo = {
  workshop_id: number;
  configured: boolean;
  subject: string;
  issuer: string;
  serial: string;
  valid_from: string;
  valid_to: string;
};

type ElectronicSignature = {
  id: number;
  workshop_id: number;
  invoice_id: number;
  electronic_document_id: number;
  certificate_subject: string;
  certificate_issuer: string;
  certificate_serial: string;
  valid_from: string;
  valid_to: string;
  signature_algorithm: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type SriSubmission = {
  id: number;
  workshop_id: number;
  invoice_id: number;
  electronic_signature_id: number;
  access_key: string;
  environment: string;
  reception_status?: string | null;
  reception_messages?: Array<{
    identificador?: string | null;
    mensaje?: string | null;
    informacion_adicional?: string | null;
    tipo?: string | null;
  }>;
  received_at?: string | null;
  authorization_status?: string | null;
  authorization_number?: string | null;
  authorization_date?: string | null;
  authorization_environment?: string | null;
  authorization_messages?: Array<{
    identificador?: string | null;
    mensaje?: string | null;
    informacion_adicional?: string | null;
    tipo?: string | null;
  }>;
  authorized_at?: string | null;
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
  const [sriError, setSriError] = useState("");
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [certificateError, setCertificateError] = useState("");
  const [signature, setSignature] = useState<ElectronicSignature | null>(null);
  const [sriSubmission, setSriSubmission] = useState<SriSubmission | null>(null);
  const [emitting, setEmitting] = useState(false);
  const [emitError, setEmitError] = useState("");
  const [emitMessage, setEmitMessage] = useState("");


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

        try {
          const cert = await apiFetch<CertificateInfo>(
            "/sri-signatures/certificate"
          );
          setCertificateInfo(cert);
          setCertificateError("");
        } catch (err) {
          setCertificateInfo(null);
          setCertificateError(
            err instanceof Error
              ? err.message
              : "No se pudo leer el certificado"
          );
        }

        try {
          const existingSignature = await apiFetch<ElectronicSignature>(
            `/sri-signatures/invoice/${invoiceId}`
          );
          setSignature(existingSignature);
        } catch {
          setSignature(null);
        }

        try {
          const existingSubmission = await apiFetch<SriSubmission>(
            `/sri-submissions/invoice/${invoiceId}`
          );
          setSriSubmission(existingSubmission);
        } catch {
          setSriSubmission(null);
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

  const openProtectedFile = async (
    path: string,
    fallbackMessage: string
  ) => {
    const base = getApiBase().replace(/\/$/, "");
    const token = getToken();

    if (!token) {
      throw new Error("Sesión no iniciada");
    }

    const response = await fetch(`${base}${path}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let message = fallbackMessage;

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

    window.open(url, "_blank", "noopener,noreferrer");

    window.setTimeout(
      () => URL.revokeObjectURL(url),
      60000
    );
  };

  const handleViewXml = async () => {
    setSriError("");

    try {
      await openProtectedFile(
        `/sri-documents/invoice/${invoiceId}/xml`,
        "No se pudo abrir el XML"
      );
    } catch (err) {
      setSriError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir el XML"
      );
    }
  };

  const handleViewSignedXml = async () => {
    setSriError("");

    try {
      await openProtectedFile(
        `/sri-signatures/invoice/${invoiceId}/xml`,
        "No se pudo abrir el XML firmado"
      );
    } catch (err) {
      setSriError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir el XML firmado"
      );
    }
  };

  const handleViewRide = async () => {
    setEmitError("");

    try {
      await openProtectedFile(
        `/sri-delivery/invoice/${invoiceId}/ride`,
        "No se pudo abrir el RIDE"
      );
    } catch (err) {
      setEmitError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir el RIDE"
      );
    }
  };

  const handleViewAuthorizedXml = async () => {
    setEmitError("");

    try {
      await openProtectedFile(
        `/sri-delivery/invoice/${invoiceId}/authorized-xml`,
        "No se pudo abrir el XML autorizado"
      );
    } catch (err) {
      setEmitError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir el XML autorizado"
      );
    }
  };

  const refreshElectronicState = async () => {
    try {
      const doc = await apiFetch<ElectronicDocument>(
        `/sri-documents/invoice/${invoiceId}`
      );
      setSriDocument(doc);
    } catch {
      setSriDocument(null);
    }

    try {
      const existingSignature = await apiFetch<ElectronicSignature>(
        `/sri-signatures/invoice/${invoiceId}`
      );
      setSignature(existingSignature);
    } catch {
      setSignature(null);
    }

    try {
      const existingSubmission = await apiFetch<SriSubmission>(
        `/sri-submissions/invoice/${invoiceId}`
      );
      setSriSubmission(existingSubmission);
      return existingSubmission;
    } catch {
      setSriSubmission(null);
      return null;
    }
  };

  const waitForAuthorization = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1800));

      const result = await apiFetch<SriSubmission>(
        `/sri-submissions/invoice/${invoiceId}/authorize`,
        { method: "POST" }
      );

      setSriSubmission(result);

      const state = result.authorization_status?.toUpperCase();

      if (
        state === "AUTORIZADO" ||
        result.status === "autorizada"
      ) {
        return result;
      }

      if (
        state === "NO AUTORIZADO" ||
        state === "RECHAZADO" ||
        result.status === "no_autorizada"
      ) {
        return result;
      }
    }

    return null;
  };

  const handleEmitInvoice = async () => {
    setEmitting(true);
    setEmitError("");
    setEmitMessage("");

    try {
      if (!certificateInfo?.configured) {
        throw new Error(
          "Configura primero el certificado electrónico del taller."
        );
      }

      const result = await apiFetch<{
        ok: boolean;
        stage: string;
        status: string;
        message: string;
        document?: ElectronicDocument;
        signature?: ElectronicSignature;
        submission?: SriSubmission;
      }>(
        `/sri-flow/invoice/${invoiceId}/emit`,
        { method: "POST" }
      );

      if (result.document) {
        setSriDocument(result.document);
      }

      if (result.signature) {
        setSignature(result.signature);
      }

      if (result.submission) {
        setSriSubmission(result.submission);
      }

      setEmitMessage(result.message || "");

      if (result.status === "procesando") {
        const finalResult = await waitForAuthorization();

        if (
          finalResult?.authorization_status?.toUpperCase() ===
            "AUTORIZADO" ||
          finalResult?.status === "autorizada"
        ) {
          setEmitMessage("Factura autorizada por el SRI.");
        }
      }

      await refreshElectronicState();
    } catch (err) {
      setEmitError(
        err instanceof Error
          ? err.message
          : "No se pudo emitir la factura electrónica"
      );

      await refreshElectronicState();
    } finally {
      setEmitting(false);
    }
  };

  const receptionOk = sriSubmission?.reception_status === "RECIBIDA";
  const authorizationOk =
    sriSubmission?.authorization_status?.toUpperCase() === "AUTORIZADO" ||
    sriSubmission?.status === "autorizada";

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

            <div
              className={`rounded-2xl border p-6 ${
                authorizationOk
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-blue-500/30 bg-blue-500/10"
              }`}
            >
              <p className="text-sm uppercase tracking-[0.14em] text-blue-200">
                🇪🇨 Facturación electrónica
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                {authorizationOk
                  ? "Factura autorizada"
                  : "Emitir factura electrónica"}
              </h2>

              {authorizationOk ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-emerald-400/20 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-300">Estado SRI</span>
                      <span className="font-bold text-emerald-300">
                        AUTORIZADO ✅
                      </span>
                    </div>

                    {sriSubmission?.authorization_number ? (
                      <div className="mt-4">
                        <p className="text-xs uppercase text-slate-500">
                          Número de autorización
                        </p>
                        <p className="mt-1 break-all font-mono text-sm text-emerald-200">
                          {sriSubmission.authorization_number}
                        </p>
                      </div>
                    ) : null}

                    {sriSubmission?.authorization_date ? (
                      <p className="mt-3 text-sm text-slate-300">
                        Fecha: {sriSubmission.authorization_date}
                      </p>
                    ) : null}

                    {sriSubmission?.authorization_environment ? (
                      <p className="mt-1 text-sm text-slate-300">
                        Ambiente: {sriSubmission.authorization_environment}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleViewRide}
                      className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500"
                    >
                      📄 Ver RIDE / PDF
                    </button>

                    <button
                      type="button"
                      onClick={handleViewAuthorizedXml}
                      className="rounded-xl border border-emerald-400/30 px-4 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-400/10"
                    >
                      📥 XML autorizado
                    </button>
                  </div>

                  <p className="text-xs text-emerald-100/70">
                    Comprobante procesado correctamente por el SRI.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <p className="text-sm leading-6 text-slate-300">
                    SIADAUTO generará el XML, lo firmará con el certificado
                    electrónico del taller, lo enviará al SRI y consultará su
                    autorización automáticamente.
                  </p>

                  <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">
                        Certificado electrónico
                      </span>
                      <span
                        className={
                          certificateInfo?.configured
                            ? "font-semibold text-emerald-300"
                            : "font-semibold text-red-300"
                        }
                      >
                        {certificateInfo?.configured
                          ? "Configurado ✅"
                          : "Pendiente"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">XML</span>
                      <span className="font-semibold text-slate-200">
                        {sriDocument ? "Generado ✅" : "Automático"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Firma</span>
                      <span className="font-semibold text-slate-200">
                        {signature ? "Firmado ✅" : "Automática"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">SRI</span>
                      <span className="font-semibold text-slate-200">
                        {sriSubmission?.authorization_status ||
                          sriSubmission?.reception_status ||
                          "Pendiente"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleEmitInvoice}
                    disabled={emitting || !certificateInfo?.configured}
                    className="w-full rounded-xl bg-blue-600 px-5 py-4 text-lg font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {emitting
                      ? "Emitiendo factura..."
                      : "🧾 Emitir factura electrónica"}
                  </button>

                  {!certificateInfo?.configured ? (
                    <p className="text-xs text-amber-200">
                      Configura el certificado electrónico en Perfil del Taller
                      antes de emitir.
                    </p>
                  ) : null}
                </div>
              )}

              {emitMessage && !emitError ? (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  {emitMessage}
                </div>
              ) : null}

              {emitError ? (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {emitError}
                </div>
              ) : null}

              {sriSubmission?.reception_messages?.length ? (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <p className="font-semibold text-amber-200">
                    Mensajes del SRI
                  </p>

                  <div className="mt-2 space-y-2 text-amber-100/90">
                    {sriSubmission.reception_messages.map(
                      (message, index) => (
                        <div
                          key={`${message.identificador || "msg"}-${index}`}
                        >
                          <p>
                            {message.identificador
                              ? `${message.identificador}: `
                              : ""}
                            {message.mensaje || "Mensaje del SRI"}
                          </p>

                          {message.informacion_adicional ? (
                            <p className="mt-1 text-xs text-amber-100/70">
                              {message.informacion_adicional}
                            </p>
                          ) : null}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : null}

              {sriSubmission?.authorization_messages?.length ? (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
                  <p className="font-semibold text-red-200">
                    Mensajes de autorización
                  </p>

                  <div className="mt-2 space-y-2 text-red-100/90">
                    {sriSubmission.authorization_messages.map(
                      (message, index) => (
                        <div
                          key={`${message.identificador || "auth"}-${index}`}
                        >
                          <p>
                            {message.identificador
                              ? `${message.identificador}: `
                              : ""}
                            {message.mensaje || "Mensaje del SRI"}
                          </p>

                          {message.informacion_adicional ? (
                            <p className="mt-1 text-xs text-red-100/70">
                              {message.informacion_adicional}
                            </p>
                          ) : null}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <details className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <summary className="cursor-pointer font-semibold text-slate-300">
                🔧 Detalles técnicos
              </summary>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3">
                  <span className="text-slate-400">XML SRI</span>
                  <span>{sriDocument?.status || "No generado"}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3">
                  <span className="text-slate-400">Firma</span>
                  <span>{signature?.status || "No firmada"}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3">
                  <span className="text-slate-400">Recepción SRI</span>
                  <span>
                    {sriSubmission?.reception_status || "Pendiente"}
                  </span>
                </div>

                {sriDocument ? (
                  <button
                    type="button"
                    onClick={handleViewXml}
                    className="w-full rounded-xl border border-slate-700 px-4 py-3 font-semibold hover:bg-slate-800"
                  >
                    Ver XML generado
                  </button>
                ) : null}

                {signature ? (
                  <button
                    type="button"
                    onClick={handleViewSignedXml}
                    className="w-full rounded-xl border border-slate-700 px-4 py-3 font-semibold hover:bg-slate-800"
                  >
                    Ver XML firmado
                  </button>
                ) : null}

                {sriError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                    {sriError}
                  </div>
                ) : null}

                {certificateError ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
                    {certificateError}
                  </div>
                ) : null}
              </div>
            </details>
          </aside>
        </div>
      </div>
    </main>
  );
}
