"use client";

import { useCart, type CartProduct } from "@/hooks/useCart";

interface ProductCardProps {
  product: CartProduct;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  const {
    addItem,
    getItemQuantity,
    getAvailableStock,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  /* =======================================================
     Cantidad actual en la cesta
  ======================================================= */

  const quantity = getItemQuantity(
    product.id,
  );

  /* =======================================================
     Stock realmente disponible

     Este valor debe considerar posteriormente:
     stock Firebase - stock reservado.
  ======================================================= */

  const availableStock =
    getAvailableStock(product);

  const hasStock =
    product.activo === true &&
    availableStock > 0;

  /* =======================================================
     Imagen

     imgPath puede contener:
     - URL de Firebase Storage
     - ruta local de respaldo
     - valor vacío

     La carpeta public/images/products queda
     únicamente como respaldo.
  ======================================================= */

  const imageSource =
    product.imgPath &&
    product.imgPath.trim() !== ""
      ? product.imgPath
      : "/images/products/placeholder.jpg";

  /* =======================================================
     Agregar producto
  ======================================================= */

  const handleAdd = () => {
    if (!hasStock) {
      return;
    }

    addItem(product, 1);
  };

  /* =======================================================
     Render
  ======================================================= */

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      {/* =================================================
          Imagen
      ================================================= */}

      <div className="relative aspect-square overflow-hidden bg-[var(--surface)]">
        <img
          src={imageSource}
          alt={product.nombre}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            const image =
              event.currentTarget;

            /*
             * Evita un ciclo infinito si incluso
             * el placeholder no existe.
             */
            if (
              image.src.endsWith(
                "/images/products/placeholder.jpg",
              )
            ) {
              return;
            }

            image.src =
              "/images/products/placeholder.jpg";
          }}
        />

        {/* =================================================
            Categoría
        ================================================= */}

        {product.categoria && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--background)]/90 px-3 py-1 text-xs font-medium text-[var(--primary)] shadow-sm backdrop-blur">
            {product.categoria}
          </span>
        )}

        {/* =================================================
            Código
        ================================================= */}

        {product.code && (
          <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
            {product.code}
          </span>
        )}

        {/* =================================================
            No Stock
        ================================================= */}

        {!hasStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="rounded-lg bg-[var(--background)] px-4 py-2 text-sm font-bold text-[var(--danger)] shadow-lg">
              No Stock
            </span>
          </div>
        )}
      </div>

      {/* =================================================
          Información
      ================================================= */}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          {/* Nombre */}

          <h2 className="text-base font-bold text-[var(--foreground)]">
            {product.nombre}
          </h2>

          {/* Descripción */}

          {product.descripcion && (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--muted)]">
              {product.descripcion}
            </p>
          )}

          {/* Precio */}

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-[var(--primary)]">
                {formatPrice(
                  product.precio,
                )}
              </p>

              {product.unidad && (
                <p className="text-xs text-[var(--muted)]">
                  por {product.unidad}
                </p>
              )}
            </div>

            {/* Stock */}

            <div className="text-right">
              {hasStock ? (
                <p className="text-xs text-[var(--muted)]">
                  {availableStock}{" "}
                  disponibles
                </p>
              ) : (
                <p className="text-xs font-semibold text-[var(--danger)]">
                  No disponible
                </p>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            Controles de cantidad
        ================================================= */}

        {quantity > 0 ? (
          <div className="mt-4">
            <div className="flex items-center overflow-hidden rounded-lg border border-[var(--border)]">
              {/* Menos */}

              <button
                type="button"
                onClick={() =>
                  decreaseQuantity(
                    product.id,
                  )
                }
                aria-label={`Disminuir cantidad de ${product.nombre}`}
                className="flex h-11 w-12 shrink-0 items-center justify-center text-xl font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                −
              </button>

              {/* Cantidad */}

              <span className="flex h-11 min-w-12 flex-1 items-center justify-center border-x border-[var(--border)] px-3 text-sm font-bold text-[var(--foreground)]">
                {quantity}
              </span>

              {/* Más */}

              <button
                type="button"
                onClick={() =>
                  increaseQuantity(
                    product.id,
                  )
                }
                disabled={
                  quantity >=
                  availableStock
                }
                aria-label={`Aumentar cantidad de ${product.nombre}`}
                className="flex h-11 w-12 shrink-0 items-center justify-center text-xl font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>

            {/* Aviso de límite */}

            {quantity >=
              availableStock &&
              availableStock > 0 && (
                <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
                  Has alcanzado el stock
                  disponible.
                </p>
              )}
          </div>
        ) : (
          /* =================================================
             Agregar
          ================================================= */

          <button
            type="button"
            onClick={handleAdd}
            disabled={!hasStock}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--muted)] disabled:opacity-60"
          >
            {hasStock ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle
                    cx="9"
                    cy="20"
                    r="1"
                  />

                  <circle
                    cx="19"
                    cy="20"
                    r="1"
                  />

                  <path d="M3 4h2l2.4 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                </svg>

                Agregar a la cesta
              </>
            ) : (
              "No Stock"
            )}
          </button>
        )}
      </div>
    </article>
  );
}