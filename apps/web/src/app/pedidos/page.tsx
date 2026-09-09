"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";

import type {
  EstadoPedido,
  Pedido,
} from "@/lib/repartos/types";

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const EMPTY_ORDERS_IMAGE =
  "/images/logos/basket.svg";

/*
 * ============================================================
 * ESTADOS
 * ============================================================
 */

const estadoLabels: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

/*
 * ============================================================
 * FORMATEADORES
 * ============================================================
 */

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: unknown) {
  if (!value) {
    return "—";
  }

  /*
   * Firestore Timestamp serializado
   */
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value
  ) {
    const seconds = Number(
      (
        value as {
          seconds?: number;
        }
      ).seconds,
    );

    if (!Number.isNaN(seconds)) {
      return new Date(
        seconds * 1000,
      ).toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  }

  return "—";
}

function getStatusClasses(
  estado: EstadoPedido,
) {
  switch (estado) {
    case "entregado":
      return "bg-green-100 text-green-800 border-green-200";

    case "cancelado":
      return "bg-red-100 text-red-800 border-red-200";

    case "en_camino":
      return "bg-blue-100 text-blue-800 border-blue-200";

    case "asignado":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";

    case "pendiente":
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

/*
 * ============================================================
 * RESPUESTA API
 * ============================================================
 */

interface PedidosApiResponse {
  success?: boolean;
  message?: string;
  data?: Pedido[];
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function PedidosPage() {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [pedidos, setPedidos] =
    useState<Pedido[]>([]);

  const [pedidoSeleccionado, setPedidoSeleccionado] =
    useState<Pedido | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [reciboLoading, setReciboLoading] =
    useState<string | null>(null);

  /*
   * ==========================================================
   * API
   * ==========================================================
   */

  const api = useCallback(
    async (path: string) => {
      if (!user) {
        throw new Error(
          "Debes iniciar sesión.",
        );
      }

      const token =
        await user.getIdToken(true);

      const response = await fetch(
        path,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      let result: unknown;

      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          "El servidor devolvió una respuesta inválida.",
        );
      }

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "No fue posible cargar los pedidos.";

        throw new Error(message);
      }

      return result as PedidosApiResponse;
    },
    [user],
  );

  /*
   * ==========================================================
   * CARGAR PEDIDOS
   * ==========================================================
   */

  const loadPedidos = useCallback(
    async () => {
      if (!user) {
        setPedidos([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result =
          await api("/api/pedidos");

        if (
          !result ||
          !Array.isArray(result.data)
        ) {
          throw new Error(
            "La respuesta de pedidos no tiene un formato válido.",
          );
        }

        /*
         * ====================================================
         * FILTRO DEFENSIVO
         * ====================================================
         *
         * El servidor DEBE garantizar que un usuario normal
         * solamente reciba sus propios pedidos.
         *
         * Este filtro adicional evita que un pedido ajeno
         * llegue a renderizarse aunque la API tuviera un
         * problema de filtrado.
         */

        const misPedidos =
          result.data.filter(
            (pedido) =>
              pedido.usuarioId ===
              user.uid,
          );

        setPedidos(misPedidos);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar tus pedidos.",
        );
        setPedidos([]);
      } finally {
        setLoading(false);
      }
    },
    [api, user],
  );

  useEffect(() => {
    if (!authLoading) {
      loadPedidos();
    }
  }, [
    authLoading,
    loadPedidos,
  ]);

  /*
   * ==========================================================
   * ABRIR PDF DEL RECIBO
   * ==========================================================
   *
   * El PDF se genera exclusivamente en:
   *
   * /api/pedidos/[id]/recibo
   *
   * utilizando generarPDFReparto().
   */

  const abrirRecibo = useCallback(
    async (pedido: Pedido) => {
      if (!user) {
        return;
      }

      /*
       * El recibo solamente existe cuando
       * el pedido ha sido entregado.
       */
      if (pedido.estado !== "entregado") {
        return;
      }

      /*
       * Comprobación defensiva adicional.
       */
      if (pedido.usuarioId !== user.uid) {
        setError(
          "No tienes permiso para acceder a este recibo.",
        );
        return;
      }

      try {
        setReciboLoading(
          pedido.id,
        );

        const token =
          await user.getIdToken(true);

        const response =
          await fetch(
            `/api/pedidos/${encodeURIComponent(
              pedido.id,
            )}/recibo`,
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache: "no-store",
            },
          );

        if (!response.ok) {
          let message =
            "No fue posible generar el recibo.";

          try {
            const result =
              await response.json();

            if (
              result &&
              typeof result === "object" &&
              "message" in result &&
              typeof result.message ===
                "string"
            ) {
              message =
                result.message;
            }
          } catch {
            /*
             * La respuesta no era JSON.
             */
          }

          throw new Error(message);
        }

        const contentType =
          response.headers.get(
            "content-type",
          );

        if (
          !contentType?.includes(
            "application/pdf",
          )
        ) {
          throw new Error(
            "El servidor no devolvió un archivo PDF válido.",
          );
        }

        const pdfBlob =
          await response.blob();

        const pdfUrl =
          URL.createObjectURL(
            pdfBlob,
          );

        const ventana =
          window.open(
            pdfUrl,
            "_blank",
            "noopener,noreferrer",
          );

        /*
         * Algunos navegadores bloquean window.open.
         */
        if (!ventana) {
          const link =
            document.createElement(
              "a",
            );

          link.href = pdfUrl;
          link.target = "_blank";
          link.rel =
            "noopener noreferrer";

          document.body.appendChild(
            link,
          );

          link.click();

          link.remove();
        }

        /*
         * Dejamos tiempo al navegador para
         * consumir el Blob antes de liberarlo.
         */
        window.setTimeout(() => {
          URL.revokeObjectURL(
            pdfUrl,
          );
        }, 60_000);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "No fue posible abrir el recibo.";

        setError(message);
      } finally {
        setReciboLoading(null);
      }
    },
    [user],
  );

  /*
   * ==========================================================
   * ESTADOS DE CARGA
   * ==========================================================
   */

  if (authLoading || loading) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-[var(--surface)]">
        <div className="mx-auto flex min-h-[500px] max-w-7xl items-center justify-center px-4">
          <div className="text-center">
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--secondary)] border-t-[var(--primary)]"
              aria-label="Cargando"
            />

            <p className="mt-4 text-sm font-medium text-[var(--muted)]">
              Cargando tus pedidos...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * SIN SESIÓN
   * ==========================================================
   */

  if (!user) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-[var(--surface)]">
        <div className="mx-auto flex min-h-[600px] max-w-3xl items-center justify-center px-4 py-16">
          <section className="w-full rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--secondary)]">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-[var(--primary)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M12 2v8" />
                <path d="m9 7 3 3 3-3" />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-[var(--foreground)]">
              Inicia sesión para ver tus pedidos
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
              Aquí podrás consultar tus compras,
              estados y recibos.
            </p>

            <Link
              href="/login"
              className="mt-7 inline-flex rounded-[var(--radius-md)] bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Iniciar sesión
            </Link>
          </section>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (error) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div
            role="alert"
            className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            <p className="font-semibold">
              No fue posible cargar tus pedidos.
            </p>

            <p className="mt-1">
              {error}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  loadPedidos();
                }}
                className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-800"
              >
                Intentar nuevamente
              </button>

              <button
                type="button"
                onClick={() =>
                  setError(null)
                }
                className="rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 transition hover:bg-red-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * SIN PEDIDOS
   * ==========================================================
   */

  if (pedidos.length === 0) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-[var(--surface)]">
        <div className="mx-auto flex min-h-[650px] max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <section className="flex w-full max-w-2xl flex-col items-center rounded-[var(--radius-xl)] border border-[var(--border)] bg-white px-6 py-12 text-center shadow-sm sm:px-12 sm:py-16">
            <div className="relative h-48 w-48 sm:h-64 sm:w-64">
              <Image
                src={EMPTY_ORDERS_IMAGE}
                alt="Canastas Verdes"
                fill
                priority
                className="object-contain"
              />
            </div>

            <h1 className="mt-8 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Aún no has hecho tu primer pedido
            </h1>

            <p className="mt-3 max-w-lg text-base leading-7 text-[var(--muted)]">
              Anímate y prueba la frescura del campo.
            </p>

            <Link
              href="/tienda"
              className="mt-8 inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Explorar la tienda
            </Link>
          </section>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * PEDIDOS
   * ==========================================================
   */

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[var(--surface)]">
      <section className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-wider text-[var(--primary)]">
            Canastas Verdes
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Mis pedidos
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            Consulta el estado de tus compras y
            accede al recibo de cada pedido.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">
              Pedidos realizados
            </p>

            <p className="text-2xl font-bold text-[var(--foreground)]">
              {pedidos.length}
            </p>
          </div>

          <Link
            href="/tienda"
            className="rounded-[var(--radius-md)] border border-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--secondary)]"
          >
            Seguir comprando
          </Link>
        </div>

        <div className="grid gap-5">
          {pedidos.map((pedido) => {
            const puedeVerRecibo =
              pedido.estado ===
              "entregado";

            const cargandoRecibo =
              reciboLoading ===
              pedido.id;

            return (
              <article
                key={pedido.id}
                className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-bold text-[var(--foreground)]">
                        Pedido #
                        {pedido.id.slice(
                          0,
                          8,
                        )}
                      </h2>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                          pedido.estado,
                        )}`}
                      >
                        {
                          estadoLabels[
                            pedido.estado
                          ]
                        }
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {formatDate(
                        pedido.fechaCreacion,
                      )}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      Total
                    </p>

                    <p className="mt-1 text-xl font-bold text-[var(--primary)]">
                      {formatMoney(
                        pedido.total,
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                      Productos
                    </p>

                    <div className="mt-3 space-y-2">
                      {pedido.productos
                        .slice(0, 3)
                        .map(
                          (
                            producto,
                          ) => (
                            <div
                              key={`${pedido.id}-${producto.productoId}`}
                              className="flex items-center justify-between gap-4 text-sm"
                            >
                              <span className="min-w-0 truncate text-[var(--foreground)]">
                                {
                                  producto.nombre
                                }
                              </span>

                              <span className="shrink-0 font-medium text-[var(--muted)]">
                                ×{" "}
                                {
                                  producto.cantidad
                                }
                              </span>
                            </div>
                          ),
                        )}

                      {pedido.productos
                        .length > 3 && (
                        <p className="pt-1 text-xs font-medium text-[var(--primary)]">
                          +{" "}
                          {pedido
                            .productos
                            .length -
                            3}{" "}
                          producto(s) más
                        </p>
                      )}
                    </div>

                    <p className="mt-4 text-sm text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">
                        Entrega:
                      </span>{" "}
                      {pedido.direccionEntrega ||
                        "No especificada"}
                    </p>
                  </div>

                  <div className="flex flex-col justify-center gap-2 sm:min-w-[190px]">
                    <button
                      type="button"
                      onClick={() =>
                        setPedidoSeleccionado(
                          pedido,
                        )
                      }
                      className="rounded-[var(--radius-md)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Ver pedido
                    </button>

                    {puedeVerRecibo && (
                      <button
                        type="button"
                        onClick={() =>
                          abrirRecibo(
                            pedido,
                          )
                        }
                        disabled={
                          cargandoRecibo
                        }
                        className="rounded-[var(--radius-md)] border border-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cargandoRecibo
                          ? "Generando recibo..."
                          : "Ver recibo PDF"}
                      </button>
                    )}

                    {!puedeVerRecibo && (
                      <p className="px-2 text-center text-xs leading-5 text-[var(--muted)]">
                        El recibo estará disponible
                        cuando el pedido sea
                        entregado.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/*
       * ========================================================
       * MODAL DETALLE DEL PEDIDO
       * ========================================================
       */}

      {pedidoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-title"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setPedidoSeleccionado(
                null,
              );
            }
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-[var(--radius-xl)] bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-white p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                  Canastas Verdes
                </p>

                <h2
                  id="receipt-title"
                  className="mt-1 text-xl font-bold text-[var(--foreground)] sm:text-2xl"
                >
                  Pedido #
                  {pedidoSeleccionado.id.slice(
                    0,
                    8,
                  )}
                </h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  {formatDate(
                    pedidoSeleccionado.fechaCreacion,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPedidoSeleccionado(
                    null,
                  )
                }
                aria-label="Cerrar detalle"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                ×
              </button>
            </header>

            <div className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-[var(--surface)] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    Estado
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                      pedidoSeleccionado.estado,
                    )}`}
                  >
                    {
                      estadoLabels[
                        pedidoSeleccionado.estado
                      ]
                    }
                  </span>
                </div>

                <div className="rounded-lg bg-[var(--surface)] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    Dirección de entrega
                  </p>

                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {pedidoSeleccionado.direccionEntrega ||
                      "No especificada"}
                  </p>
                </div>

                <div className="rounded-lg bg-[var(--surface)] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    Municipalidad
                  </p>

                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {pedidoSeleccionado.IdMunicipalidad ||
                      "No especificada"}
                  </p>
                </div>

                <div className="rounded-lg bg-[var(--surface)] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    Actualización
                  </p>

                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {formatDate(
                      pedidoSeleccionado.ultimaActualizacion,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-lg border border-[var(--border)]">
                <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 bg-[var(--surface)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)] sm:grid">
                  <span>Producto</span>
                  <span>Cantidad</span>
                  <span>Precio</span>
                  <span>Subtotal</span>
                </div>

                {pedidoSeleccionado.productos.map(
                  (producto) => (
                    <div
                      key={`${pedidoSeleccionado.id}-${producto.productoId}`}
                      className="grid gap-3 border-t border-[var(--border)] px-4 py-4 first:border-t-0 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4"
                    >
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">
                          {
                            producto.nombre
                          }
                        </p>

                        {producto.code && (
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            Código:{" "}
                            {
                              producto.code
                            }
                          </p>
                        )}
                      </div>

                      <div className="text-sm text-[var(--muted)]">
                        {
                          producto.cantidad
                        }{" "}
                        {
                          producto.unidad
                        }
                      </div>

                      <div className="text-sm font-medium">
                        {formatMoney(
                          producto.precioUnitario,
                        )}
                      </div>

                      <div className="font-bold text-[var(--foreground)]">
                        {formatMoney(
                          producto.subtotal,
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-6 ml-auto max-w-sm">
                <div className="flex justify-between py-2 text-sm text-[var(--muted)]">
                  <span>
                    Subtotal
                  </span>

                  <span className="font-medium text-[var(--foreground)]">
                    {formatMoney(
                      pedidoSeleccionado.subtotal,
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-t border-[var(--border)] pt-3 text-lg font-bold">
                  <span>Total</span>

                  <span className="text-[var(--primary)]">
                    {formatMoney(
                      pedidoSeleccionado.total,
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setPedidoSeleccionado(
                      null,
                    )
                  }
                  className="rounded-[var(--radius-md)] border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                >
                  Cerrar
                </button>

                {pedidoSeleccionado.estado ===
                  "entregado" && (
                  <button
                    type="button"
                    onClick={() =>
                      abrirRecibo(
                        pedidoSeleccionado,
                      )
                    }
                    disabled={
                      reciboLoading ===
                      pedidoSeleccionado.id
                    }
                    className="rounded-[var(--radius-md)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reciboLoading ===
                    pedidoSeleccionado.id
                      ? "Generando recibo..."
                      : "Abrir recibo PDF"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}