"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface ProductoRecibo {
  productoId: string;
  code: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad: string;
}

interface ClienteRecibo {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  correo: string;
  telefono: string;
  direccion: string;
}

interface RepartidorRecibo {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  telefono: string;
}

interface MunicipalidadRecibo {
  id: string;
  nombre: string;
}

interface FirmaRecibo {
  metodo: "manuscrita" | "texto";
  valor: string | null;
  recibidoPor: string | null;
  fechaRecibido: string | null;
}

interface ReciboData {
  id: string;
  estado: "entregado";
  fechaCreacion: string | null;
  fechaEntrega: string | null;
  modalidadEntrega: "domicilio" | "recogida";
  cliente: ClienteRecibo;
  repartidor: RepartidorRecibo | null;
  municipalidad: MunicipalidadRecibo | null;
  direccionEntrega: string;
  productos: ProductoRecibo[];
  costos: {
    subtotalProductos: number;
    entrega: number;
    logistica: number;
    almacenamiento: number;
    total: number;
  };
  firma: FirmaRecibo | null;
  verificacion: {
    valido: boolean;
    mensaje: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: ReciboData;
  error?: string;
  message?: string;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "No disponible";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  }).format(value);
}

function capitalizar(value: string) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function iniciales(nombre: string) {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) {
    return "CV";
  }

  return partes
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--secondary)] border-t-[var(--primary)]" />

            <p className="mt-5 text-sm font-medium text-[var(--foreground)]">
              Verificando recibo...
            </p>

            <p className="mt-2 text-center text-sm text-gray-500">
              Estamos consultando la información de la entrega.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function ErrorState({
  message,
}: {
  message: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <svg
                className="h-10 w-10 text-red-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  d="M12 8v4"
                  strokeLinecap="round"
                />
                <path
                  d="M12 16h.01"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-[var(--foreground)]">
              No fue posible verificar el recibo
            </h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-gray-600">
              {message}
            </p>

            <Link
              href="/"
              className="mt-7 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Ir a Canastas Verdes
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-6 w-1 rounded-full bg-[var(--primary)]" />

      <h2 className="text-base font-bold text-[var(--foreground)]">
        {children}
      </h2>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <span className="text-sm font-medium text-[var(--foreground)] sm:text-right">
        {value || "No disponible"}
      </span>
    </div>
  );
}

export default function ReciboPage() {
  const params = useParams();

  const pedidoId = useMemo(() => {
    const rawId = params?.id;

    if (Array.isArray(rawId)) {
      return rawId[0] ?? "";
    }

    return typeof rawId === "string" ? rawId : "";
  }, [params]);

  const [data, setData] = useState<ReciboData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pedidoId) {
      setError("No se proporcionó un identificador de recibo.");
      setLoading(false);
      return;
    }

    let activo = true;

    async function obtenerRecibo() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/pedidos/${encodeURIComponent(
            pedidoId,
          )}/recibo`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "No fue posible consultar el recibo.",
          );
        }

        if (!result.data) {
          throw new Error(
            "La información del recibo no está disponible.",
          );
        }

        if (activo) {
          setData(result.data);
        }
      } catch (err) {
        if (!activo) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al consultar el recibo.",
        );
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    }

    obtenerRecibo();

    return () => {
      activo = false;
    };
  }, [pedidoId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return (
      <ErrorState
        message={
          error ||
          "No se encontró información válida para este recibo."
        }
      />
    );
  }

  const nombreCliente =
    data.cliente.nombreCompleto ||
    "Cliente";

  const nombreRepartidor =
    data.repartidor?.nombreCompleto ||
    "No asignado";

  const firmaManuscrita =
    data.firma?.metodo === "manuscrita" &&
    typeof data.firma.valor === "string" &&
    data.firma.valor.startsWith(
      "data:image/",
    );

  const firmaTexto =
    data.firma?.metodo === "texto"
      ? data.firma.valor
      : null;

  return (
    <main className="min-h-screen bg-[var(--background)] px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* ENCABEZADO */}
        <header className="mb-5 overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
          <div className="bg-[var(--primary)] px-6 py-7 text-center text-white sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-black text-[var(--primary)] shadow-sm">
              CV
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Canastas Verdes
            </h1>

            <p className="mt-1 text-sm text-white/85">
              Recibo de entrega
            </p>
          </div>

          {/* VERIFICACIÓN */}
          <div className="flex items-center gap-4 bg-[var(--surface)] px-6 py-5 sm:px-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  d="m5 12 4 4L19 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <p className="text-base font-bold text-[var(--primary)]">
                Entrega confirmada
              </p>

              <p className="mt-0.5 text-xs text-gray-600">
                Este recibo corresponde a una entrega registrada.
              </p>
            </div>
          </div>
        </header>

        {/* IDENTIFICACIÓN */}
        <section className="mb-5 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle>
            Información del pedido
          </SectionTitle>

          <div className="divide-y divide-gray-100">
            <InfoRow
              label="Número de pedido"
              value={`#${data.id}`}
            />

            <InfoRow
              label="Fecha de creación"
              value={formatDate(
                data.fechaCreacion,
              )}
            />

            <InfoRow
              label="Fecha de entrega"
              value={formatDate(
                data.fechaEntrega,
              )}
            />

            <InfoRow
              label="Modalidad"
              value={
                data.modalidadEntrega ===
                "recogida"
                  ? "Recogida"
                  : "Entrega a domicilio"
              }
            />

            {data.municipalidad && (
              <InfoRow
                label="Municipio"
                value={
                  data.municipalidad.nombre
                }
              />
            )}
          </div>
        </section>

        {/* CLIENTE */}
        <section className="mb-5 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle>
            Cliente
          </SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[var(--surface)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Nombre
              </p>

              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {nombreCliente}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Teléfono
              </p>

              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {data.cliente.telefono ||
                  "No disponible"}
              </p>
            </div>
          </div>

          {data.modalidadEntrega ===
            "domicilio" &&
            data.direccionEntrega && (
              <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Dirección de entrega
                </p>

                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  {data.direccionEntrega}
                </p>
              </div>
            )}
        </section>

        {/* REPARTIDOR */}
        {data.repartidor && (
          <section className="mb-5 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle>
              Repartidor
            </SectionTitle>

            <div className="flex items-center gap-4 rounded-2xl bg-[var(--surface)] p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
                {iniciales(
                  nombreRepartidor,
                )}
              </div>

              <div className="min-w-0">
                <p className="font-semibold text-[var(--foreground)]">
                  {nombreRepartidor}
                </p>

                {data.repartidor.telefono && (
                  <p className="mt-1 text-sm text-gray-600">
                    {data.repartidor.telefono}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* PRODUCTOS */}
        <section className="mb-5 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle>
            Productos entregados
          </SectionTitle>

          {data.productos.length === 0 ? (
            <div className="rounded-2xl bg-[var(--surface)] p-5 text-center text-sm text-gray-500">
              No hay productos registrados en este pedido.
            </div>
          ) : (
            <div className="space-y-3">
              {data.productos.map(
                (producto, index) => (
                  <div
                    key={`${producto.productoId}-${index}`}
                    className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--foreground)]">
                          {producto.nombre ||
                            "Producto"}
                        </p>

                        {producto.code && (
                          <p className="mt-1 text-xs text-gray-500">
                            Código:{" "}
                            {producto.code}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Cantidad
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                            {formatQuantity(
                              producto.cantidad,
                            )}{" "}
                            {producto.unidad}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Subtotal
                          </p>

                          <p className="mt-1 text-sm font-bold text-[var(--primary)]">
                            {formatMoney(
                              producto.subtotal,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500">
                      {formatMoney(
                        producto.precioUnitario,
                      )}{" "}
                      por {producto.unidad || "unidad"}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* COSTOS */}
        <section className="mb-5 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle>
            Resumen de costos
          </SectionTitle>

          <div className="rounded-2xl bg-[var(--surface)] p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-600">
                  Subtotal productos
                </span>

                <span className="font-medium text-[var(--foreground)]">
                  {formatMoney(
                    data.costos
                      .subtotalProductos,
                  )}
                </span>
              </div>

              {data.costos.entrega > 0 && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-600">
                    Entrega
                  </span>

                  <span className="font-medium text-[var(--foreground)]">
                    {formatMoney(
                      data.costos.entrega,
                    )}
                  </span>
                </div>
              )}

              {data.costos.logistica > 0 && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-600">
                    Logística
                  </span>

                  <span className="font-medium text-[var(--foreground)]">
                    {formatMoney(
                      data.costos.logistica,
                    )}
                  </span>
                </div>
              )}

              {data.costos.almacenamiento >
                0 && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-600">
                    Almacenamiento
                  </span>

                  <span className="font-medium text-[var(--foreground)]">
                    {formatMoney(
                      data.costos
                        .almacenamiento,
                    )}
                  </span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-bold text-[var(--foreground)]">
                    Total
                  </span>

                  <span className="text-xl font-black text-[var(--primary)]">
                    {formatMoney(
                      data.costos.total,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RECEPCIÓN */}
        <section className="mb-5 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle>
            Confirmación de recepción
          </SectionTitle>

          {data.firma ? (
            <div className="rounded-2xl bg-[var(--surface)] p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Método
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {data.firma.metodo ===
                    "manuscrita"
                      ? "Firma manuscrita"
                      : "Confirmación textual"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Fecha de recepción
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {formatDate(
                      data.firma
                        .fechaRecibido,
                    )}
                  </p>
                </div>
              </div>

              {data.firma.recibidoPor && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Recibido por
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {data.firma.recibidoPor}
                  </p>
                </div>
              )}

              {firmaManuscrita &&
                data.firma.valor && (
                  <div className="mt-5 border-t border-gray-200 pt-5">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Firma registrada
                    </p>

                    <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-4">
                      <img
                        src={
                          data.firma.valor
                        }
                        alt="Firma registrada del cliente"
                        className="max-h-32 max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}

              {firmaTexto && (
                <div className="mt-5 border-t border-gray-200 pt-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Confirmación
                  </p>

                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center">
                    <p className="font-serif text-2xl italic text-[var(--foreground)]">
                      {firmaTexto}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-yellow-50 p-5 text-sm text-yellow-800">
              La entrega figura como realizada, pero no se encontró información de la firma de recepción.
            </div>
          )}
        </section>

        {/* VERIFICACIÓN FINAL */}
        <section className="mb-5 rounded-3xl border border-[var(--primary)] bg-[var(--surface)] p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-white">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="m5 12 4 4L19 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">
            Recibo verificado
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-600">
            {data.verificacion.mensaje}
          </p>

          <p className="mt-4 break-all text-xs text-gray-500">
            Identificador de verificación: {data.id}
          </p>
        </section>

        {/* PIE */}
        <footer className="pb-6 text-center">
          <p className="text-sm font-semibold text-[var(--primary)]">
            Canastas Verdes
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Recibo digital de entrega
          </p>

          <Link
            href="/"
            className="mt-4 inline-block text-xs font-medium text-[var(--primary)] hover:underline"
          >
            Visitar Canastas Verdes
          </Link>
        </footer>
      </div>
    </main>
  );
}