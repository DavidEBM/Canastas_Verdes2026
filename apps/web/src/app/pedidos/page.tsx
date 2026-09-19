"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  MapPin,
  Package,
  Phone,
  Truck,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import type { Pedido } from "@/lib/repartos/types";

const EMPTY_ORDERS_IMAGE =
  "/images/logos/logo-canastas-verdes.svg";

type TipoEntrega = "domicilio" | "recogida";

interface PuntoRecogidaPedido {
  nombre: string;
  direccion: string;
  municipio: string;
}

type ProductoPedido = Pedido["productos"][number] & {
  productoId?: string;
  IdProducto?: string;

  nombre?: string;
  Nombre?: string;

  cantidad?: number;
  Cantidad?: number;

  precioUnitario?: number;
  precio?: number;
  Precio?: number;

  subtotal?: number;
  Subtotal?: number;

  unidad?: string;
  Unidad?: string;

  presentacionCantidad?: number;
  presentacionNombre?: string;

  imagen?: string;
  imgPath?: string;
};

type PedidoUsuario = Pedido & {
  tipoEntrega?: TipoEntrega | null;
  TipoEntrega?: TipoEntrega | null;

  telefonoEntrega?: string;
  telefono?: string;

  IdPuntoRecogida?: string;
  idPuntoRecogida?: string;

  puntoRecogida?: PuntoRecogidaPedido | null;
  PuntoRecogida?: PuntoRecogidaPedido | null;

  IdMunicipalidad?: string;
  idMunicipalidad?: string;

  nombreCliente?: string;
};

interface PedidosApiResponse {
  success?: boolean;
  message?: string;
  data?: PedidoUsuario[];
}

const ESTADO_LABELS: Record<
  PedidoUsuario["estado"],
  string
> = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

function getEstadoClasses(
  estado: PedidoUsuario["estado"],
): string {
  switch (estado) {
    case "entregado":
      return "bg-green-100 text-green-800";

    case "en_camino":
      return "bg-blue-100 text-blue-800";

    case "asignado":
      return "bg-purple-100 text-purple-800";

    case "cancelado":
      return "bg-red-100 text-red-800";

    case "pendiente":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getTipoEntrega(
  pedido: PedidoUsuario,
): TipoEntrega | null {
  return (
    pedido.tipoEntrega ??
    pedido.TipoEntrega ??
    null
  );
}

function getTipoEntregaLabel(
  tipoEntrega: TipoEntrega | null,
): string {
  switch (tipoEntrega) {
    case "domicilio":
      return "A domicilio";

    case "recogida":
      return "Recogida en punto";

    default:
      return "No especificada";
  }
}

function getTipoEntregaClasses(
  tipoEntrega: TipoEntrega | null,
): string {
  switch (tipoEntrega) {
    case "domicilio":
      return "bg-blue-100 text-blue-800";

    case "recogida":
      return "bg-green-100 text-green-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatCurrency(value: unknown): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "$0";
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDate(value: unknown): string {
  if (!value) {
    return "Fecha no disponible";
  }

  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  } else if (
    typeof value === "object" &&
    value !== null
  ) {
    const firebaseValue = value as {
      seconds?: number;
      _seconds?: number;
      toDate?: () => Date;
    };

    if (
      typeof firebaseValue.toDate === "function"
    ) {
      const parsed = firebaseValue.toDate();

      if (!Number.isNaN(parsed.getTime())) {
        date = parsed;
      }
    } else if (
      typeof firebaseValue.seconds === "number"
    ) {
      date = new Date(
        firebaseValue.seconds * 1000,
      );
    } else if (
      typeof firebaseValue._seconds === "number"
    ) {
      date = new Date(
        firebaseValue._seconds * 1000,
      );
    }
  }

  if (!date) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getGoogleMapsUrl(
  punto: PuntoRecogidaPedido,
): string {
  const query = [
    punto.nombre,
    punto.direccion,
    punto.municipio,
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

function getDeliveryDescription(
  pedido: PedidoUsuario,
): string {
  const tipoEntrega = getTipoEntrega(pedido);

  if (tipoEntrega === "domicilio") {
    return (
      pedido.direccionEntrega ||
      "Dirección no especificada"
    );
  }

  if (
    tipoEntrega === "recogida" &&
    pedido.puntoRecogida
  ) {
    return pedido.puntoRecogida.nombre;
  }

  return "Información no disponible";
}

function getProductoNombre(
  producto: ProductoPedido,
): string {
  return (
    producto.nombre ??
    producto.Nombre ??
    "Producto"
  );
}

function getProductoCantidad(
  producto: ProductoPedido,
): number {
  const cantidad = Number(
    producto.cantidad ??
      producto.Cantidad ??
      0,
  );

  return Number.isFinite(cantidad)
    ? cantidad
    : 0;
}

function getProductoPrecio(
  producto: ProductoPedido,
): number {
  const precio = Number(
    producto.precioUnitario ??
      producto.precio ??
      producto.Precio ??
      0,
  );

  return Number.isFinite(precio)
    ? precio
    : 0;
}

function getProductoSubtotal(
  producto: ProductoPedido,
): number {
  const subtotal = Number(
    producto.subtotal ??
      producto.Subtotal ??
      getProductoCantidad(producto) *
        getProductoPrecio(producto),
  );

  return Number.isFinite(subtotal)
    ? subtotal
    : 0;
}

function getProductoPresentacion(
  producto: ProductoPedido,
): string {
  const cantidad = Number(
    producto.presentacionCantidad,
  );

  const nombre =
    producto.presentacionNombre
      ?.toString()
      .trim();

  if (
    Number.isFinite(cantidad) &&
    cantidad > 0 &&
    nombre
  ) {
    return `${cantidad} ${nombre}`;
  }

  if (nombre) {
    return nombre;
  }

  const unidad =
    producto.unidad ??
    producto.Unidad ??
    "";

  return unidad.toString().trim();
}

function getPedidoProductos(
  pedido: PedidoUsuario,
): ProductoPedido[] {
  const productos =
    pedido.productos ?? [];

  return productos as ProductoPedido[];
}

function getPedidoTotal(
  pedido: PedidoUsuario,
): number {
  const total = Number(pedido.total ?? 0);

  if (
    Number.isFinite(total) &&
    total > 0
  ) {
    return total;
  }

  return getPedidoProductos(pedido).reduce(
    (sum, producto) =>
      sum + getProductoSubtotal(producto),
    0,
  );
}

export default function PedidosPage() {
  const { user, loading: authLoading } =
    useAuth();

  const [pedidos, setPedidos] = useState<
    PedidoUsuario[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [selectedPedido, setSelectedPedido] =
    useState<PedidoUsuario | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function cargarPedidos() {
      if (authLoading) {
        return;
      }

      if (!user) {
        if (!cancelled) {
          setPedidos([]);
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const token =
          await user.getIdToken(true);

        const response = await fetch(
          "/api/pedidos",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as PedidosApiResponse;

        if (!response.ok) {
          throw new Error(
            result.message ||
              "No fue posible cargar tus pedidos.",
          );
        }

        const pedidosUsuario = (
          result.data ?? []
        ).filter(
          (pedido) =>
            pedido.usuarioId === user.uid,
        );

        if (!cancelled) {
          setPedidos(pedidosUsuario);
        }
      } catch (err) {
        console.error(
          "Error cargando pedidos:",
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar tus pedidos.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void cargarPedidos();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />

            <p className="text-sm text-[var(--muted)]">
              Cargando tus pedidos...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
            <Package
              size={48}
              className="mx-auto mb-4 text-[var(--primary)]"
            />

            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Mis pedidos
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Debes iniciar sesión para
              consultar tus pedidos.
            </p>

            <a
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Iniciar sesión
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <X
              size={48}
              className="mx-auto mb-4 text-red-500"
            />

            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              No fue posible cargar tus pedidos
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--secondary)] p-3 text-[var(--primary)]">
              <Package size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] md:text-3xl">
                Mis pedidos
              </h1>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Consulta el estado y los detalles
                de tus compras.
              </p>
            </div>
          </div>
        </div>

        {pedidos.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[var(--surface)]">
              <Image
                src={EMPTY_ORDERS_IMAGE}
                alt="Sin pedidos"
                width={90}
                height={90}
                className="h-20 w-20 object-contain"
              />
            </div>

            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Aún no tienes pedidos
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Cuando realices una compra,
              aquí podrás consultar toda la
              información de tu pedido.
            </p>

            <a
              href="/tienda"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Ir a la tienda
            </a>
          </div>
        ) : (
          <div className="space-y-5">
            {pedidos.map((pedido) => {
              const tipoEntrega =
                getTipoEntrega(pedido);

              const productos =
                getPedidoProductos(pedido);

              return (
                <article
                  key={pedido.id}
                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm"
                >
                  <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 md:px-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/pedidos/${pedido.id}?success=1`}
                            className="text-sm font-bold text-[var(--primary)] underline-offset-2 transition hover:underline"
                          >
                            Pedido #
                            {pedido.id.slice(
                              0,
                              8,
                            )}
                          </Link>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getEstadoClasses(
                              pedido.estado,
                            )}`}
                          >
                            {
                              ESTADO_LABELS[
                                pedido.estado
                              ]
                            }
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                          <CalendarDays
                            size={14}
                          />

                          <span>
                            {formatDate(
                              pedido.fechaCreacion,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-xs text-[var(--muted)]">
                          Total
                        </p>

                        <p className="text-lg font-bold text-[var(--primary)]">
                          {formatCurrency(
                            getPedidoTotal(
                              pedido,
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 p-5 md:p-6">
                    <div>
                      <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                        Productos
                      </h2>

                      <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                        {productos.map(
                          (
                            producto,
                            index,
                          ) => {
                            const presentacion =
                              getProductoPresentacion(
                                producto,
                              );

                            return (
                              <div
                                key={`${pedido.id}-${producto.productoId ?? producto.IdProducto ?? index}`}
                                className="flex items-center justify-between gap-4 p-4"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                                    {getProductoNombre(
                                      producto,
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-[var(--muted)]">
                                    Cantidad:{" "}
                                    {getProductoCantidad(
                                      producto,
                                    )}

                                    {presentacion
                                      ? ` · ${presentacion}`
                                      : ""}
                                  </p>
                                </div>

                                <p className="shrink-0 text-sm font-semibold text-[var(--foreground)]">
                                  {formatCurrency(
                                    getProductoSubtotal(
                                      producto,
                                    ),
                                  )}
                                </p>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {tipoEntrega ===
                          "recogida" ? (
                            <MapPin
                              size={18}
                              className="text-[var(--primary)]"
                            />
                          ) : (
                            <Truck
                              size={18}
                              className="text-[var(--primary)]"
                            />
                          )}

                          <h2 className="text-sm font-semibold text-[var(--foreground)]">
                            Entrega
                          </h2>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getTipoEntregaClasses(
                            tipoEntrega,
                          )}`}
                        >
                          {getTipoEntregaLabel(
                            tipoEntrega,
                          )}
                        </span>
                      </div>

                      {tipoEntrega ===
                      "domicilio" ? (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin
                              size={16}
                              className="mt-0.5 shrink-0 text-[var(--muted)]"
                            />

                            <p className="text-sm text-[var(--foreground)]">
                              {pedido.direccionEntrega ||
                                "Dirección no especificada"}
                            </p>
                          </div>

                          {(pedido.telefonoEntrega ||
                            pedido.telefono) && (
                            <div className="flex items-center gap-2">
                              <Phone
                                size={16}
                                className="shrink-0 text-[var(--muted)]"
                              />

                              <p className="text-sm text-[var(--foreground)]">
                                {pedido.telefonoEntrega ||
                                  pedido.telefono}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : tipoEntrega ===
                          "recogida" &&
                        pedido.puntoRecogida ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                              Punto de recogida
                            </p>

                            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                              {
                                pedido
                                  .puntoRecogida
                                  .nombre
                              }
                            </p>
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2">
                              <MapPin
                                size={16}
                                className="mt-0.5 shrink-0 text-[var(--muted)]"
                              />

                              <div className="min-w-0">
                                <p className="text-sm text-[var(--foreground)]">
                                  {
                                    pedido
                                      .puntoRecogida
                                      .direccion
                                  }
                                </p>

                                {pedido
                                  .puntoRecogida
                                  .municipio && (
                                  <p className="mt-1 text-xs text-[var(--muted)]">
                                    {
                                      pedido
                                        .puntoRecogida
                                        .municipio
                                    }
                                  </p>
                                )}
                              </div>
                            </div>

                            <a
                              href={getGoogleMapsUrl(
                                pedido.puntoRecogida,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--secondary)]"
                            >
                              <ExternalLink
                                size={14}
                              />

                              <span>
                                Ver en Maps
                              </span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--muted)]">
                          Información de entrega
                          no disponible.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-[var(--muted)]">
                        <span className="font-medium">
                          {getDeliveryDescription(
                            pedido,
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPedido(
                            pedido,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--secondary)]"
                      >
                        <FileText size={16} />

                        Ver detalles
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selectedPedido && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedPedido(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white px-5 py-4 md:px-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Detalles del pedido
                </h2>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  #{selectedPedido.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPedido(null)
                }
                className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                aria-label="Cerrar detalles"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5 md:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Estado
                  </p>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getEstadoClasses(
                      selectedPedido.estado,
                    )}`}
                  >
                    {
                      ESTADO_LABELS[
                        selectedPedido.estado
                      ]
                    }
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--border)] p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Tipo de entrega
                  </p>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTipoEntregaClasses(
                      getTipoEntrega(
                        selectedPedido,
                      ),
                    )}`}
                  >
                    {getTipoEntregaLabel(
                      getTipoEntrega(
                        selectedPedido,
                      ),
                    )}
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--border)] p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Municipalidad
                  </p>

                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {selectedPedido.IdMunicipalidad ||
                      selectedPedido.idMunicipalidad ||
                      "No especificada"}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Actualización
                  </p>

                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {formatDate(
                      selectedPedido.ultimaActualizacion,
                    )}
                  </p>
                </div>
              </div>

              {getTipoEntrega(
                selectedPedido,
              ) === "domicilio" && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Truck
                      size={18}
                      className="text-[var(--primary)]"
                    />

                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      Información de domicilio
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                        Dirección
                      </p>

                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {selectedPedido.direccionEntrega ||
                          "No especificada"}
                      </p>
                    </div>

                    {(selectedPedido.telefonoEntrega ||
                      selectedPedido.telefono) && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                          Teléfono de entrega
                        </p>

                        <p className="mt-1 flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Phone size={15} />

                          {selectedPedido.telefonoEntrega ||
                            selectedPedido.telefono}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {getTipoEntrega(
                selectedPedido,
              ) === "recogida" &&
                selectedPedido.puntoRecogida && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin
                          size={18}
                          className="text-[var(--primary)]"
                        />

                        <h3 className="text-sm font-semibold text-[var(--foreground)]">
                          Punto de recogida
                        </h3>
                      </div>

                      <a
                        href={getGoogleMapsUrl(
                          selectedPedido.puntoRecogida,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--secondary)]"
                      >
                        <ExternalLink
                          size={14}
                        />

                        Ver en Maps
                      </a>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                          Nombre del punto
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                          {
                            selectedPedido
                              .puntoRecogida
                              .nombre
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                          Ubicación
                        </p>

                        <p className="mt-1 flex items-start gap-2 text-sm text-[var(--foreground)]">
                          <MapPin
                            size={16}
                            className="mt-0.5 shrink-0 text-[var(--primary)]"
                          />

                          {
                            selectedPedido
                              .puntoRecogida
                              .direccion
                          }
                        </p>
                      </div>

                      {selectedPedido
                        .puntoRecogida
                        .municipio && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                            Municipio
                          </p>

                          <p className="mt-1 text-sm text-[var(--foreground)]">
                            {
                              selectedPedido
                                .puntoRecogida
                                .municipio
                            }
                          </p>
                        </div>
                      )}

                      {(selectedPedido.IdPuntoRecogida ||
                        selectedPedido.idPuntoRecogida) && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                            ID del punto
                          </p>

                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {selectedPedido.IdPuntoRecogida ||
                              selectedPedido.idPuntoRecogida}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Productos
                  </h3>

                  <span className="text-sm font-bold text-[var(--primary)]">
                    {formatCurrency(
                      getPedidoTotal(
                        selectedPedido,
                      ),
                    )}
                  </span>
                </div>

                <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                  {getPedidoProductos(
                    selectedPedido,
                  ).map(
                    (producto, index) => {
                      const presentacion =
                        getProductoPresentacion(
                          producto,
                        );

                      return (
                        <div
                          key={`${selectedPedido.id}-detail-${producto.productoId ?? producto.IdProducto ?? index}`}
                          className="flex items-center justify-between gap-4 p-4"
                        >
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {getProductoNombre(
                                producto,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {getProductoCantidad(
                                producto,
                              )}

                              {presentacion
                                ? ` · ${presentacion}`
                                : ""}

                              {" × "}

                              {formatCurrency(
                                getProductoPrecio(
                                  producto,
                                ),
                              )}
                            </p>
                          </div>

                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {formatCurrency(
                              getProductoSubtotal(
                                producto,
                              ),
                            )}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="flex justify-end border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPedido(null)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <ArrowLeft size={16} />

                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}