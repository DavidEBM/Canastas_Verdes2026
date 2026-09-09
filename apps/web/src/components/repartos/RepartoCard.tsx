"use client";

import { useCallback, useState } from "react";

import FirmaRecibido, {
  type FirmaRecibidoData,
} from "@/components/repartos/FirmaRecibido";

import type { Reparto } from "@/lib/repartos/types";

interface RepartoCardProps {
  reparto: Reparto;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

function formatPrice(
  value: number | undefined | null,
) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value: unknown) {
  if (!value) {
    return "Sin fecha";
  }

  try {
    if (
      typeof value === "object" &&
      value !== null &&
      "seconds" in value
    ) {
      const seconds = Number(
        (value as { seconds: number }).seconds,
      );

      return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(seconds * 1000));
    }

    const date = new Date(
      value as string | number | Date,
    );

    if (Number.isNaN(date.getTime())) {
      return "Sin fecha";
    }

    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "Sin fecha";
  }
}

function nombreCompleto(
  persona:
    | {
        nombres?: string;
        apellidos?: string;
        nombreCompleto?: string;
      }
    | null
    | undefined,
) {
  if (!persona) {
    return "Sin asignar";
  }

  if (persona.nombreCompleto?.trim()) {
    return persona.nombreCompleto;
  }

  return (
    `${persona.nombres ?? ""} ${persona.apellidos ?? ""}`
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Sin nombre"
  );
}

function estadoTexto(estado: string) {
  switch (estado) {
    case "pendiente":
      return "Pendiente";

    case "asignado":
      return "Asignado";

    case "en_camino":
      return "En camino";

    case "entregado":
      return "Entregado";

    case "cancelado":
      return "Cancelado";

    default:
      return estado;
  }
}

function estadoClase(estado: string) {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-100 text-yellow-800";

    case "asignado":
      return "bg-blue-100 text-blue-800";

    case "en_camino":
      return "bg-purple-100 text-purple-800";

    case "entregado":
      return "bg-green-100 text-green-800";

    case "cancelado":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function RepartoCard({
  reparto,
  isAdmin = false,
  onRefresh,
}: RepartoCardProps) {
  const [expanded, setExpanded] = useState(false);

  const [
    mostrarRecepcion,
    setMostrarRecepcion,
  ] = useState(false);

  const [
    firmaRecibido,
    setFirmaRecibido,
  ] = useState<FirmaRecibidoData | null>(null);

  const [procesando, setProcesando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const { pedido } = reparto;

  /*
   * resumen puede ser opcional en el tipo Reparto.
   *
   * Para evitar errores de TypeScript durante el
   * build de producción, utilizamos valores por
   * defecto cuando no existe.
   *
   * Cuando la API entrega resumen, se utilizan
   * exactamente los valores originales.
   */
  const resumen = reparto.resumen ?? {
    fechaCreacion: null,
    clienteNombre: "Sin nombre",
    municipioNombre: "Sin municipio",
    cantidadProductos: 0,
    total: 0,
  };

  /*
   * IMPORTANTE:
   *
   * Esta función debe estar dentro de RepartoCard.
   *
   * useCallback hace que la referencia de la función
   * no cambie en cada renderizado.
   *
   * Esto evita que FirmaRecibido ejecute su useEffect
   * continuamente provocando:
   *
   * FirmaRecibido -> onChange -> setState ->
   * RepartoCard render -> nueva función -> useEffect...
   */
  const manejarCambioFirma = useCallback(
    (data: FirmaRecibidoData) => {
      setFirmaRecibido(data);
    },
    [],
  );

  async function obtenerToken() {
    const { auth } = await import("@/lib/firebase");

    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error(
        "No hay una sesión activa.",
      );
    }

    return currentUser.getIdToken();
  }

  async function cambiarEstado(
    estado: "asignado" | "en_camino",
  ) {
    try {
      setProcesando(true);
      setError(null);
      setMensaje(null);

      const token = await obtenerToken();

      const response = await fetch(
        `/api/pedidos/${reparto.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            estado,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "No fue posible actualizar el pedido.",
        );
      }

      setMensaje(
        "Estado actualizado correctamente.",
      );

      onRefresh?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error.",
      );
    } finally {
      setProcesando(false);
    }
  }

  async function registrarRecepcion() {
    if (
      !firmaRecibido ||
      !firmaRecibido.valido
    ) {
      setError(
        "Debes registrar una firma o confirmación textual.",
      );

      return;
    }

    try {
      setProcesando(true);
      setError(null);
      setMensaje(null);

      const token = await obtenerToken();

      const nombre = nombreCompleto(
        reparto.cliente,
      );

      const response = await fetch(
        `/api/repartos/${reparto.id}/recibido`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            metodo: firmaRecibido.metodo,
            valor: firmaRecibido.valor,
            recibidoPor:
              firmaRecibido.metodo ===
              "texto"
                ? firmaRecibido.valor
                : nombre,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "No fue posible registrar la recepción.",
        );
      }

      setMensaje(
        "Recepción registrada correctamente. El pedido ahora está entregado.",
      );

      setMostrarRecepcion(false);
      setFirmaRecibido(null);

      onRefresh?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error.",
      );
    } finally {
      setProcesando(false);
    }
  }

  async function abrirPDF() {
    try {
      setProcesando(true);
      setError(null);
      setMensaje(null);

      const token = await obtenerToken();

      const response = await fetch(
        `/api/repartos/${reparto.id}/pdf`,
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
          "No fue posible generar el recibo PDF.";

        try {
          const data =
            await response.json();

          message =
            data?.message ||
            data?.error ||
            message;
        } catch {
          // La respuesta no era JSON.
        }

        throw new Error(message);
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(blob);

      /*
       * Creamos un enlace temporal para abrir
       * el PDF en una pestaña nueva.
       *
       * Esto permite conservar el token en la
       * petición sin exponer la ruta del PDF.
       */
      const link =
        document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel =
        "noopener noreferrer";

      document.body.appendChild(link);

      link.click();

      link.remove();

      /*
       * Dejamos la URL disponible durante un
       * tiempo suficiente para que el navegador
       * cargue el documento.
       */
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible generar el recibo PDF.",
      );
    } finally {
      setProcesando(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <button
        type="button"
        onClick={() =>
          setExpanded(
            (value) => !value,
          )
        }
        className="w-full p-5 text-left transition hover:bg-[var(--surface)]"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[var(--foreground)]">
                Pedido #{reparto.id}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${estadoClase(
                  pedido.estado,
                )}`}
              >
                {estadoTexto(
                  pedido.estado,
                )}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {formatDate(
                resumen.fechaCreacion,
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-gray-500">
                Cliente
              </p>

              <p className="font-semibold">
                {resumen.clienteNombre}
              </p>
            </div>

            <div>
              <p className="text-gray-500">
                Municipio
              </p>

              <p className="font-semibold">
                {resumen.municipioNombre}
              </p>
            </div>

            <div>
              <p className="text-gray-500">
                Productos
              </p>

              <p className="font-semibold">
                {resumen.cantidadProductos}
              </p>
            </div>

            <div>
              <p className="text-gray-500">
                Total
              </p>

              <p className="font-bold text-[var(--primary)]">
                {formatPrice(
                  resumen.total,
                )}
              </p>
            </div>
          </div>

          <span className="text-xl text-gray-400">
            {expanded
              ? "▲"
              : "▼"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] p-5">
          {mensaje && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {mensaje}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl bg-[var(--surface)] p-4">
              <h3 className="mb-3 font-bold text-[var(--primary)]">
                Cliente
              </h3>

              <div className="space-y-2 text-sm">
                <p>
                  <strong>
                    Nombre:
                  </strong>{" "}
                  {nombreCompleto(
                    reparto.cliente,
                  )}
                </p>

                <p>
                  <strong>
                    Correo:
                  </strong>{" "}
                  {reparto.cliente
                    .correo ||
                    "No registrado"}
                </p>

                <p>
                  <strong>
                    Teléfono:
                  </strong>{" "}
                  {reparto.cliente
                    .telefono ||
                    "No registrado"}
                </p>

                {reparto.modalidadEntrega ===
                  "domicilio" && (
                  <p>
                    <strong>
                      Dirección:
                    </strong>{" "}
                    {reparto.cliente
                      .direccion ||
                      pedido.direccionEntrega ||
                      "No registrada"}
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-xl bg-[var(--surface)] p-4">
              <h3 className="mb-3 font-bold text-[var(--primary)]">
                Repartidor
              </h3>

              <div className="space-y-2 text-sm">
                <p>
                  <strong>
                    Nombre:
                  </strong>{" "}
                  {nombreCompleto(
                    reparto.repartidor,
                  )}
                </p>

                <p>
                  <strong>
                    Correo:
                  </strong>{" "}
                  {reparto.repartidor
                    ?.correo ||
                    "No registrado"}
                </p>

                <p>
                  <strong>
                    Teléfono:
                  </strong>{" "}
                  {reparto.repartidor
                    ?.telefono ||
                    "No registrado"}
                </p>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-[var(--border)] p-4">
            <h3 className="mb-3 font-bold text-[var(--primary)]">
              Información de entrega
            </h3>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p>
                <strong>
                  Municipio:
                </strong>{" "}
                {reparto
                  .municipalidad
                  .nombre ||
                  "No registrado"}
              </p>

              <p>
                <strong>
                  Modalidad:
                </strong>{" "}
                {reparto.modalidadEntrega ===
                "recogida"
                  ? "Recogida"
                  : "Domicilio"}
              </p>

              {reparto.modalidadEntrega ===
                "domicilio" && (
                <p className="sm:col-span-2">
                  <strong>
                    Dirección:
                  </strong>{" "}
                  {pedido
                    .direccionEntrega ||
                    reparto.cliente
                      .direccion ||
                    "No registrada"}
                </p>
              )}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 font-bold text-[var(--primary)]">
              Productos
            </h3>

            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--surface)]">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      Producto
                    </th>

                    <th className="px-4 py-3 text-center">
                      Cantidad
                    </th>

                    <th className="px-4 py-3 text-left">
                      Unidad
                    </th>

                    <th className="px-4 py-3 text-right">
                      Precio
                    </th>

                    <th className="px-4 py-3 text-right">
                      Subtotal
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pedido.productos.map(
                    (
                      producto,
                      index,
                    ) => (
                      <tr
                        key={`${producto.productoId}-${index}`}
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold">
                            {
                              producto.nombre
                            }
                          </div>

                          {producto.code && (
                            <div className="text-xs text-gray-500">
                              Código:{" "}
                              {
                                producto.code
                              }
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center font-semibold">
                          {
                            producto.cantidad
                          }
                        </td>

                        <td className="px-4 py-3">
                          {producto.unidad ||
                            "Unidad"}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {formatPrice(
                            producto.precioUnitario,
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold">
                          {formatPrice(
                            producto.subtotal,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 flex justify-end">
            <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-4">
              <h3 className="mb-3 font-bold text-[var(--primary)]">
                Resumen de costos
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span>
                    Productos
                  </span>

                  <span className="text-right">
                    {formatPrice(
                      reparto.costos
                        .subtotalProductos,
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>
                    Entrega
                  </span>

                  <span className="text-right">
                    {formatPrice(
                      reparto.costos
                        .entrega,
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>
                    Logística
                  </span>

                  <span className="text-right">
                    {formatPrice(
                      reparto.costos
                        .logistica,
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>
                    Almacenamiento
                  </span>

                  <span className="text-right">
                    {formatPrice(
                      reparto.costos
                        .almacenamiento,
                    )}
                  </span>
                </div>

                <div className="mt-3 flex justify-between gap-4 border-t border-[var(--border)] pt-3 text-base font-bold">
                  <span>
                    Total
                  </span>

                  <span className="text-right text-[var(--primary)]">
                    {formatPrice(
                      reparto.costos
                        .total,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {pedido.estado ===
            "entregado" &&
            reparto.firma && (
              <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
                <h3 className="mb-3 font-bold text-green-800">
                  Recepción registrada
                </h3>

                <div className="space-y-2 text-sm text-green-900">
                  <p>
                    <strong>
                      Método:
                    </strong>{" "}
                    {reparto.firma
                      .metodo ===
                    "manuscrita"
                      ? "Firma manuscrita"
                      : "Confirmación textual"}
                  </p>

                  {reparto.firma
                    .metodo ===
                    "texto" && (
                    <p>
                      <strong>
                        Confirmación:
                      </strong>{" "}
                      {
                        reparto
                          .firma
                          .valor
                      }
                    </p>
                  )}

                  {reparto.firma
                    .recibidoPor && (
                    <p>
                      <strong>
                        Recibido por:
                      </strong>{" "}
                      {
                        reparto
                          .firma
                          .recibidoPor
                      }
                    </p>
                  )}

                  {reparto.firma
                    .metodo ===
                    "manuscrita" &&
                    reparto.firma
                      .valor && (
                      <div className="mt-3">
                        <p className="mb-2 font-semibold">
                          Firma:
                        </p>

                        <div className="inline-block rounded-lg border border-green-200 bg-white p-2">
                          <img
                            src={
                              reparto
                                .firma
                                .valor
                            }
                            alt="Firma del receptor"
                            className="max-h-32 max-w-full"
                          />
                        </div>
                      </div>
                    )}

                  {reparto.firma
                    .fechaRecibido && (
                    <p>
                      <strong>
                        Fecha:
                      </strong>{" "}
                      {formatDate(
                        reparto
                          .firma
                          .fechaRecibido,
                      )}
                    </p>
                  )}
                </div>
              </section>
            )}

          {pedido.estado ===
            "en_camino" && (
            <section className="mt-6">
              {!mostrarRecepcion ? (
                <button
                  type="button"
                  disabled={
                    procesando
                  }
                  onClick={() =>
                    setMostrarRecepcion(
                      true,
                    )
                  }
                  className="w-full rounded-lg bg-[var(--primary)] px-4 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Registrar recepción
                </button>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <FirmaRecibido
                    nombreCliente={nombreCompleto(
                      reparto.cliente,
                    )}
                    onChange={
                      manejarCambioFirma
                    }
                    disabled={
                      procesando
                    }
                  />

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={
                        procesando
                      }
                      onClick={() => {
                        setMostrarRecepcion(
                          false,
                        );

                        setFirmaRecibido(
                          null,
                        );
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={
                        procesando ||
                        !firmaRecibido?.valido
                      }
                      onClick={
                        registrarRecepcion
                      }
                      className="rounded-lg bg-[var(--primary)] px-5 py-3 font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {procesando
                        ? "Registrando..."
                        : "Confirmar recepción y entregar"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {isAdmin &&
              pedido.estado ===
                "pendiente" && (
                <button
                  type="button"
                  disabled={
                    procesando
                  }
                  onClick={() =>
                    cambiarEstado(
                      "asignado",
                    )
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  Asignar
                </button>
              )}

            {pedido.estado ===
              "asignado" && (
              <button
                type="button"
                disabled={
                  procesando
                }
                onClick={() =>
                  cambiarEstado(
                    "en_camino",
                  )
                }
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:opacity-50 disabled:opacity-50"
              >
                Marcar en camino
              </button>
            )}

            <button
              type="button"
              onClick={abrirPDF}
              disabled={procesando}
              className="rounded-lg border border-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary)] hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {procesando
                ? "Generando PDF..."
                : "Ver recibo PDF"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

