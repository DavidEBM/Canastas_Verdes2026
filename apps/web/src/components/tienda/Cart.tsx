"use client";

import Link from "next/link";
import { useEffect } from "react";

import {
  useCart,
  type CartItem,
} from "@/hooks/useCart";

function formatPrice(value: number) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

interface CartItemRowProps {
  item: CartItem;
}

function CartItemRow({
  item,
}: CartItemRowProps) {
  const {
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    getAvailableStock,
  } = useCart();

  const {
    product,
    quantity,
  } = item;

  const availableStock =
    getAvailableStock(product);

  const imageSource =
    product.imgPath ||
    "/images/products/placeholder.jpg";

  return (
    <article className="flex gap-3 border-b border-[var(--border)] py-4 last:border-b-0">
      {/* Imagen */}
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface)]">
        <img
          src={imageSource}
          alt={product.nombre}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Información */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--foreground)]">
              {product.nombre}
            </h3>

            {product.unidad && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Por {product.unidad}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              removeItem(product.id)
            }
            className="shrink-0 text-[var(--muted)] transition-colors hover:text-[var(--danger)]"
            aria-label={`Eliminar ${product.nombre} de la cesta`}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v5" />
              <path d="M14 11v5" />
            </svg>
          </button>
        </div>

        <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
          {formatPrice(
            product.precio,
          )}
        </p>

        {/* Cantidad */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center overflow-hidden rounded-lg border border-[var(--border)]">
            <button
              type="button"
              onClick={() =>
                decreaseQuantity(
                  product.id,
                )
              }
              className="flex h-8 w-8 items-center justify-center text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
              aria-label={`Disminuir cantidad de ${product.nombre}`}
            >
              −
            </button>

            <span className="flex h-8 min-w-8 items-center justify-center border-x border-[var(--border)] px-2 text-sm font-semibold">
              {quantity}
            </span>

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
              className="flex h-8 w-8 items-center justify-center text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={`Aumentar cantidad de ${product.nombre}`}
            >
              +
            </button>
          </div>

          <span className="text-xs text-[var(--muted)]">
            {quantity >=
            availableStock
              ? "Máximo disponible"
              : `${availableStock} disponibles`}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function Cart() {
  const {
    items,
    totalItems,
    subtotal,
    isCartOpen,
    closeCart,
    clearCart,
  } = useCart();

  /*
   * Bloqueamos el scroll de la página
   * mientras la cesta está abierta.
   */
  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isCartOpen]);

  /*
   * Permite cerrar el panel con Escape.
   */
  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        closeCart();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    isCartOpen,
    closeCart,
  ]);

  if (!isCartOpen) {
    return null;
  }

  return (
    <>
      {/* =================================================
          Fondo
      ================================================= */}
      <button
        type="button"
        aria-label="Cerrar cesta"
        onClick={closeCart}
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
      />

      {/* =================================================
          Panel lateral
      ================================================= */}
      <aside
        className="fixed right-0 top-0 z-[70] flex h-dvh w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--background)] shadow-2xl"
        aria-label="Cesta de compras"
      >
        {/* =================================================
            Encabezado
        ================================================= */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Tu cesta
            </h2>

            <p className="text-xs text-[var(--muted)]">
              {totalItems === 0
                ? "No hay productos"
                : `${totalItems} ${
                    totalItems === 1
                      ? "producto"
                      : "productos"
                  }`}
            </p>
          </div>

          <button
            type="button"
            onClick={closeCart}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
            aria-label="Cerrar cesta"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* =================================================
            Productos
        ================================================= */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary)]">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
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
                    cx="20"
                    cy="20"
                    r="1"
                  />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>

              <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
                Tu cesta está vacía
              </h3>

              <p className="mt-2 max-w-xs text-sm text-[var(--muted)]">
                Explora nuestros productos
                del campo y agrega los que
                quieras comprar.
              </p>

              <Link
                href="/tienda"
                onClick={closeCart}
                className="mt-5 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
              >
                Ir a la tienda
              </Link>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>

        {/* =================================================
            Resumen / Checkout
        ================================================= */}
        {items.length > 0 && (
          <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">
                Subtotal
              </span>

              <span className="text-lg font-bold text-[var(--foreground)]">
                {formatPrice(subtotal)}
              </span>
            </div>

            <p className="mt-1 text-xs text-[var(--muted)]">
              El precio final será validado
              nuevamente al confirmar el
              pedido.
            </p>

            {/* Checkout */}
            <Link
              href="/checkout"
              onClick={closeCart}
              className="mt-4 flex w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
            >
              CHECKOUT
            </Link>

            {/* Vaciar */}
            <button
              type="button"
              onClick={clearCart}
              className="mt-3 w-full py-2 text-center text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--danger)]"
            >
              Vaciar cesta
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}