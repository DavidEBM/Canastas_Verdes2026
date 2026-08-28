"use client";

import Image from "next/image";
import { useState } from "react";

import { useCart } from "@/hooks/useCart";
import type { Product } from "@/services/productos.service";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  emptyMessage?: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    },
  ).format(price);
}

function getImageUrl(
  product: Product,
): string | null {
  /*
   * Firebase Storage debe proporcionar posteriormente
   * la URL definitiva mediante imageName/imgPath.
   *
   * Mientras tanto, si imgPath ya contiene una URL,
   * podemos utilizarla directamente.
   */

  if (
    product.imgPath &&
    (
      product.imgPath.startsWith(
        "http://",
      ) ||
      product.imgPath.startsWith(
        "https://",
      )
    )
  ) {
    return product.imgPath;
  }

  return null;
}

/* =========================================================
   Skeleton
========================================================= */

function ProductSkeleton() {
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
      <div className="aspect-[4/3] animate-pulse bg-[var(--surface)]" />

      <div className="space-y-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--surface)]" />

        <div className="h-4 w-full animate-pulse rounded bg-[var(--surface)]" />

        <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--surface)]" />

        <div className="h-10 w-full animate-pulse rounded bg-[var(--surface)]" />
      </div>
    </article>
  );
}

/* =========================================================
   Product Card
========================================================= */

function ProductCard({
  product,
}: {
  product: Product;
}) {
  const {
    addToCart,
  } = useCart();

  const [quantity, setQuantity] =
    useState(1);

  const [imageError, setImageError] =
    useState(false);

  const available =
    product.activo === true &&
    product.stock > 0;

  const imageUrl =
    getImageUrl(product);

  const increase =
    () => {
      setQuantity(
        (current) =>
          Math.min(
            current + 1,
            product.stock,
          ),
      );
    };

  const decrease =
    () => {
      setQuantity(
        (current) =>
          Math.max(
            1,
            current - 1,
          ),
      );
    };

  const handleAddToCart =
    () => {
      if (!available) {
        return;
      }

      addToCart(
        product,
        quantity,
      );
    };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm transition-shadow hover:shadow-md">
      {/* =================================================
          Imagen
      ================================================= */}

      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface)]">
        {imageUrl &&
        !imageError ? (
          <Image
            src={imageUrl}
            alt={product.nombre}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() =>
              setImageError(true)
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--primary)]">
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 20h10" />
                  <path d="M9 20V8" />
                  <path d="M15 20V8" />
                  <path d="M5 8h14" />
                  <path d="M8 8 12 3l4 5" />
                </svg>
              </div>

              <p className="mt-2 text-xs text-[var(--muted)]">
                Imagen no disponible
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            Categoría
        ================================================= */}

        {product.categoria && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--background)]/95 px-3 py-1 text-xs font-semibold text-[var(--primary)] shadow-sm backdrop-blur">
            {product.categoria}
          </span>
        )}

        {/* =================================================
            No stock
        ================================================= */}

        {!available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-red-600">
              No Stock
            </span>
          </div>
        )}
      </div>

      {/* =================================================
          Contenido
      ================================================= */}

      <div className="flex flex-1 flex-col p-4">
        {/* Código */}

        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Código: {product.code}
        </p>

        {/* Nombre */}

        <h3 className="mt-1 text-lg font-bold text-[var(--foreground)]">
          {product.nombre}
        </h3>

        {/* Descripción */}

        <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-[var(--muted)]">
          {product.descripcion}
        </p>

        {/* Precio */}

        <div className="mt-4">
          <span className="text-xl font-bold text-[var(--primary)]">
            {formatPrice(
              product.precio,
            )}
          </span>

          <span className="ml-2 text-sm text-[var(--muted)]">
            / {product.unidad}
          </span>
        </div>

        {/* Stock */}

        <div className="mt-2 text-xs text-[var(--muted)]">
          {available ? (
            <>
              Disponible:{" "}
              <span className="font-semibold text-[var(--primary)]">
                {product.stock}
              </span>
            </>
          ) : (
            <span className="font-semibold text-red-600">
              No Stock
            </span>
          )}
        </div>

        {/* =================================================
            Compra
        ================================================= */}

        <div className="mt-auto pt-5">
          {available ? (
            <div className="space-y-3">
              {/* Cantidad */}

              <div className="flex items-center justify-between rounded-lg border border-[var(--border)]">
                <button
                  type="button"
                  onClick={
                    decrease
                  }
                  disabled={
                    quantity <= 1
                  }
                  aria-label={`Disminuir cantidad de ${product.nombre}`}
                  className="flex h-10 w-11 items-center justify-center text-lg font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  −
                </button>

                <span className="min-w-10 text-center text-sm font-semibold text-[var(--foreground)]">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={
                    increase
                  }
                  disabled={
                    quantity >=
                    product.stock
                  }
                  aria-label={`Aumentar cantidad de ${product.nombre}`}
                  className="flex h-10 w-11 items-center justify-center text-lg font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  +
                </button>
              </div>

              {/* Agregar */}

              <button
                type="button"
                onClick={
                  handleAddToCart
                }
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
              >
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
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled
              className="h-11 w-full cursor-not-allowed rounded-lg bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--muted)]"
            >
              Producto agotado
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   Product Grid
========================================================= */

export default function ProductGrid({
  products,
  loading = false,
  emptyMessage = "No hay productos disponibles.",
}: ProductGridProps) {
  /* =======================================================
     Loading
  ======================================================= */

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({
          length: 8,
        }).map((_, index) => (
          <ProductSkeleton
            key={index}
          />
        ))}
      </div>
    );
  }

  /* =======================================================
     Sin resultados
  ======================================================= */

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--primary)]">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />

            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
          No encontramos productos
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  /* =======================================================
     Productos
  ======================================================= */

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map(
        (product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ),
      )}
    </div>
  );
}