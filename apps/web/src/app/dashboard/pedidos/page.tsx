"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";

type Estado =
  | "pendiente"
  | "asignado"
  | "en_camino"
  | "entregado"
  | "cancelado";

interface PedidoProducto {
  productoId: string;
  code: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad: string;
  IdGranja: string;
  IdMunicipalidad: string;
}

interface Pedido {
  id: string;
  usuarioId: string;
  nombreCliente: string;
  productos: PedidoProducto[];
  subtotal: number;
  total: number;
  estado: Estado;
  reservaId: string | null;
  IdMunicipalidad: string;
  direccionEntrega: string;
  repartidorId: string | null;
  fechaCreacion: unknown;
  ultimaActualizacion: unknown;
  fechaCancelacion: unknown;
}

interface Repartidor {
  uid: string;
  email: string;
  displayName: string;
  disabled: boolean;
  role: "repartidor";
}

const estados: Estado[] = [
  "pendiente",
  "asignado",
  "en_camino",
  "entregado",
  "cancelado",
];

const estadoLabel: Record<Estado, string> = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: unknown) {
  if (!value) return "—";

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return new Date(
      value.seconds * 1000,
    ).toLocaleString("es-CO");
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("es-CO");
    }
  }

  return "—";
}

function estadoClasses(estado: Estado) {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-100 text-yellow-800";

    case "asignado":
      return "bg-blue-100 text-blue-800";

    case "en_camino":
      return "bg-indigo-100 text-indigo-800";

    case "entregado":
      return "bg-green-100 text-green-800";

    case "cancelado":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function DashboardPedidosPage() {
  const {
    user,
    loading: authLoading,
    role,
  } = useAuth();

  const [pedidos, setPedidos] =
    useState<Pedido[]>([]);

  const [repartidores, setRepartidores] =
    useState<Repartidor[]>([]);

  const [estadoFiltro, setEstadoFiltro] =
    useState<"todos" | Estado>("todos");

  const [busqueda, setBusqueda] =
    useState("");

  const [pedidoExpandido, setPedidoExpandido] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState<string | null>(null);

  /*
   * ========================================================
   * API
   * ========================================================
   */

  const api = useCallback(
    async (
      path: string,
      method = "GET",
      body?: unknown,
    ) => {
      if (!user) {
        throw new Error(
          "Debes iniciar sesión.",
        );
      }

      const token =
        await user.getIdToken(true);

      const response = await fetch(path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
        },
        body: body
          ? JSON.stringify(body)
          : undefined,
        cache: "no-store",
      });

      let result: unknown = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message ===
            "string"
            ? result.message
            : "No fue posible completar la operación.";

        throw new Error(message);
      }

      return result;
    },
    [user],
  );

  /*
   * ========================================================
   * CARGAR PEDIDOS
   * ========================================================
   */

  const loadPedidos = useCallback(
    async () => {
      if (!user || role !== "admin") {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const query =
          estadoFiltro === "todos"
            ? ""
            : `?estado=${encodeURIComponent(
                estadoFiltro,
              )}`;

        const result =
          await api(
            `/api/pedidos${query}`,
          );

        if (
          result &&
          typeof result === "object" &&
          "data" in result &&
          Array.isArray(result.data)
        ) {
          setPedidos(
            result.data as Pedido[],
          );
        } else {
          setPedidos([]);
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar los pedidos.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      api,
      estadoFiltro,
      role,
      user,
    ],
  );

  /*
   * ========================================================
   * CARGAR REPARTIDORES
   * ========================================================
   */

  const loadRepartidores =
    useCallback(async () => {
      if (!user || role !== "admin") {
        return;
      }

      try {
        const result =
          await api(
            "/api/usuarios/roles",
          );

        if (
          result &&
          typeof result === "object" &&
          "data" in result &&
          Array.isArray(result.data)
        ) {
          const lista =
            result.data.filter(
              (
                item,
              ): item is Repartidor =>
                item &&
                typeof item ===
                  "object" &&
                "uid" in item &&
                "role" in item &&
                item.role ===
                  "repartidor",
            );

          setRepartidores(
            lista as Repartidor[],
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar los repartidores.",
        );
      }
    }, [api, role, user]);

  /*
   * ========================================================
   * INICIALIZACIÓN
   * ========================================================
   */

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      role !== "admin"
    ) {
      return;
    }

    void Promise.all([
      loadPedidos(),
      loadRepartidores(),
    ]);
  }, [
    authLoading,
    user,
    role,
    loadPedidos,
    loadRepartidores,
  ]);

  /*
   * ========================================================
   * CAMBIAR ESTADO
   * ========================================================
   */

  const cambiarEstado = async (
    pedido: Pedido,
    estado: Estado,
  ) => {
    try {
      setSaving(pedido.id);
      setError(null);

      await api(
        "/api/pedidos/estado",
        "POST",
        {
          pedidoId: pedido.id,
          estado,
        },
      );

      setPedidos((actuales) =>
        actuales.map((item) =>
          item.id === pedido.id
            ? {
                ...item,
                estado,
              }
            : item,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cambiar el estado.",
      );
    } finally {
      setSaving(null);
    }
  };

  /*
   * ========================================================
   * ASIGNAR REPARTIDOR
   * ========================================================
   */

  const asignarRepartidor =
    async (
      pedido: Pedido,
      repartidorId: string,
    ) => {
      if (!repartidorId) {
        return;
      }

      try {
        setSaving(pedido.id);
        setError(null);

        await api(
          "/api/pedidos/asignar",
          "POST",
          {
            pedidoId: pedido.id,
            repartidorId,
          },
        );

        setPedidos((actuales) =>
          actuales.map((item) =>
            item.id === pedido.id
              ? {
                  ...item,
                  repartidorId,
                  estado: "asignado",
                }
              : item,
          ),
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible asignar el repartidor.",
        );
      } finally {
        setSaving(null);
      }
    };

  /*
   * ========================================================
   * BÚSQUEDA + FILTRO
   * ========================================================
   */

  const pedidosFiltrados = useMemo(() => {
    const texto =
      busqueda
        .trim()
        .toLowerCase();

    return pedidos.filter(
      (pedido) => {
        if (!texto) {
          return true;
        }

        const contenido = [
          pedido.id,
          pedido.usuarioId,
          pedido.direccionEntrega,
          pedido.IdMunicipalidad,
          pedido.repartidorId ?? "",
          ...pedido.productos.map(
            (producto) =>
              `${producto.nombre} ${producto.code}`,
          ),
        ]
          .join(" ")
          .toLowerCase();

        return contenido.includes(
          texto,
        );
      },
    );
  }, [pedidos, busqueda]);

  /*
   * ========================================================
   * ESTADÍSTICAS
   * ========================================================
   */

  const estadisticas =
    useMemo(() => {
      return {
        total: pedidos.length,

        pendientes:
          pedidos.filter(
            (item) =>
              item.estado ===
              "pendiente",
          ).length,

        proceso:
          pedidos.filter(
            (item) =>
              item.estado ===
                "asignado" ||
              item.estado ===
                "en_camino",
          ).length,

        entregados:
          pedidos.filter(
            (item) =>
              item.estado ===
              "entregado",
          ).length,
      };
    }, [pedidos]);

  /*
   * ========================================================
   * ACCESO
   * ========================================================
   */

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-[var(--muted)]">
          Cargando pedidos…
        </p>
      </main>
    );
  }

  if (!user || role !== "admin") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h1 className="text-2xl font-bold">
            Acceso restringido
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Esta sección está disponible
            únicamente para administradores.
          </p>
        </div>
      </main>
    );
  }

  /*
   * ========================================================
   * RENDER
   * ========================================================
   */

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

      {/* CABECERA */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Gestión de pedidos
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Consulta, filtra y gestiona
            los pedidos realizados en la
            tienda.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadPedidos()
          }
          disabled={
            saving !== null
          }
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:border-[var(--primary)] disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* ESTADÍSTICAS */}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
          <p className="text-sm text-[var(--muted)]">
            Total
          </p>

          <p className="mt-1 text-3xl font-bold">
            {estadisticas.total}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
          <p className="text-sm text-[var(--muted)]">
            Pendientes
          </p>

          <p className="mt-1 text-3xl font-bold">
            {estadisticas.pendientes}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
          <p className="text-sm text-[var(--muted)]">
            En proceso
          </p>

          <p className="mt-1 text-3xl font-bold">
            {estadisticas.proceso}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
          <p className="text-sm text-[var(--muted)]">
            Entregados
          </p>

          <p className="mt-1 text-3xl font-bold">
            {estadisticas.entregados}
          </p>
        </div>

      </div>

      {/* BUSCADOR Y FILTRO */}

      <section className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">

        <div className="grid gap-3 md:grid-cols-[1fr_220px]">

          <div>
            <label
              htmlFor="buscar-pedido"
              className="mb-1 block text-xs font-semibold uppercase text-[var(--muted)]"
            >
              Buscar pedido
            </label>

            <input
              id="buscar-pedido"
              type="search"
              value={busqueda}
              onChange={(event) =>
                setBusqueda(
                  event.target.value,
                )
              }
              placeholder="ID, usuario, dirección, producto..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="estado-pedido"
              className="mb-1 block text-xs font-semibold uppercase text-[var(--muted)]"
            >
              Estado
            </label>

            <select
              id="estado-pedido"
              value={estadoFiltro}
              onChange={(event) =>
                setEstadoFiltro(
                  event.target.value as
                    | "todos"
                    | Estado,
                )
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm"
            >
              <option value="todos">
                Todos los estados
              </option>

              {estados.map(
                (estado) => (
                  <option
                    key={estado}
                    value={estado}
                  >
                    {
                      estadoLabel[
                        estado
                      ]
                    }
                  </option>
                ),
              )}
            </select>
          </div>

        </div>

        <p className="mt-3 text-xs text-[var(--muted)]">
          Mostrando{" "}
          {pedidosFiltrados.length} de{" "}
          {pedidos.length} pedidos.
        </p>

      </section>

      {/* LISTADO */}

      <section className="mt-6 space-y-4">

        {pedidosFiltrados.length ===
        0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <p className="font-semibold">
              No hay pedidos para
              mostrar.
            </p>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Prueba con otro estado o
              término de búsqueda.
            </p>
          </div>
        ) : (
          pedidosFiltrados.map(
            (pedido) => {
              const expandido =
                pedidoExpandido ===
                pedido.id;

              const repartidor =
                repartidores.find(
                  (item) =>
                    item.uid ===
                    pedido.repartidorId,
                );

              return (
                <article
                  key={pedido.id}
                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-sm"
                >

                  {/* RESUMEN */}

                  <button
                    type="button"
                    onClick={() =>
                      setPedidoExpandido(
                        expandido
                          ? null
                          : pedido.id,
                      )
                    }
                    className="w-full text-left transition hover:bg-[var(--surface)]"
                  >
                    <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto_auto_auto] md:items-center">

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-lg font-bold">
                            Pedido #
                            {pedido.id.slice(
                              0,
                              8,
                            )}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoClasses(
                              pedido.estado,
                            )}`}
                          >
                            {
                              estadoLabel[
                                pedido.estado
                              ]
                            }
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-[var(--muted)]">
                          {formatDate(
                            pedido.fechaCreacion,
                          )}
                        </p>

                        <p className="mt-1 text-sm text-[var(--foreground)]/70">
                          {pedido.productos.length}{" "}
                          {pedido.productos.length ===
                          1
                            ? "producto"
                            : "productos"}
                          {" · "}
                          {pedido.direccionEntrega}
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-xs text-[var(--muted)]">
                          Municipalidad
                        </p>

                        <p className="font-medium">
                          {
                            pedido.IdMunicipalidad
                          }
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-xs text-[var(--muted)]">
                          Total
                        </p>

                        <p className="text-xl font-bold text-[var(--primary)]">
                          {formatMoney(
                            pedido.total,
                          )}
                        </p>
                      </div>

                      <div className="flex justify-start md:justify-end">
                        <span className="text-xl text-[var(--muted)]">
                          {expandido
                            ? "▲"
                            : "▼"}
                        </span>
                      </div>

                    </div>
                  </button>

                  {/* DETALLE EXPANDIDO */}

                  {expandido && (
                    <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">

                      {/* RECIBO */}

                      <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">

                        {/* ENCABEZADO */}

                        <div className="border-b border-dashed border-[var(--border)] p-6 text-center">

                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                            Canastas Verdes
                          </p>

                          <h2 className="mt-2 text-2xl font-bold">
                            RECIBO DE PEDIDO
                          </h2>

                          <p className="mt-2 font-mono text-sm">
                            #{pedido.id}
                          </p>

                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {formatDate(
                              pedido.fechaCreacion,
                            )}
                          </p>

                        </div>

                        {/* DATOS */}

                        <div className="grid gap-4 border-b border-dashed border-[var(--border)] p-6 sm:grid-cols-2">

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                              Cliente
                            </p>

                            <p className="mt-1 break-all text-sm font-mono">
                              {
                                pedido.nombreCliente
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                              Estado
                            </p>

                            <span
                              className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${estadoClasses(
                                pedido.estado,
                              )}`}
                            >
                              {
                                estadoLabel[
                                  pedido.estado
                                ]
                              }
                            </span>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                              Municipalidad
                            </p>

                            <p className="mt-1 text-sm">
                              {
                                pedido.IdMunicipalidad
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                              Repartidor
                            </p>

                            <p className="mt-1 text-sm">
                              {repartidor
                                ? repartidor.displayName ||
                                  repartidor.email
                                : "Sin asignar"}
                            </p>
                          </div>

                          <div className="sm:col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                              Dirección de entrega
                            </p>

                            <p className="mt-1 text-sm">
                              {
                                pedido.direccionEntrega
                              }
                            </p>
                          </div>

                        </div>

                        {/* PRODUCTOS */}

                        <div className="p-6">

                          <h3 className="text-sm font-bold uppercase tracking-wider">
                            Detalle
                          </h3>

                          <div className="mt-4">

                            {pedido.productos.map(
                              (
                                producto,
                              ) => (
                                <div
                                  key={
                                    producto.productoId
                                  }
                                  className="flex items-start justify-between gap-4 border-b border-dashed border-[var(--border)] py-4 last:border-b-0"
                                >
                                  <div className="min-w-0">

                                    <p className="font-semibold">
                                      {
                                        producto.nombre
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-[var(--muted)]">
                                      Código:{" "}
                                      {
                                        producto.code
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-[var(--muted)]">
                                      {
                                        producto.cantidad
                                      }{" "}
                                      {
                                        producto.unidad
                                      }{" "}
                                      ×{" "}
                                      {formatMoney(
                                        producto.precioUnitario,
                                      )}
                                    </p>

                                  </div>

                                  <p className="shrink-0 font-semibold">
                                    {formatMoney(
                                      producto.subtotal,
                                    )}
                                  </p>

                                </div>
                              ),
                            )}

                          </div>

                          {/* TOTALES */}

                          <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4">

                            <div className="flex justify-between text-sm">
                              <span>
                                Subtotal
                              </span>

                              <span>
                                {formatMoney(
                                  pedido.subtotal,
                                )}
                              </span>
                            </div>

                            <div className="flex justify-between border-t border-dashed border-[var(--border)] pt-3 text-lg font-bold">
                              <span>
                                TOTAL
                              </span>

                              <span className="text-[var(--primary)]">
                                {formatMoney(
                                  pedido.total,
                                )}
                              </span>
                            </div>

                          </div>

                        </div>

                        {/* GESTIÓN */}

                        <div className="border-t border-dashed border-[var(--border)] bg-[var(--surface)] p-6">

                          <h3 className="text-sm font-bold uppercase tracking-wider">
                            Gestión del pedido
                          </h3>

                          <div className="mt-4 grid gap-4 sm:grid-cols-2">

                            {/* REPARTIDOR */}

                            <div>
                              <label
                                htmlFor={`repartidor-${pedido.id}`}
                                className="text-sm font-semibold"
                              >
                                Repartidor
                              </label>

                              <select
                                id={`repartidor-${pedido.id}`}
                                value={
                                  pedido.repartidorId ??
                                  ""
                                }
                                disabled={
                                  saving ===
                                    pedido.id ||
                                  pedido.estado ===
                                    "entregado" ||
                                  pedido.estado ===
                                    "cancelado"
                                }
                                onChange={(
                                  event,
                                ) =>
                                  void asignarRepartidor(
                                    pedido,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm disabled:opacity-50"
                              >
                                <option value="">
                                  Seleccionar repartidor
                                </option>

                                {repartidores
                                  .filter(
                                    (
                                      item,
                                    ) =>
                                      !item.disabled,
                                  )
                                  .map(
                                    (
                                      repartidor,
                                    ) => (
                                      <option
                                        key={
                                          repartidor.uid
                                        }
                                        value={
                                          repartidor.uid
                                        }
                                      >
                                        {repartidor.displayName ||
                                          repartidor.email}
                                      </option>
                                    ),
                                  )}
                              </select>
                            </div>

                            {/* ESTADO */}

                            <div>
                              <label
                                htmlFor={`estado-${pedido.id}`}
                                className="text-sm font-semibold"
                              >
                                Estado
                              </label>

                              <select
                                id={`estado-${pedido.id}`}
                                value={
                                  pedido.estado
                                }
                                disabled={
                                  saving ===
                                  pedido.id
                                }
                                onChange={(
                                  event,
                                ) =>
                                  void cambiarEstado(
                                    pedido,
                                    event
                                      .target
                                      .value as Estado,
                                  )
                                }
                                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm disabled:opacity-50"
                              >
                                {estados.map(
                                  (
                                    estado,
                                  ) => (
                                    <option
                                      key={
                                        estado
                                      }
                                      value={
                                        estado
                                      }
                                    >
                                      {
                                        estadoLabel[
                                          estado
                                        ]
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>

                          </div>

                          {saving ===
                            pedido.id && (
                            <p className="mt-4 text-xs text-[var(--muted)]">
                              Guardando cambios…
                            </p>
                          )}

                        </div>

                        {/* PIE */}

                        <div className="border-t border-dashed border-[var(--border)] p-5 text-center text-xs text-[var(--muted)]">
                          Pedido gestionado desde
                          el panel administrativo
                          de Canastas Verdes.
                        </div>

                      </div>

                    </div>
                  )}

                </article>
              );
            },
          )
        )}

      </section>
    </main>
  );
}