"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Phone,
  Truck,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

type EstadoPedido =
  | "pendiente"
  | "asignado"
  | "en_camino"
  | "entregado"
  | "cancelado";

interface ProductoPedido {
  id?: string;
  IdProducto?: string;
  nombre?: string;
  Nombre?: string;
  cantidad?: number;
  Cantidad?: number;
  precio?: number;
  Precio?: number;
  subtotal?: number;
  Subtotal?: number;
  unidad?: string;
  Unidad?: string;
  presentacionNombre?: string;
  presentacionCantidad?: number;
  imagen?: string;
  imgPath?: string;
}

interface Pedido {
  id?: string;
  IdPedido?: string;
  estado?: EstadoPedido | string;
  Estado?: EstadoPedido | string;

  FechaCreacion?: unknown;
  fechaCreacion?: unknown;
  createdAt?: unknown;

  FechaActualizacion?: unknown;
  fechaActualizacion?: unknown;
  updatedAt?: unknown;

  total?: number;
  Total?: number;

  subtotal?: number;
  Subtotal?: number;

  costoEnvio?: number;
  CostoEnvio?: number;

  tipoEntrega?: "domicilio" | "recogida" | string;
  TipoEntrega?: "domicilio" | "recogida" | string;

  direccionEntrega?: string | null;
  DireccionEntrega?: string | null;

  telefono?: string | null;
  Telefono?: string | null;

  IdMunicipalidad?: string | null;
  idMunicipalidad?: string | null;

  IdPuntoRecogida?: string | null;
  idPuntoRecogida?: string | null;

  puntoRecogida?: {
    nombre?: string;
    direccion?: string;
    municipio?: string;
    telefono?: string;
    horario?: string;
    googleMapsUrl?: string;
  } | null;

  PuntoRecogida?: {
    nombre?: string;
    direccion?: string;
    municipio?: string;
    telefono?: string;
    horario?: string;
    googleMapsUrl?: string;
  } | null;

  productos?: ProductoPedido[];
  Productos?: ProductoPedido[];
  items?: ProductoPedido[];
}

function normalizeEstado(value: unknown): EstadoPedido {
  const estado = String(value ?? "pendiente").toLowerCase();

  if (
    estado === "asignado" ||
    estado === "en_camino" ||
    estado === "entregado" ||
    estado === "cancelado"
  ) {
    return estado;
  }

  return "pendiente";
}

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);

  return `$${amount.toLocaleString("es-CO")} COP`;
}

function formatDate(value: unknown) {
  if (!value) return "Fecha no disponible";

  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value
  ) {
    const seconds = Number(
      (value as { seconds?: unknown }).seconds ?? 0
    );

    date = new Date(seconds * 1000);
  }

  if (!date || Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleString("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function getPedidoData(result: any): Pedido | null {
  if (!result) return null;

  if (result.data?.pedido) {
    return result.data.pedido;
  }

  if (result.data) {
    return result.data;
  }

  if (result.pedido) {
    return result.pedido;
  }

  return null;
}

function getProductos(pedido: Pedido): ProductoPedido[] {
  if (Array.isArray(pedido.productos)) {
    return pedido.productos;
  }

  if (Array.isArray(pedido.Productos)) {
    return pedido.Productos;
  }

  if (Array.isArray(pedido.items)) {
    return pedido.items;
  }

  return [];
}

function getProductoNombre(producto: ProductoPedido) {
  return (
    producto.nombre ||
    producto.Nombre ||
    "Producto"
  );
}

function getProductoCantidad(producto: ProductoPedido) {
  return Number(
    producto.cantidad ??
      producto.Cantidad ??
      1
  );
}

function getProductoPrecio(producto: ProductoPedido) {
  return Number(
    producto.precio ??
      producto.Precio ??
      0
  );
}

function getProductoSubtotal(producto: ProductoPedido) {
  const explicitSubtotal =
    producto.subtotal ??
    producto.Subtotal;

  if (explicitSubtotal !== undefined) {
    return Number(explicitSubtotal);
  }

  return (
    getProductoPrecio(producto) *
    getProductoCantidad(producto)
  );
}

function getPresentacion(producto: ProductoPedido) {
  if (
    producto.presentacionCantidad &&
    producto.presentacionNombre
  ) {
    return `${producto.presentacionCantidad} ${producto.presentacionNombre}`;
  }

  if (producto.unidad) {
    return producto.unidad;
  }

  if (producto.Unidad) {
    return producto.Unidad;
  }

  return "";
}

function getStepStatus(
  estado: EstadoPedido,
  step: number
) {
  const order = [
    "pendiente",
    "asignado",
    "en_camino",
    "entregado",
  ];

  if (estado === "cancelado") {
    return "cancelado";
  }

  const currentIndex = order.indexOf(estado);

  if (currentIndex >= step) {
    return "completed";
  }

  return "pending";
}

export default function PedidoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, loading: authLoading } = useAuth();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pedidoId = useMemo(() => {
    const value = params?.id;

    if (Array.isArray(value)) {
      return value[0] ?? "";
    }

    return value ? String(value) : "";
  }, [params]);

  const success = searchParams.get("success") === "1";

  const loadPedido = useCallback(async () => {
    if (!user || !pedidoId) return;

    try {
      setLoading(true);
      setError("");

      const token = await user.getIdToken();

      const response = await fetch(
        `/api/pedidos/${encodeURIComponent(pedidoId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "No fue posible cargar el pedido."
        );
      }

      const data = getPedidoData(result);

      if (!data) {
        throw new Error(
          "La respuesta no contiene información del pedido."
        );
      }

      setPedido(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el pedido."
      );
    } finally {
      setLoading(false);
    }
  }, [pedidoId, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(
        `/login?redirect=/pedidos/${encodeURIComponent(
          pedidoId
        )}`
      );
      return;
    }

    if (!pedidoId) {
      setError("No se encontró el identificador del pedido.");
      setLoading(false);
      return;
    }

    loadPedido();
  }, [
    authLoading,
    user,
    pedidoId,
    router,
    loadPedido,
  ]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-4 py-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--border)] bg-white p-8 text-center text-[var(--muted)]">
          Cargando pedido...
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !pedido) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <XCircle
              size={48}
              className="mx-auto mb-4 text-red-500"
            />

            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              No fue posible cargar el pedido
            </h1>

            <p className="mt-3 text-[var(--muted)]">
              {error ||
                "El pedido no existe o no está disponible."}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => loadPedido()}
                className="rounded-xl bg-[var(--primary)] px-5 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Intentar nuevamente
              </button>

              <Link
                href="/tienda"
                className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              >
                Volver a la tienda
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const estado = normalizeEstado(
    pedido.estado ?? pedido.Estado
  );

  const productos = getProductos(pedido);

  const total = Number(
    pedido.total ??
      pedido.Total ??
      productos.reduce(
        (sum, producto) =>
          sum + getProductoSubtotal(producto),
        0
      )
  );

  const subtotal = Number(
    pedido.subtotal ??
      pedido.Subtotal ??
      total
  );

  const costoEnvio = Number(
    pedido.costoEnvio ??
      pedido.CostoEnvio ??
      0
  );

  const tipoEntrega =
    pedido.tipoEntrega ??
    pedido.TipoEntrega ??
    "domicilio";

  const direccion =
    pedido.direccionEntrega ??
    pedido.DireccionEntrega ??
    "";

  const telefono =
    pedido.telefono ??
    pedido.Telefono ??
    "";

  const puntoRecogida =
    pedido.puntoRecogida ??
    pedido.PuntoRecogida ??
    null;

  const fechaCreacion =
    pedido.FechaCreacion ??
    pedido.fechaCreacion ??
    pedido.createdAt;

  const pedidoNumero =
    pedido.id ??
    pedido.IdPedido ??
    pedidoId;

  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/pedidos"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            <ArrowLeft size={17} />
            Mis pedidos
          </Link>
        </div>

        {success && (
          <div className="mb-6 flex gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800">
            <CheckCircle2
              size={25}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-bold">
                ¡Pedido realizado correctamente!
              </p>

              <p className="mt-1 text-sm">
                Hemos registrado tu pedido. Puedes consultar
                aquí su estado y los detalles de entrega.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">
              Pedido
            </p>

            <h1 className="mt-1 break-all text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
              #{pedidoNumero}
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              {formatDate(fechaCreacion)}
            </p>
          </div>

          <div>
            {estado === "cancelado" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
                <XCircle size={17} />
                Cancelado
              </span>
            ) : estado === "entregado" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                <CheckCircle2 size={17} />
                Entregado
              </span>
            ) : estado === "en_camino" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                <Truck size={17} />
                En camino
              </span>
            ) : estado === "asignado" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-700">
                <Package size={17} />
                Asignado
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                <Clock3 size={17} />
                Pendiente
              </span>
            )}
          </div>
        </div>

        {estado !== "cancelado" && (
          <section className="mb-6 rounded-2xl border border-[var(--border)] bg-white p-6">
            <h2 className="mb-6 text-lg font-semibold text-[var(--foreground)]">
              Estado del pedido
            </h2>

            <div className="grid gap-5 sm:grid-cols-4">
              {[
                {
                  label: "Pendiente",
                  icon: Clock3,
                  step: 0,
                },
                {
                  label: "Asignado",
                  icon: Package,
                  step: 1,
                },
                {
                  label: "En camino",
                  icon: Truck,
                  step: 2,
                },
                {
                  label: "Entregado",
                  icon: CheckCircle2,
                  step: 3,
                },
              ].map((item) => {
                const status = getStepStatus(
                  estado,
                  item.step
                );

                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="relative flex items-center gap-3 sm:block"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        status === "completed"
                          ? "bg-[var(--primary)] text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Icon size={20} />
                    </div>

                    <div className="mt-0 sm:mt-3">
                      <p
                        className={`text-sm font-semibold ${
                          status === "completed"
                            ? "text-[var(--foreground)]"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {item.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {estado === "cancelado" && (
          <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex gap-4">
              <XCircle
                size={24}
                className="shrink-0 text-red-600"
              />

              <div>
                <h2 className="font-semibold text-red-800">
                  Pedido cancelado
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  Este pedido fue cancelado y ya no continuará
                  con el proceso de entrega.
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <Package
                  size={21}
                  className="text-[var(--primary)]"
                />

                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Productos
                </h2>
              </div>

              {productos.length === 0 ? (
                <div className="rounded-xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                  No hay productos asociados a este pedido.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {productos.map((producto, index) => {
                    const cantidad =
                      getProductoCantidad(producto);

                    const precio =
                      getProductoPrecio(producto);

                    const subtotalProducto =
                      getProductoSubtotal(producto);

                    const presentacion =
                      getPresentacion(producto);

                    const key =
                      producto.id ||
                      producto.IdProducto ||
                      `${getProductoNombre(producto)}-${index}`;

                    return (
                      <div
                        key={key}
                        className="flex gap-4 py-5 first:pt-0 last:pb-0"
                      >
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface)]">
                          {producto.imagen ||
                          producto.imgPath ? (
                            <img
                              src={
                                producto.imagen ||
                                producto.imgPath
                              }
                              alt={getProductoNombre(
                                producto
                              )}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package
                              size={25}
                              className="text-[var(--muted)]"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--foreground)]">
                            {getProductoNombre(producto)}
                          </p>

                          {presentacion && (
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {presentacion}
                            </p>
                          )}

                          <p className="mt-1 text-sm text-[var(--muted)]">
                            Cantidad: {cantidad}
                          </p>

                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {formatCurrency(precio)} c/u
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-[var(--foreground)]">
                            {formatCurrency(
                              subtotalProducto
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                {tipoEntrega === "recogida" ? (
                  <MapPin
                    size={21}
                    className="text-[var(--primary)]"
                  />
                ) : (
                  <Truck
                    size={21}
                    className="text-[var(--primary)]"
                  />
                )}

                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Información de entrega
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[var(--muted)]">
                    Tipo de entrega
                  </p>

                  <p className="mt-1 font-medium text-[var(--foreground)]">
                    {tipoEntrega === "recogida"
                      ? "Recogida en punto"
                      : "Entrega a domicilio"}
                  </p>
                </div>

                {tipoEntrega === "domicilio" ? (
                  <>
                    {direccion && (
                      <div className="flex gap-3">
                        <MapPin
                          size={19}
                          className="mt-0.5 shrink-0 text-[var(--primary)]"
                        />

                        <div>
                          <p className="text-sm text-[var(--muted)]">
                            Dirección
                          </p>

                          <p className="mt-1 font-medium text-[var(--foreground)]">
                            {direccion}
                          </p>
                        </div>
                      </div>
                    )}

                    {telefono && (
                      <div className="flex gap-3">
                        <Phone
                          size={19}
                          className="mt-0.5 shrink-0 text-[var(--primary)]"
                        />

                        <div>
                          <p className="text-sm text-[var(--muted)]">
                            Teléfono
                          </p>

                          <p className="mt-1 font-medium text-[var(--foreground)]">
                            {telefono}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {puntoRecogida ? (
                      <div className="rounded-xl bg-[var(--surface)] p-4">
                        <p className="font-semibold text-[var(--foreground)]">
                          {puntoRecogida.nombre ||
                            "Punto de recogida"}
                        </p>

                        {puntoRecogida.direccion && (
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            {puntoRecogida.direccion}
                          </p>
                        )}

                        {puntoRecogida.municipio && (
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {puntoRecogida.municipio}
                          </p>
                        )}

                        {puntoRecogida.horario && (
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Horario:{" "}
                            {puntoRecogida.horario}
                          </p>
                        )}

                        {puntoRecogida.telefono && (
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            Teléfono:{" "}
                            {puntoRecogida.telefono}
                          </p>
                        )}

                        {puntoRecogida.googleMapsUrl && (
                          <a
                            href={
                              puntoRecogida.googleMapsUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline"
                          >
                            <MapPin size={16} />
                            Ver ubicación
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                        Punto de recogida seleccionado:
                        <span className="ml-1 font-medium text-[var(--foreground)]">
                          {pedido.IdPuntoRecogida ||
                            pedido.idPuntoRecogida ||
                            "No disponible"}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-[var(--border)] bg-white p-6 lg:sticky lg:top-6">
            <h2 className="mb-5 text-lg font-semibold text-[var(--foreground)]">
              Resumen del pedido
            </h2>

            <div className="space-y-3 border-b border-[var(--border)] pb-5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--muted)]">
                  Subtotal
                </span>

                <span className="font-medium text-[var(--foreground)]">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {costoEnvio > 0 && (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-[var(--muted)]">
                    Envío
                  </span>

                  <span className="font-medium text-[var(--foreground)]">
                    {formatCurrency(costoEnvio)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between py-5">
              <span className="font-semibold text-[var(--foreground)]">
                Total
              </span>

              <span className="text-xl font-bold text-[var(--primary)]">
                {formatCurrency(total)}
              </span>
            </div>

            <div className="space-y-3">
              <Link
                href="/tienda"
                className="block w-full rounded-xl bg-[var(--primary)] px-5 py-3 text-center font-semibold text-white transition hover:opacity-90"
              >
                Seguir comprando
              </Link>

              <Link
                href="/pedidos"
                className="block w-full rounded-xl border border-[var(--border)] px-5 py-3 text-center font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              >
                Ver mis pedidos
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}