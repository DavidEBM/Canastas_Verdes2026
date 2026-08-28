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

export default function DashboardPedidosPage() {
  const {
    user,
    loading: authLoading,
    role,
  } = useAuth();

  const [pedidos, setPedidos] = useState<Pedido[]>(
    [],
  );

  const [repartidores, setRepartidores] =
    useState<Repartidor[]>([]);

  const [estadoFiltro, setEstadoFiltro] =
    useState<"todos" | Estado>("todos");

  const [pedidoSeleccionado, setPedidoSeleccionado] =
    useState<Pedido | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState<string | null>(null);

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
      });

      const result: unknown =
        await response.json();

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

  const loadPedidos = useCallback(
    async () => {
      if (!user) return;

      try {
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
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar los pedidos.",
        );
      }
    },
    [api, estadoFiltro, user],
  );

  const loadRepartidores =
    useCallback(async () => {
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
          setRepartidores(
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
            ) as Repartidor[],
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar los repartidores.",
        );
      }
    }, [api]);

  useEffect(() => {
    if (!user || role !== "admin") {
      return;
    }

    setLoading(true);

    Promise.all([
      loadPedidos(),
      loadRepartidores(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [
    user,
    role,
    loadPedidos,
    loadRepartidores,
  ]);

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

      await loadPedidos();

      setPedidoSeleccionado(
        (current) =>
          current
            ? {
                ...current,
                estado,
              }
            : null,
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

  const asignarRepartidor =
    async (
      pedido: Pedido,
      repartidorId: string,
    ) => {
      if (!repartidorId) return;

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

        await loadPedidos();

        const repartidor =
          repartidores.find(
            (item) =>
              item.uid ===
              repartidorId,
          );

        setPedidoSeleccionado(
          (current) =>
            current
              ? {
                  ...current,
                  repartidorId,
                  estado: "asignado",
                }
              : null,
        );

        if (repartidor) {
          setError(null);
        }
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

  const estadisticas =
    useMemo(() => {
      return {
        total: pedidos.length,
        pendientes: pedidos.filter(
          (item) =>
            item.estado ===
            "pendiente",
        ).length,
        enProceso: pedidos.filter(
          (item) =>
            item.estado ===
              "asignado" ||
            item.estado ===
              "en_camino",
        ).length,
        entregados: pedidos.filter(
          (item) =>
            item.estado ===
            "entregado",
        ).length,
      };
    }, [pedidos]);

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-[var(--muted)]">
          Cargando pedidos…
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="text-2xl font-bold">
          Acceso restringido
        </h1>

        <p className="mt-2 text-[var(--muted)]">
          Debes iniciar sesión.
        </p>
      </main>
    );
  }

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="text-2xl font-bold">
          Acceso restringido
        </h1>

        <p className="mt-2 text-[var(--muted)]">
          Esta sección está disponible
          únicamente para administradores.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Gestión de pedidos
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Administra pedidos, repartidores
            y estados de entrega.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadPedidos()}
          disabled={saving !== null}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--primary)] disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Estadísticas */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] p-5">
          <p className="text-sm text-[var(--muted)]">
            Total
          </p>
          <p className="mt-1 text-3xl font-bold">
            {estadisticas.total}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-5">
          <p className="text-sm text-[var(--muted)]">
            Pendientes
          </p>
          <p className="mt-1 text-3xl font-bold">
            {estadisticas.pendientes}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-5">
          <p className="text-sm text-[var(--muted)]">
            En proceso
          </p>
          <p className="mt-1 text-3xl font-bold">
            {estadisticas.enProceso}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-5">
          <p className="text-sm text-[var(--muted)]">
            Entregados
          </p>
          <p className="mt-1 text-3xl font-bold">
            {estadisticas.entregados}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <label
          htmlFor="estado"
          className="text-sm font-semibold"
        >
          Estado:
        </label>

        <select
          id="estado"
          value={estadoFiltro}
          onChange={(event) =>
            setEstadoFiltro(
              event.target.value as
                | "todos"
                | Estado,
            )
          }
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
        >
          <option value="todos">
            Todos
          </option>

          {estados.map((estado) => (
            <option
              key={estado}
              value={estado}
            >
              {estadoLabel[estado]}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="px-4 py-3">
                Pedido
              </th>

              <th className="px-4 py-3">
                Usuario
              </th>

              <th className="px-4 py-3">
                Fecha
              </th>

              <th className="px-4 py-3">
                Total
              </th>

              <th className="px-4 py-3">
                Estado
              </th>

              <th className="px-4 py-3">
                Repartidor
              </th>

              <th className="px-4 py-3">
                Acción
              </th>
            </tr>
          </thead>

          <tbody>
            {pedidos.map((pedido) => {
              const repartidor =
                repartidores.find(
                  (item) =>
                    item.uid ===
                    pedido.repartidorId,
                );

              return (
                <tr
                  key={pedido.id}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPedidoSeleccionado(
                          pedido,
                        )
                      }
                      className="font-semibold text-[var(--primary)] hover:underline"
                    >
                      #{pedido.id.slice(
                        0,
                        8,
                      )}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">
                      {pedido.usuarioId.slice(
                        0,
                        12,
                      )}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {formatDate(
                      pedido.fechaCreacion,
                    )}
                  </td>

                  <td className="px-4 py-3 font-semibold">
                    {formatMoney(
                      pedido.total,
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold">
                      {
                        estadoLabel[
                          pedido.estado
                        ]
                      }
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {repartidor
                      ? repartidor.displayName ||
                        repartidor.email
                      : "Sin asignar"}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPedidoSeleccionado(
                          pedido,
                        )
                      }
                      className="font-semibold text-[var(--primary)]"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              );
            })}

            {pedidos.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-[var(--muted)]"
                >
                  No hay pedidos para
                  mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / detalle */}
      {pedidoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pedido-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--background)] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="pedido-title"
                  className="text-xl font-bold"
                >
                  Pedido #
                  {pedidoSeleccionado.id}
                </h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Creado:{" "}
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
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">
                  Usuario
                </p>
                <p className="mt-1 font-mono text-sm">
                  {
                    pedidoSeleccionado.usuarioId
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">
                  Municipalidad
                </p>
                <p className="mt-1">
                  {
                    pedidoSeleccionado.IdMunicipalidad
                  }
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">
                  Dirección
                </p>
                <p className="mt-1">
                  {
                    pedidoSeleccionado.direccionEntrega
                  }
                </p>
              </div>
            </div>

            {/* Productos */}
            <div className="mt-6">
              <h3 className="font-bold">
                Productos
              </h3>

              <div className="mt-3 divide-y rounded-lg border border-[var(--border)]">
                {pedidoSeleccionado.productos.map(
                  (producto) => (
                    <div
                      key={
                        producto.productoId
                      }
                      className="flex items-center justify-between gap-4 p-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {
                            producto.nombre
                          }
                        </p>

                        <p className="text-xs text-[var(--muted)]">
                          {producto.cantidad}{" "}
                          {producto.unidad}
                          {" × "}
                          {formatMoney(
                            producto.precioUnitario,
                          )}
                        </p>
                      </div>

                      <p className="font-semibold">
                        {formatMoney(
                          producto.subtotal,
                        )}
                      </p>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <p className="text-lg font-bold">
                  Total:{" "}
                  {formatMoney(
                    pedidoSeleccionado.total,
                  )}
                </p>
              </div>
            </div>

            {/* Gestión */}
            <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="repartidor"
                  className="text-sm font-semibold"
                >
                  Repartidor
                </label>

                <select
                  id="repartidor"
                  value={
                    pedidoSeleccionado.repartidorId ??
                    ""
                  }
                  disabled={
                    saving ===
                    pedidoSeleccionado.id ||
                    pedidoSeleccionado.estado ===
                      "entregado" ||
                    pedidoSeleccionado.estado ===
                      "cancelado"
                  }
                  onChange={(event) =>
                    void asignarRepartidor(
                      pedidoSeleccionado,
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">
                    Seleccionar repartidor
                  </option>

                  {repartidores
                    .filter(
                      (item) =>
                        !item.disabled,
                    )
                    .map(
                      (repartidor) => (
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

              <div>
                <label
                  htmlFor="nuevo-estado"
                  className="text-sm font-semibold"
                >
                  Estado
                </label>

                <select
                  id="nuevo-estado"
                  value={
                    pedidoSeleccionado.estado
                  }
                  disabled={
                    saving ===
                    pedidoSeleccionado.id
                  }
                  onChange={(event) =>
                    void cambiarEstado(
                      pedidoSeleccionado,
                      event.target.value as Estado,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm disabled:opacity-50"
                >
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

            {saving ===
              pedidoSeleccionado.id && (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Guardando cambios…
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}