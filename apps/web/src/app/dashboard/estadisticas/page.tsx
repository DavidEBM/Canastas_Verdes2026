"use client";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth } from "@/lib/firebase";

type Tab =
  | "resumen"
  | "productos"
  | "productores"
  | "municipios"
  | "repartidores"
  | "finanzas";

type CatalogoOpcion = {
  id: string;
  nombre: string;
  departamento?: string;
  activo?: boolean;
};

type ProductoEstadistica = {
  id: string;
  code: string;
  nombre: string;
  categoria: string;
  unidad: string;
  IdProductor: string;
  productor: string;
  IdMunicipalidad: string;
  municipalidad: string;
  cantidadVendida: number;
  ventas: number;
  costo: number;
  utilidad: number;
  stock: number;
};

type ProductorEstadistica = {
  id: string;
  nombre: string;
  ventas: number;
  costo: number;
  utilidad: number;
  productosVendidos: number;
  pedidos: number;
};

type MunicipioEstadistica = {
  id: string;
  nombre: string;
  departamento: string;
  ventas: number;
  pedidos: number;
};

type RepartidorEstadistica = {
  id: string;
  nombre: string;
  correo: string;
  ventasGeneradas: number;
  pedidosEntregados: number;
};

type EstadisticasResponse = {
  success: boolean;
  message?: string;

  filtros: {
    categoria: string;
    producto: string;
    productor: string;
    municipio: string;
    repartidor: string;
    desde: string;
    hasta: string;
  };

  resumen: {
    ventasTotales: number;
    costosTotales: number;
    utilidadTotal: number;
    margen: number;
    pedidosEntregados: number;
    productosVendidos: number;
    consumidores: number;
    productosActivos: number;
    stockActual: number;
  };

  productos: ProductoEstadistica[];

  productores: ProductorEstadistica[];

  municipios: {
    productores: MunicipioEstadistica[];
    entrega: MunicipioEstadistica[];
  };

  repartidores: RepartidorEstadistica[];

  finanzas: {
    ventas: number;
    costos: number;
    utilidad: number;
    margen: number;
  };

  catalogos: {
    productos: CatalogoOpcion[];
    productores: CatalogoOpcion[];
    municipalidades: CatalogoOpcion[];
    categorias: CatalogoOpcion[];
  };
};

const EMPTY_DATA: EstadisticasResponse = {
  success: true,

  filtros: {
    categoria: "",
    producto: "",
    productor: "",
    municipio: "",
    repartidor: "",
    desde: "",
    hasta: "",
  },

  resumen: {
    ventasTotales: 0,
    costosTotales: 0,
    utilidadTotal: 0,
    margen: 0,
    pedidosEntregados: 0,
    productosVendidos: 0,
    consumidores: 0,
    productosActivos: 0,
    stockActual: 0,
  },

  productos: [],
  productores: [],

  municipios: {
    productores: [],
    entrega: [],
  },

  repartidores: [],

  finanzas: {
    ventas: 0,
    costos: 0,
    utilidad: 0,
    margen: 0,
  },

  catalogos: {
    productos: [],
    productores: [],
    municipalidades: [],
    categorias: [],
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(
    Number.isFinite(value) ? value : 0,
  );
}

function formatPercent(value: number): string {
  return `${Number.isFinite(value) ? value.toFixed(2) : "0.00"}%`;
}

function safeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "No disponible";
  }

  const text = String(value).trim();

  return text || "No disponible";
}

function SelectField({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: CatalogoOpcion[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]/70"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)]"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
          >
            {safeText(option.nombre)}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
        {value}
      </p>

      {description ? (
        <p className="mt-1 text-xs text-[var(--muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function TableEmpty({
  message = "No hay datos para mostrar.",
}: {
  message?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}

export default function EstadisticasPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [data, setData] =
    useState<EstadisticasResponse>(
      EMPTY_DATA,
    );

  const [activeTab, setActiveTab] =
    useState<Tab>("resumen");

  const [desde, setDesde] =
    useState("");

  const [hasta, setHasta] =
    useState("");

  const [categoria, setCategoria] =
    useState("");

  const [producto, setProducto] =
    useState("");

  const [productor, setProductor] =
    useState("");

  const [municipio, setMunicipio] =
    useState("");

  const [repartidor, setRepartidor] =
    useState("");

  const [showFilters, setShowFilters] =
    useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        },
        () => {
          setUser(null);
          setAuthLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  const loadStatistics =
    useCallback(async () => {
      if (!user) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token =
          await user.getIdToken();

        const params =
          new URLSearchParams();

        /*
         * IMPORTANTE:
         * Estos nombres coinciden exactamente
         * con /api/dashboard/estadisticas.
         */
        if (desde) {
          params.set("desde", desde);
        }

        if (hasta) {
          params.set("hasta", hasta);
        }

        if (categoria) {
          params.set(
            "categoria",
            categoria,
          );
        }

        if (producto) {
          params.set(
            "producto",
            producto,
          );
        }

        if (productor) {
          params.set(
            "productor",
            productor,
          );
        }

        if (municipio) {
          params.set(
            "municipio",
            municipio,
          );
        }

        if (repartidor) {
          params.set(
            "repartidor",
            repartidor,
          );
        }

        const query =
          params.toString();

        const response =
          await fetch(
            `/api/dashboard/estadisticas${
              query ? `?${query}` : ""
            }`,
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache: "no-store",
            },
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
              "No fue posible obtener las estadísticas.",
          );
        }

        if (!result?.success) {
          throw new Error(
            result?.message ||
              "La API no pudo generar las estadísticas.",
          );
        }

        setData(
          result as EstadisticasResponse,
        );
      } catch (err) {
        console.error(
          "Error cargando estadísticas:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar las estadísticas.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      user,
      desde,
      hasta,
      categoria,
      producto,
      productor,
      municipio,
      repartidor,
    ]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    void loadStatistics();
  }, [
    authLoading,
    user,
    loadStatistics,
  ]);

  const clearFilters = () => {
    setDesde("");
    setHasta("");
    setCategoria("");
    setProducto("");
    setProductor("");
    setMunicipio("");
    setRepartidor("");
  };

  const hasFilters =
    Boolean(desde) ||
    Boolean(hasta) ||
    Boolean(categoria) ||
    Boolean(producto) ||
    Boolean(productor) ||
    Boolean(municipio) ||
    Boolean(repartidor);

  const productosOrdenados =
    useMemo(
      () =>
        [...data.productos].sort(
          (a, b) =>
            b.cantidadVendida -
            a.cantidadVendida,
        ),
      [data.productos],
    );

  const productosPorVentas =
    useMemo(
      () =>
        [...data.productos].sort(
          (a, b) =>
            b.ventas - a.ventas,
        ),
      [data.productos],
    );

  const tabs: {
    id: Tab;
    label: string;
  }[] = [
    {
      id: "resumen",
      label: "Resumen",
    },
    {
      id: "productos",
      label: "Productos",
    },
    {
      id: "productores",
      label: "Productores",
    },
    {
      id: "municipios",
      label: "Municipios",
    },
    {
      id: "repartidores",
      label: "Repartidores",
    },
    {
      id: "finanzas",
      label: "Finanzas",
    },
  ];

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[var(--surface)] p-6">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--secondary)] border-t-[var(--primary)]" />

            <p className="mt-4 text-sm text-[var(--muted)]">
              Verificando sesión...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--surface)] p-6">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <h1 className="text-xl font-bold text-red-800">
              Sesión requerida
            </h1>

            <p className="mt-2 text-sm text-red-700">
              Debes iniciar sesión para
              consultar las estadísticas.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">
              Dashboard administrativo
            </p>

            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              Estadísticas
            </h1>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Análisis histórico de pedidos
              entregados.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadStatistics()
            }
            disabled={loading}
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Actualizando..."
              : "Actualizar"}
          </button>
        </div>

        {/* ERROR */}
        {error ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong>{" "}
            {error}
          </div>
        ) : null}

        {/* FILTROS */}
        <section className="mb-6 rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          <button
            type="button"
            onClick={() =>
              setShowFilters(
                (current) => !current,
              )
            }
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div>
              <h2 className="font-bold text-[var(--foreground)]">
                Filtros
              </h2>

              <p className="text-xs text-[var(--muted)]">
                Solo se contabilizan pedidos
                en estado entregado.
              </p>
            </div>

            <span className="text-sm text-[var(--primary)]">
              {showFilters
                ? "Ocultar"
                : "Mostrar"}
            </span>
          </button>

          {showFilters ? (
            <div className="border-t border-[var(--border)] p-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="desde"
                    className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]/70"
                  >
                    Desde
                  </label>

                  <input
                    id="desde"
                    type="date"
                    value={desde}
                    onChange={(event) =>
                      setDesde(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hasta"
                    className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]/70"
                  >
                    Hasta
                  </label>

                  <input
                    id="hasta"
                    type="date"
                    value={hasta}
                    onChange={(event) =>
                      setHasta(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <SelectField
                  id="categoria"
                  label="Categoría"
                  value={categoria}
                  options={
                    data.catalogos
                      .categorias
                  }
                  placeholder="Todas las categorías"
                  onChange={
                    setCategoria
                  }
                />

                <SelectField
                  id="producto"
                  label="Producto"
                  value={producto}
                  options={
                    data.catalogos
                      .productos
                  }
                  placeholder="Todos los productos"
                  onChange={
                    setProducto
                  }
                />

                <SelectField
                  id="productor"
                  label="Productor"
                  value={productor}
                  options={
                    data.catalogos
                      .productores
                  }
                  placeholder="Todos los productores"
                  onChange={
                    setProductor
                  }
                />

                <SelectField
                  id="municipio"
                  label="Municipalidad"
                  value={municipio}
                  options={
                    data.catalogos
                      .municipalidades
                  }
                  placeholder="Todas las municipalidades"
                  onChange={
                    setMunicipio
                  }
                />

                <div>
                  <label
                    htmlFor="repartidor"
                    className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]/70"
                  >
                    Repartidor
                  </label>

                  <select
                    id="repartidor"
                    value={repartidor}
                    onChange={(event) =>
                      setRepartidor(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                  >
                    <option value="">
                      Todos los repartidores
                    </option>

                    {data.repartidores.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {safeText(
                            item.nombre,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Limpiar filtros
                </button>

                <span className="self-center text-xs text-[var(--muted)]">
                  Los filtros se aplican
                  automáticamente.
                </span>
              </div>
            </div>
          ) : null}
        </section>

        {/* TABS */}
        <div className="mb-6 overflow-x-auto rounded-2xl border border-[var(--border)] bg-white p-1.5 shadow-sm">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="mb-6 rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--secondary)] border-t-[var(--primary)]" />

            <p className="mt-3 text-sm text-[var(--muted)]">
              Calculando estadísticas...
            </p>
          </div>
        ) : null}

        {/* RESUMEN */}
        {activeTab === "resumen" ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Ventas"
                value={formatCurrency(
                  data.resumen
                    .ventasTotales,
                )}
                description="Valor histórico de pedidos entregados"
              />

              <StatCard
                title="Costos"
                value={formatCurrency(
                  data.resumen
                    .costosTotales,
                )}
                description="Costos congelados al recibir"
              />

              <StatCard
                title="Utilidad"
                value={formatCurrency(
                  data.resumen
                    .utilidadTotal,
                )}
                description={`Margen ${formatPercent(
                  data.resumen.margen,
                )}`}
              />

              <StatCard
                title="Pedidos entregados"
                value={formatNumber(
                  data.resumen
                    .pedidosEntregados,
                )}
                description="Pedidos contabilizados"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Productos vendidos"
                value={formatNumber(
                  data.resumen
                    .productosVendidos,
                )}
                description="Unidades"
              />

              <StatCard
                title="Consumidores"
                value={formatNumber(
                  data.resumen
                    .consumidores,
                )}
                description="Consumidores únicos"
              />

              <StatCard
                title="Productos activos"
                value={formatNumber(
                  data.resumen
                    .productosActivos,
                )}
                description="Catálogo actual"
              />

              <StatCard
                title="Stock actual"
                value={formatNumber(
                  data.resumen
                    .stockActual,
                )}
                description="Unidades disponibles"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
                <h2 className="font-bold text-[var(--foreground)]">
                  Resultado financiero
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="flex justify-between border-b border-[var(--border)] pb-3">
                    <span className="text-sm text-[var(--muted)]">
                      Ventas
                    </span>

                    <strong>
                      {formatCurrency(
                        data.finanzas
                          .ventas,
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b border-[var(--border)] pb-3">
                    <span className="text-sm text-[var(--muted)]">
                      Costos
                    </span>

                    <strong>
                      {formatCurrency(
                        data.finanzas
                          .costos,
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b border-[var(--border)] pb-3">
                    <span className="text-sm text-[var(--muted)]">
                      Utilidad
                    </span>

                    <strong className="text-[var(--primary)]">
                      {formatCurrency(
                        data.finanzas
                          .utilidad,
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--muted)]">
                      Margen
                    </span>

                    <strong>
                      {formatPercent(
                        data.finanzas
                          .margen,
                      )}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
                <h2 className="font-bold text-[var(--foreground)]">
                  Criterio de cálculo
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Las ventas y costos de los
                  pedidos entregados se toman
                  de los valores históricos
                  congelados en el pedido al
                  momento de registrar la
                  entrega.
                </p>

                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Los cambios posteriores en el
                  catálogo de productos no
                  modifican las estadísticas
                  históricas.
                </p>
              </section>
            </div>
          </div>
        ) : null}

        {/* PRODUCTOS */}
        {activeTab === "productos" ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold text-[var(--foreground)]">
                Productos más vendidos
              </h2>

              {productosOrdenados.length ===
              0 ? (
                <TableEmpty />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left">
                        <th className="px-3 py-3">
                          Producto
                        </th>
                        <th className="px-3 py-3">
                          Categoría
                        </th>
                        <th className="px-3 py-3">
                          Productor
                        </th>
                        <th className="px-3 py-3">
                          Vendido
                        </th>
                        <th className="px-3 py-3">
                          Ventas
                        </th>
                        <th className="px-3 py-3">
                          Costo
                        </th>
                        <th className="px-3 py-3">
                          Utilidad
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {productosOrdenados.map(
                        (item) => (
                          <tr
                            key={item.id}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="px-3 py-3">
                              <strong>
                                {safeText(
                                  item.nombre,
                                )}
                              </strong>

                              <div className="text-xs text-[var(--muted)]">
                                {safeText(
                                  item.code,
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-3">
                              {safeText(
                                item.categoria,
                              )}
                            </td>

                            <td className="px-3 py-3">
                              {safeText(
                                item.productor,
                              )}
                            </td>

                            <td className="px-3 py-3">
                              {formatNumber(
                                item.cantidadVendida,
                              )}{" "}
                              {safeText(
                                item.unidad,
                              )}
                            </td>

                            <td className="px-3 py-3 font-semibold">
                              {formatCurrency(
                                item.ventas,
                              )}
                            </td>

                            <td className="px-3 py-3">
                              {formatCurrency(
                                item.costo,
                              )}
                            </td>

                            <td className="px-3 py-3 font-semibold text-[var(--primary)]">
                              {formatCurrency(
                                item.utilidad,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold text-[var(--foreground)]">
                Productos por ingresos
              </h2>

              {productosPorVentas.length ===
              0 ? (
                <TableEmpty />
              ) : (
                <div className="space-y-3">
                  {productosPorVentas
                    .slice(0, 10)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-xl bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold">
                            {safeText(
                              item.nombre,
                            )}
                          </p>

                          <p className="text-xs text-[var(--muted)]">
                            {safeText(
                              item.productor,
                            )}{" "}
                            ·{" "}
                            {formatNumber(
                              item.cantidadVendida,
                            )}{" "}
                            unidades
                          </p>
                        </div>

                        <strong className="text-[var(--primary)]">
                          {formatCurrency(
                            item.ventas,
                          )}
                        </strong>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {/* PRODUCTORES */}
        {activeTab === "productores" ? (
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-[var(--foreground)]">
              Estadísticas por productor
            </h2>

            {data.productores.length ===
            0 ? (
              <TableEmpty />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      <th className="px-3 py-3">
                        Productor
                      </th>
                      <th className="px-3 py-3">
                        Pedidos
                      </th>
                      <th className="px-3 py-3">
                        Productos vendidos
                      </th>
                      <th className="px-3 py-3">
                        Ventas
                      </th>
                      <th className="px-3 py-3">
                        Costos
                      </th>
                      <th className="px-3 py-3">
                        Utilidad
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.productores.map(
                      (item) => (
                        <tr
                          key={item.id}
                          className="border-b border-[var(--border)] last:border-0"
                        >
                          <td className="px-3 py-3 font-semibold">
                            {safeText(
                              item.nombre,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {formatNumber(
                              item.pedidos,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {formatNumber(
                              item.productosVendidos,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {formatCurrency(
                              item.ventas,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {formatCurrency(
                              item.costo,
                            )}
                          </td>

                          <td className="px-3 py-3 font-semibold text-[var(--primary)]">
                            {formatCurrency(
                              item.utilidad,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {/* MUNICIPIOS */}
        {activeTab === "municipios" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold">
                Municipios de productores
              </h2>

              {data.municipios
                .productores.length ===
              0 ? (
                <TableEmpty />
              ) : (
                <div className="space-y-3">
                  {data.municipios.productores.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-[var(--surface)] p-4"
                      >
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="font-semibold">
                              {safeText(
                                item.nombre,
                              )}
                            </p>

                            <p className="text-xs text-[var(--muted)]">
                              {safeText(
                                item.departamento,
                              )}
                            </p>
                          </div>

                          <strong>
                            {formatCurrency(
                              item.ventas,
                            )}
                          </strong>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold">
                Municipios de entrega
              </h2>

              {data.municipios.entrega
                .length === 0 ? (
                <TableEmpty />
              ) : (
                <div className="space-y-3">
                  {data.municipios.entrega.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-[var(--surface)] p-4"
                      >
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="font-semibold">
                              {safeText(
                                item.nombre,
                              )}
                            </p>

                            <p className="text-xs text-[var(--muted)]">
                              {safeText(
                                item.departamento,
                              )}{" "}
                              ·{" "}
                              {formatNumber(
                                item.pedidos,
                              )}{" "}
                              pedidos
                            </p>
                          </div>

                          <strong>
                            {formatCurrency(
                              item.ventas,
                            )}
                          </strong>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {/* REPARTIDORES */}
        {activeTab === "repartidores" ? (
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-[var(--foreground)]">
              Rendimiento de repartidores
            </h2>

            {data.repartidores.length ===
            0 ? (
              <TableEmpty />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      <th className="px-3 py-3">
                        Repartidor
                      </th>
                      <th className="px-3 py-3">
                        Correo
                      </th>
                      <th className="px-3 py-3">
                        Pedidos entregados
                      </th>
                      <th className="px-3 py-3">
                        Ventas generadas
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.repartidores.map(
                      (item) => (
                        <tr
                          key={item.id}
                          className="border-b border-[var(--border)] last:border-0"
                        >
                          <td className="px-3 py-3 font-semibold">
                            {safeText(
                              item.nombre,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {safeText(
                              item.correo,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {formatNumber(
                              item.pedidosEntregados,
                            )}
                          </td>

                          <td className="px-3 py-3 font-semibold text-[var(--primary)]">
                            {formatCurrency(
                              item.ventasGeneradas,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {/* FINANZAS */}
        {activeTab === "finanzas" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Ventas"
                value={formatCurrency(
                  data.finanzas.ventas,
                )}
              />

              <StatCard
                title="Costos"
                value={formatCurrency(
                  data.finanzas.costos,
                )}
              />

              <StatCard
                title="Utilidad"
                value={formatCurrency(
                  data.finanzas.utilidad,
                )}
              />

              <StatCard
                title="Margen"
                value={formatPercent(
                  data.finanzas.margen,
                )}
              />
            </div>

            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <h2 className="font-bold text-[var(--foreground)]">
                Desglose financiero
              </h2>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      <th className="px-3 py-3">
                        Concepto
                      </th>
                      <th className="px-3 py-3">
                        Valor
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr className="border-b border-[var(--border)]">
                      <td className="px-3 py-3">
                        Ventas históricas
                      </td>

                      <td className="px-3 py-3 font-semibold">
                        {formatCurrency(
                          data.finanzas
                            .ventas,
                        )}
                      </td>
                    </tr>

                    <tr className="border-b border-[var(--border)]">
                      <td className="px-3 py-3">
                        Costos históricos
                      </td>

                      <td className="px-3 py-3">
                        {formatCurrency(
                          data.finanzas
                            .costos,
                        )}
                      </td>
                    </tr>

                    <tr className="border-b border-[var(--border)]">
                      <td className="px-3 py-3">
                        Utilidad
                      </td>

                      <td className="px-3 py-3 font-semibold text-[var(--primary)]">
                        {formatCurrency(
                          data.finanzas
                            .utilidad,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="px-3 py-3">
                        Margen
                      </td>

                      <td className="px-3 py-3 font-semibold">
                        {formatPercent(
                          data.finanzas
                            .margen,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="font-bold text-[var(--foreground)]">
                Nota sobre trazabilidad
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Las estadísticas financieras
                utilizan los valores congelados
                en cada pedido cuando fue
                registrado como entregado:
                precio final, costo PCC,
                logística, transporte, otros
                costos, costo total y utilidad.
              </p>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Por tanto, modificar posteriormente
                el precio o costo de un producto no
                altera las estadísticas de pedidos
                históricos.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}