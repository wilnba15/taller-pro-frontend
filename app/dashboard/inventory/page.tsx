"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createInventoryProduct,
  deactivateInventoryProduct,
  getInventoryProducts,
  getMyWorkshop,
  type InventoryProduct,
  type InventoryProductPayload,
  updateInventoryProduct,
} from "@/lib/api";

type ProductForm = {
  code: string;
  name: string;
  category: string;
  brand: string;
  stock: string;
  minimum_stock: string;
  cost: string;
  sale_price: string;
  is_active: boolean;
};

type ScannerMode = "search" | "form";

type ScannerInstance = {
  stop: () => Promise<void>;
  clear: () => void;
};

const emptyForm: ProductForm = {
  code: "",
  name: "",
  category: "",
  brand: "",
  stock: "0",
  minimum_stock: "0",
  cost: "0",
  sale_price: "0",
  is_active: true,
};

const money = (value: number) =>
  new Intl.NumberFormat("es-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>("search");
  const [startingScanner, setStartingScanner] = useState(false);
  const scannerRef = useRef<ScannerInstance | null>(null);
  const scanHandledRef = useRef(false);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const workshop = await getMyWorkshop();
      if (!workshop.inventory_enabled) {
        setAuthorized(false);
        setProducts([]);
        return;
      }

      setAuthorized(true);
      setProducts(
        await getInventoryProducts({
          search: search.trim() || undefined,
          low_stock: onlyLowStock,
          include_inactive: includeInactive,
        })
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el inventario"
      );
    } finally {
      setLoading(false);
    }
  }, [search, onlyLowStock, includeInactive]);

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, 250);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => undefined);
        scanner.clear();
      }
    };
  }, []);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.is_active && p.low_stock).length,
    [products]
  );

  function updateField(field: keyof ProductForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openNew(initialCode = "") {
    setEditingId(null);
    setForm({ ...emptyForm, code: initialCode });
    setShowForm(true);
    setMessage("");
    setError("");
  }

  function openEdit(product: InventoryProduct) {
    setEditingId(product.id);
    setForm({
      code: product.code || "",
      name: product.name,
      category: product.category || "",
      brand: product.brand || "",
      stock: String(product.stock),
      minimum_stock: String(product.minimum_stock),
      cost: String(product.cost),
      sale_price: String(product.sale_price),
      is_active: product.is_active,
    });
    setShowForm(true);
    setMessage("");
    setError("");
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        // Puede ocurrir si la cámara todavía no terminó de iniciar.
      }

      try {
        scanner.clear();
      } catch {
        // El contenedor puede haberse desmontado antes de limpiar.
      }
    }

    setScannerOpen(false);
    setStartingScanner(false);
  }

  async function processScannedCode(rawCode: string, mode: ScannerMode) {
    const code = rawCode.trim();
    if (!code || scanHandledRef.current) return;

    scanHandledRef.current = true;
    await stopScanner();
    setError("");

    if (mode === "form") {
      updateField("code", code);
      setMessage(`Código ${code} leído correctamente.`);
      return;
    }

    try {
      setSearch(code);
      const matches = await getInventoryProducts({
        search: code,
        include_inactive: true,
      });
      const exactProduct = matches.find(
        (product) => product.code?.trim() === code
      );

      if (exactProduct) {
        openEdit(exactProduct);
        setMessage(`Producto encontrado: ${exactProduct.name}.`);
      } else {
        openNew(code);
        setMessage(
          `El código ${code} no existe. Completa los datos para registrar el producto.`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo buscar el código escaneado"
      );
    }
  }

  async function startScanner(mode: ScannerMode) {
    setMessage("");
    setError("");
    setScannerMode(mode);
    setScannerOpen(true);
    setStartingScanner(true);
    scanHandledRef.current = false;

    window.setTimeout(async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );

        const scanner = new Html5Qrcode("inventory-barcode-reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => ({
              width: Math.floor(Math.min(300, viewfinderWidth * 0.86)),
              height: Math.floor(Math.min(150, viewfinderHeight * 0.42)),
            }),
            aspectRatio: 1.777778,
          },
          (decodedText) => {
            void processScannedCode(decodedText, mode);
          },
          () => {
            // Los intentos sin lectura son normales mientras se apunta la cámara.
          }
        );

        setStartingScanner(false);
      } catch (err) {
        scannerRef.current = null;
        setScannerOpen(false);
        setStartingScanner(false);
        setError(
          "No se pudo abrir la cámara. Verifica el permiso de cámara y abre SIADAUTO desde HTTPS."
        );
        console.error(err);
      }
    }, 100);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const payload: InventoryProductPayload = {
        code: form.code.trim() || null,
        name: form.name.trim(),
        category: form.category.trim() || null,
        brand: form.brand.trim() || null,
        stock: Math.max(0, Number(form.stock) || 0),
        minimum_stock: Math.max(0, Number(form.minimum_stock) || 0),
        cost: Math.max(0, Number(form.cost) || 0),
        sale_price: Math.max(0, Number(form.sale_price) || 0),
        is_active: form.is_active,
      };

      if (!payload.name) throw new Error("Ingresa el nombre del producto");

      if (editingId) {
        await updateInventoryProduct(editingId, payload);
        setMessage("Producto actualizado correctamente.");
      } else {
        await createInventoryProduct(payload);
        setMessage("Producto registrado correctamente.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(product: InventoryProduct) {
    if (!window.confirm(`¿Desactivar ${product.name}?`)) return;

    try {
      await deactivateInventoryProduct(product.id);
      setMessage("Producto desactivado correctamente.");
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar");
    }
  }

  if (authorized === false) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h1 className="text-2xl font-bold">Módulo no habilitado</h1>
          <p className="mt-2 text-amber-100/80">
            El inventario no está activo para este taller.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventario</h1>
            <p className="mt-1 text-slate-400">
              Repuestos y productos del taller.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void startScanner("search")}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-200 hover:bg-emerald-500/20"
            >
              📷 Escanear código
            </button>
            <button
              type="button"
              onClick={() => openNew()}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500"
            >
              + Nuevo producto
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Stat label="Productos mostrados" value={products.length} />
          <Stat label="Stock bajo" value={lowStockCount} warning />
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-[1fr_auto_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, código, categoría o marca"
            inputMode="search"
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
          />
          <Check
            label="Solo stock bajo"
            checked={onlyLowStock}
            onChange={setOnlyLowStock}
          />
          <Check
            label="Incluir inactivos"
            checked={includeInactive}
            onChange={setIncludeInactive}
          />
        </div>

        {message && <Notice text={message} success />}
        {error && <Notice text={error} />}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {editingId ? "Editar producto" : "Registrar producto"}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Nombre *"
                value={form.name}
                onChange={(value) => updateField("name", value)}
                required
              />

              <BarcodeField
                value={form.code}
                onChange={(value) => updateField("code", value)}
                onScan={() => void startScanner("form")}
              />

              <Field
                label="Categoría"
                value={form.category}
                onChange={(value) => updateField("category", value)}
              />
              <Field
                label="Marca"
                value={form.brand}
                onChange={(value) => updateField("brand", value)}
              />
              <Field
                label="Stock actual"
                type="number"
                value={form.stock}
                onChange={(value) => updateField("stock", value)}
              />
              <Field
                label="Stock mínimo"
                type="number"
                value={form.minimum_stock}
                onChange={(value) => updateField("minimum_stock", value)}
              />
              <Field
                label="Costo"
                type="number"
                value={form.cost}
                onChange={(value) => updateField("cost", value)}
              />
              <Field
                label="Precio de venta"
                type="number"
                value={form.sale_price}
                onChange={(value) => updateField("sale_price", value)}
              />
              <Check
                label="Producto activo"
                checked={form.is_active}
                onChange={(value) => updateField("is_active", value)}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-700 px-5 py-2.5 font-semibold hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          {loading ? (
            <div className="p-6 text-slate-400">Cargando inventario...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No hay productos.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/70 text-slate-200">
                <tr>
                  {[
                    "Producto",
                    "Categoría / Marca",
                    "Stock",
                    "Mínimo",
                    "Costo",
                    "Venta",
                    "Estado",
                    "Acciones",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-xs text-slate-500">
                        {product.code || "Sin código"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {product.category || "-"}
                      <div className="text-xs text-slate-500">
                        {product.brand || ""}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        product.low_stock ? "text-amber-300" : ""
                      }`}
                    >
                      {Number(product.stock).toLocaleString("es-US")}
                    </td>
                    <td className="px-4 py-3">
                      {Number(product.minimum_stock).toLocaleString("es-US")}
                    </td>
                    <td className="px-4 py-3">
                      {money(Number(product.cost))}
                    </td>
                    <td className="px-4 py-3">
                      {money(Number(product.sale_price))}
                    </td>
                    <td className="px-4 py-3">
                      {!product.is_active
                        ? "Inactivo"
                        : product.low_stock
                          ? "⚠️ Stock bajo"
                          : "Disponible"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-800"
                        >
                          Editar
                        </button>
                        {product.is_active && (
                          <button
                            type="button"
                            onClick={() => void deactivate(product)}
                            className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                          >
                            Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Escanear código</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Apunta la cámara al código de barras del repuesto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void stopScanner()}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div
              id="inventory-barcode-reader"
              className="min-h-64 overflow-hidden rounded-xl bg-black"
            />

            {startingScanner && (
              <p className="mt-3 text-center text-sm text-slate-400">
                Abriendo cámara...
              </p>
            )}

            <p className="mt-3 text-center text-xs text-slate-500">
              También puedes cerrar la cámara y escribir el código manualmente.
              {scannerMode === "search"
                ? " Si no existe, se abrirá el formulario de registro."
                : " El código leído se colocará en el formulario."}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function BarcodeField({
  value,
  onChange,
  onScan,
}: {
  value: string;
  onChange: (value: string) => void;
  onScan: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-slate-300">
        Código de barras o SKU
      </span>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Escribe o escanea el código"
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={onScan}
          className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 font-semibold text-emerald-200 hover:bg-emerald-500/20"
          title="Escanear con la cámara"
        >
          📷 Escanear
        </button>
      </div>
      <span className="mt-1.5 block text-xs text-slate-500">
        Puedes ingresarlo manualmente o leerlo con la cámara del celular.
      </span>
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function Stat({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        warning
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Notice({ text, success = false }: { text: string; success?: boolean }) {
  return (
    <div
      className={`mb-5 rounded-2xl border p-4 ${
        success
          ? "border-green-500/30 bg-green-500/10 text-green-200"
          : "border-red-500/30 bg-red-500/10 text-red-200"
      }`}
    >
      {text}
    </div>
  );
}
