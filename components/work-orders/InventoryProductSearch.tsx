"use client";

import type { InventoryProduct } from "@/lib/api";

type Props = {
  itemId: string;
  searchValue: string;
  selectedProductId: string;
  products: InventoryProduct[];
  onSearchChange: (value: string) => void;
  onSelectProduct: (product: InventoryProduct) => void;
  onClearProduct: () => void;
};

export default function InventoryProductSearch({
  searchValue,
  selectedProductId,
  products,
  onSearchChange,
  onSelectProduct,
  onClearProduct,
}: Props) {
  const term = searchValue.trim().toLowerCase();

  const matches = term
    ? products
        .filter((product) =>
          [
            product.name,
            product.code || "",
            product.category || "",
            product.brand || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(term)
        )
        .slice(0, 12)
    : [];

  const selectedProduct = products.find(
    (product) => String(product.id) === selectedProductId
  );

  return (
    <div className="min-w-[300px]">
      <div className="relative">
        <input
          type="text"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar producto: ej. ace"
          autoComplete="off"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
        />

        {term && !selectedProductId ? (
          <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
{matches.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelectProduct(product)}
                className="block w-full border-b border-slate-800 px-3 py-2 text-left hover:bg-emerald-500/10"
              >
                <span className="block font-medium text-white">
                  {product.name}
                </span>
                <span className="block text-xs text-slate-400">
                  {product.code ? `${product.code} · ` : ""}
                  Stock {Number(product.stock).toLocaleString("es-US")} · Venta $
                  {Number(product.sale_price).toFixed(2)}
                </span>
              </button>
            ))}

            {matches.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-400">
                No hay productos que coincidan.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedProduct ? (
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-xs text-emerald-300">
            Stock disponible:{" "}
            {Number(selectedProduct.stock).toLocaleString("es-US")}
          </p>
          <button
            type="button"
            onClick={onClearProduct}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cambiar
          </button>
        </div>
      ) : null}
    </div>
  );
}
