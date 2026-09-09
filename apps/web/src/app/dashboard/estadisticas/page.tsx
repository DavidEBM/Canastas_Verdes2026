"use client";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { auth } from "@/lib/firebase";

type Tab =
  | "resumen"
  | "productos"
  | "granjas"
  | "municipios"
  | "repartidores"
  | "finanzas";

type CatalogoOpcion = {
  id: string;
  nombre: string;
};

type EstadisticaProducto = {
  productoId: string;
  code: string;
  nombre: string;
  unidad: string;
  categoria: string;
  IdGranja: string;
  IdMunicipalidad: string;
  unidadesVendidas: number;
  ventas: number;
};

type EstadisticaGrupo = {
  id: string;
  nombre: string;
  unidadesVendidas: number;
  ventas: number;
  productos: number;
  pedidos: number;
};

type EstadisticaRepartidor = {
  id: string;
  nombre: string;
  pedidosEntregados: number;
  ventasGeneradas: number;
};

type FinanzasItem = {
  disponible: boolean;
  ventas: number;
  costo: number | null;
  ganancia: number;
  mensaje: string;
};

type EstadisticasResponse = {
  success: boolean;
  message?: string;

  filtros: {
    fechaDesde: string | null;
    fechaHasta: string | null;
    categoria: string | null;
    producto: string | null;
    granja: string | null;
    municipio: string | null;
    repartidor: string | null;
  };

  resumen: {
    pedidos: number;
    unidadesVendidas: number;
    gananciasProductos: number;
    gananciasLogistica: number;
    gananciasAlmacenamiento: number;
    gananciasEntrega: number;
    gananciasTotales: number;
    ingresosTotales: number;
  };

  finanzas: {
    productos: FinanzasItem;
    logistica: FinanzasItem;
    almacenamiento: FinanzasItem;
    entrega: FinanzasItem;
  };

  productosMasVendidos: EstadisticaProducto[];
  productosPorIngresos: EstadisticaProducto[];

  granjas: EstadisticaGrupo[];

  municipios: {
    productores: EstadisticaGrupo[];
    entrega: EstadisticaGrupo[];
  };

  repartidores: EstadisticaRepartidor[];

  catalogos: {
    productos: CatalogoOpcion[];
    categorias: CatalogoOpcion[];
    granjas: CatalogoOpcion[];
    municipios: CatalogoOpcion[];
    repartidores: CatalogoOpcion[];
  };

  catalogo: {
    productosActivos: number;
    stockActual: number;
    ofertaHistoricaDisponible: boolean;
    mensaje: string;
  };

  metadata: {
    estadosContabilizados: string[];
    estadosExcluidos: string[];
    totalPedidosEncontrados: number;
    totalProductosCatalogo: number;
    totalRepartidores: number;
  };
};

const EMPTY_RESPONSE: EstadisticasResponse = {
  success: true,

  filtros: {
    fechaDesde: null,
    fechaHasta: null,
    categoria: null,
    producto: null,
    granja: null,
    municipio: null,
    repartidor: null,
  },

  resumen: {
    pedidos: 0,
    unidadesVendidas: 0,
    gananciasProductos: 0,
    gananciasLogistica: 0,
    gananciasAlmacenamiento: 0,
    gananciasEntrega: 0,
    gananciasTotales: 0,
    ingresosTotales: 0,
  },

  finanzas: {
    productos: {
      disponible: true,
      ventas: 0,
      costo: null,
      ganancia: 0,
      mensaje: "",
    },

    logistica: {
      disponible: false,
      ventas: 0,
      costo: null,
      ganancia: 0,
      mensaje:
        "El sistema actual no almacena costos ni ingresos independientes de logística.",
    },

    almacenamiento: {
      disponible: false,
      ventas: 0,
      costo: null,
      ganancia: 0,
      mensaje:
        "El sistema actual no almacena costos ni ingresos independientes de almacenamiento.",
    },

    entrega: {
      disponible: false,
      ventas: 0,
      costo: null,
      ganancia: 0,
      mensaje:
        "El sistema actual no almacena costos ni ingresos independientes de entrega.",
    },
  },

  productosMasVendidos: [],
  productosPorIngresos: [],

  granjas: [],

  municipios: {
    productores: [],
    entrega: [],
  },

  repartidores: [],

  catalogos: {
    productos: [],
    categorias: [],
    granjas: [],
    municipios: [],
    repartidores: [],
  },

  catalogo: {
    productosActivos: 0,
    stockActual: 0,
    ofertaHistoricaDisponible: false,
    mensaje:
      "El sistema actualmente no conserva una fotografía histórica de la cantidad inicialmente ofrecida.",
  },

  metadata: {
    estadosContabilizados: ["entregado"],
    estadosExcluidos: [
      "pendiente",
      "asignado",
      "en_camino",
      "cancelado",
    ],
    totalPedidosEncontrados: 0,
    totalProductosCatalogo: 0,
    totalRepartidores: 0,
  },
};

function displayName(value: unknown): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "No disponible";
  }

  const text = String(value).trim();

  if (!text) {
    return "No disponible";
  }

  return text.replace(/_/g, " ");
}

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(value)
      ? value
      : 0,
  );
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    "es-CO",
  ).format(
    Number.isFinite(value)
      ? value
      : 0,
  );
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Sin filtro";
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "es-CO",
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  options: CatalogoOpcion[];
  onChange: (
    value: string,
  ) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]/75"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={disabled}
        className="w-full rounded-xl border border-[var(--secondary)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
          >
            {displayName(
              option.nombre,
            )}
          </option>
        ))}
      </select>

      <p className="mt-1 text-[10px] text-[var(--foreground)]/40">
        {options.length} opciones disponibles
      </p>
    </div>
  );
}

export default function EstadisticasPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    data,
    setData,
  ] =
    useState<EstadisticasResponse>(
      EMPTY_RESPONSE,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<Tab>("resumen");

  const [
    fechaDesde,
    setFechaDesde,
  ] = useState("");

  const [
    fechaHasta,
    setFechaHasta,
  ] = useState("");

  const [
    categoria,
    setCategoria,
  ] = useState("");

  const [
    producto,
    setProducto,
  ] = useState("");

  const [
    granja,
    setGranja,
  ] = useState("");

  const [
    municipio,
    setMunicipio,
  ] = useState("");

  const [
    repartidor,
    setRepartidor,
  ] = useState("");

  const [
    showFilters,
    setShowFilters,
  ] = useState(true);

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

    return () => unsubscribe();
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

        if (fechaDesde) {
          params.set(
            "fechaDesde",
            fechaDesde,
          );
        }

        if (fechaHasta) {
          params.set(
            "fechaHasta",
            fechaHasta,
          );
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

        if (granja) {
          params.set(
            "granja",
            granja,
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
              query
                ? `?${query}`
                : ""
            }`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
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

        if (
          !result?.success
        ) {
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
      fechaDesde,
      fechaHasta,
      categoria,
      producto,
      granja,
      municipio,
      repartidor,
    ]);

  useEffect(() => {
    if (
      !authLoading &&
      user
    ) {
      void loadStatistics();
    }

    if (
      !authLoading &&
      !user
    ) {
      setLoading(false);
    }
  }, [
    authLoading,
    user,
    loadStatistics,
  ]);

  function clearFilters() {
    setFechaDesde("");
    setFechaHasta("");
    setCategoria("");
    setProducto("");
    setGranja("");
    setMunicipio("");
    setRepartidor("");
  }

  const hasFilters =
    Boolean(fechaDesde) ||
    Boolean(fechaHasta) ||
    Boolean(categoria) ||
    Boolean(producto) ||
    Boolean(granja) ||
    Boolean(municipio) ||
    Boolean(repartidor);

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
      id: "granjas",
      label: "Granjas",
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
      <main className="min-h-screen bg-[var(--background)] p-6">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--secondary)] border-t-[var(--primary)]" />

            <p className="mt-4 text-sm text-[var(--foreground)]/60">
              Verificando sesión...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--background)] p-6">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <h1 className="text-xl font-bold text-red-900">
              Sesión requerida
            </h1>

            <p className="mt-2 text-sm text-red-800">
              Debes iniciar sesión
              para consultar las
              estadísticas.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                Dashboard administrativo
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--foreground)]">
                Estadísticas
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--foreground)]/65">
                Analiza las ventas,
                productos,
                granjas,
                municipios y
                repartidores.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadStatistics()
              }
              disabled={loading}
              className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Actualizando..."
                : "Actualizar estadísticas"}
            </button>
          </div>
        </header>

        {/* FILTROS */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-[var(--secondary)] bg-[var(--surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--secondary)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-[var(--foreground)]">
                Filtros de estadísticas
              </h2>

              <p className="mt-1 text-xs text-[var(--foreground)]/60">
                Selecciona las
                opciones existentes
                en el sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (value) =>
                    !value,
                )
              }
              className="rounded-xl border border-[var(--primary)] px-4 py-2 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--secondary)]"
            >
              {showFilters
                ? "Ocultar filtros"
                : "Mostrar filtros"}
            </button>
          </div>

          {showFilters && (
            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* FECHA DESDE */}
                <div>
                  <label
                    htmlFor="fechaDesde"
                    className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]/75"
                  >
                    Fecha desde
                  </label>

                  <input
                    id="fechaDesde"
                    type="date"
                    value={
                      fechaDesde
                    }
                    onChange={(
                      event,
                    ) =>
                      setFechaDesde(
                        event.target
                          .value,
                      )
                    }
                    className="w-full rounded-xl border border-[var(--secondary)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>

                {/* FECHA HASTA */}
                <div>
                  <label
                    htmlFor="fechaHasta"
                    className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]/75"
                  >
                    Fecha hasta
                  </label>

                  <input
                    id="fechaHasta"
                    type="date"
                    value={
                      fechaHasta
                    }
                    onChange={(
                      event,
                    ) =>
                      setFechaHasta(
                        event.target
                          .value,
                      )
                    }
                    className="w-full rounded-xl border border-[var(--secondary)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>

                {/* CATEGORIA */}
                <SelectField
                  id="categoria"
                  label="Categoría"
                  value={
                    categoria
                  }
                  options={
                    data.catalogos
                      .categorias
                  }
                  onChange={
                    setCategoria
                  }
                  placeholder="Todas las categorías"
                />

                {/* PRODUCTO */}
                <SelectField
                  id="producto"
                  label="Producto"
                  value={
                    producto
                  }
                  options={
                    data.catalogos
                      .productos
                  }
                  onChange={
                    setProducto
                  }
                  placeholder="Todos los productos"
                />

                {/* GRANJA */}
                <SelectField
                  id="granja"
                  label="Granja"
                  value={
                    granja
                  }
                  options={
                    data.catalogos
                      .granjas
                  }
                  onChange={
                    setGranja
                  }
                  placeholder="Todas las granjas"
                />

                {/* MUNICIPIO */}
                <SelectField
                  id="municipio"
                  label="Municipio"
                  value={
                    municipio
                  }
                  options={
                    data.catalogos
                      .municipios
                  }
                  onChange={
                    setMunicipio
                  }
                  placeholder="Todos los municipios"
                />

                {/* REPARTIDOR */}
                <SelectField
                  id="repartidor"
                  label="Repartidor"
                  value={
                    repartidor
                  }
                  options={
                    data.catalogos
                      .repartidores
                  }
                  onChange={
                    setRepartidor
                  }
                  placeholder="Todos los repartidores"
                />

                {/* BOTONES */}
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void loadStatistics()
                    }
                    disabled={
                      loading
                    }
                    className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    Aplicar
                  </button>

                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="rounded-xl border border-[var(--secondary)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--secondary)]"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {hasFilters && (
                <div className="mt-4 rounded-2xl border border-[var(--secondary)] bg-white p-4">
                  <p className="text-xs font-semibold text-[var(--foreground)]/60">
                    Filtros activos
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {fechaDesde && (
                      <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        Desde:{" "}
                        {formatDate(
                          fechaDesde,
                        )}
                      </span>
                    )}

                    {fechaHasta && (
                      <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        Hasta:{" "}
                        {formatDate(
                          fechaHasta,
                        )}
                      </span>
                    )}

                    {categoria && (
                      <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        Categoría:{" "}
                        {displayName(
                          data.catalogos.categorias.find(
                            (item) =>
                              item.id ===
                              categoria,
                          )?.nombre ||
                            categoria,
                        )}
                      </span>
                    )}

                    {producto && (
                      <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        Producto:{" "}
                        {displayName(
                          data.catalogos.productos.find(
                            (item) =>
                              item.id ===
                              producto,
                          )?.nombre ||
                            producto,
                        )}
                      </span>
                    )}

                    {granja && (
                      <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        Granja:{" "}
                        {displayName(
                          data.catalogos.granjas.find(
                            (item) =>
                              item.id ===
                              granja,
                          )?.nombre ||
                            granja,
                        )}
                      </span>
                    )}

                    {municipio && (
                      <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        Municipio:{" "}
                        {displayName(
                          data.catalogos.municipios.find(
                            (item) =>
                              item.id ===
                              municipio,
                          )?.nombre ||
                            municipio,
                        )}
                      </span>
                    )}

                    {repartidor && (
                      <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                        Repartidor:{" "}
                        {displayName(
                          data.catalogos.repartidores.find(
                            (item) =>
                              item.id ===
                              repartidor,
                          )?.nombre ||
                            repartidor,
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ERROR */}
        {error && (
          <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-red-900">
                  Error al cargar
                  estadísticas
                </h2>

                <p className="mt-1 text-sm text-red-800">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadStatistics()
                }
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Reintentar
              </button>
            </div>
          </section>
        )}

        {/* TABS */}
        <nav className="mb-6 overflow-x-auto rounded-2xl border border-[var(--secondary)] bg-white p-1.5">
          <div className="flex min-w-max gap-1">
            {tabs.map(
              (tab) => (
                <button
                  key={
                    tab.id
                  }
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab.id,
                    )
                  }
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab ===
                    tab.id
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-[var(--foreground)]/65 hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {
                    tab.label
                  }
                </button>
              ),
            )}
          </div>
        </nav>

        {loading && (
          <div className="mb-6 rounded-2xl border border-[var(--secondary)] bg-[var(--surface)] p-4 text-center text-sm text-[var(--foreground)]/65">
            Actualizando
            información...
          </div>
        )}

        {/* ========================= */}
        {/* RESUMEN */}
        {/* ========================= */}

        {activeTab ===
          "resumen" && (
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-[var(--secondary)] bg-[var(--surface)] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--foreground)]/55">
                  Ingresos por productos
                </p>

                <p className="mt-3 text-2xl font-bold text-[var(--primary)]">
                  {formatCurrency(
                    data.resumen
                      .gananciasProductos,
                  )}
                </p>
              </div>

              <div className="rounded-3xl border border-[var(--secondary)] bg-[var(--surface)] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--foreground)]/55">
                  Pedidos entregados
                </p>

                <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
                  {formatNumber(
                    data.resumen
                      .pedidos,
                  )}
                </p>
              </div>

              <div className="rounded-3xl border border-[var(--secondary)] bg-[var(--surface)] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--foreground)]/55">
                  Unidades vendidas
                </p>

                <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
                  {formatNumber(
                    data.resumen
                      .unidadesVendidas,
                  )}
                </p>
              </div>

              <div className="rounded-3xl border border-[var(--secondary)] bg-[var(--surface)] p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--foreground)]/55">
                  Ingresos totales
                </p>

                <p className="mt-3 text-2xl font-bold text-[var(--primary)]">
                  {formatCurrency(
                    data.resumen
                      .ingresosTotales,
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-[var(--secondary)] bg-white p-6">
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Catálogo actual
                </h2>

                <p className="mt-1 text-sm text-[var(--foreground)]/60">
                  Información actual
                  del catálogo de
                  productos.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[var(--surface)] p-4">
                    <p className="text-xs text-[var(--foreground)]/55">
                      Productos activos
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {formatNumber(
                        data.catalogo
                          .productosActivos,
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface)] p-4">
                    <p className="text-xs text-[var(--foreground)]/55">
                      Stock actual
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {formatNumber(
                        data.catalogo
                          .stockActual,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold text-amber-900">
                    Oferta histórica
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    {
                      data
                        .catalogo
                        .mensaje
                    }
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--secondary)] bg-white p-6">
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Criterios contables
                </h2>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-[var(--surface)] p-4">
                    <p className="text-xs font-bold text-[var(--primary)]">
                      Estados contabilizados
                    </p>

                    <p className="mt-1 text-sm">
                      {data.metadata.estadosContabilizados.join(
                        ", ",
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface)] p-4">
                    <p className="text-xs font-bold text-[var(--primary)]">
                      Estados excluidos
                    </p>

                    <p className="mt-1 text-sm">
                      {data.metadata.estadosExcluidos.join(
                        ", ",
                      )}
                    </p>
                  </div>

                  <p className="text-xs leading-5 text-[var(--foreground)]/55">
                    Las ventas
                    realizadas se
                    contabilizan
                    únicamente cuando
                    el pedido está en
                    estado{" "}
                    <strong>
                      entregado
                    </strong>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================= */}
        {/* PRODUCTOS */}
        {/* ========================= */}

        {activeTab ===
          "productos" && (
          <section className="space-y-6">
            <div className="rounded-3xl border border-[var(--secondary)] bg-white p-6">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                Productos más vendidos
              </h2>

              <p className="mt-1 text-sm text-[var(--foreground)]/60">
                Ranking por unidades
                vendidas.
              </p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--secondary)] text-xs uppercase tracking-wide text-[var(--foreground)]/50">
                      <th className="px-3 py-3">
                        #
                      </th>

                      <th className="px-3 py-3">
                        Producto
                      </th>

                      <th className="px-3 py-3">
                        Categoría
                      </th>

                      <th className="px-3 py-3">
                        Granja
                      </th>

                      <th className="px-3 py-3">
                        Municipio
                      </th>

                      <th className="px-3 py-3 text-right">
                        Unidades
                      </th>

                      <th className="px-3 py-3 text-right">
                        Ventas
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.productosMasVendidos.map(
                      (
                        item,
                        index,
                      ) => (
                        <tr
                          key={`${item.productoId}-${index}`}
                          className="border-b border-[var(--secondary)]/70 last:border-0"
                        >
                          <td className="px-3 py-4 font-bold text-[var(--primary)]">
                            {index +
                              1}
                          </td>

                          <td className="px-3 py-4">
                            <div className="font-semibold">
                              {displayName(
                                item.nombre,
                              )}
                            </div>

                            <div className="text-xs text-[var(--foreground)]/50">
                              {displayName(
                                item.code,
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-4">
                            {displayName(
                              item.categoria,
                            )}
                          </td>

                          <td className="px-3 py-4">
                            {displayName(
                              item.IdGranja,
                            )}
                          </td>

                          <td className="px-3 py-4">
                            {displayName(
                              item.IdMunicipalidad,
                            )}
                          </td>

                          <td className="px-3 py-4 text-right font-semibold">
                            {formatNumber(
                              item.unidadesVendidas,
                            )}{" "}
                            {
                              item.unidad
                            }
                          </td>

                          <td className="px-3 py-4 text-right font-bold text-[var(--primary)]">
                            {formatCurrency(
                              item.ventas,
                            )}
                          </td>
                        </tr>
                      ),
                    )}

                    {data
                      .productosMasVendidos
                      .length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={
                            7
                          }
                          className="px-3 py-10 text-center text-sm text-[var(--foreground)]/50"
                        >
                          No hay
                          productos
                          que
                          coincidan
                          con los
                          filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--secondary)] bg-white p-6">
              <h2 className="text-xl font-bold">
                Productos por ingresos
              </h2>

              <p className="mt-1 text-sm text-[var(--foreground)]/60">
                Ranking económico
                de productos.
              </p>

              <div className="mt-5 space-y-3">
                {data.productosPorIngresos.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={`${item.productoId}-${index}`}
                      className="flex flex-col gap-3 rounded-2xl bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white">
                          {index +
                            1}
                        </div>

                        <div>
                          <p className="font-semibold">
                            {displayName(
                              item.nombre,
                            )}
                          </p>

                          <p className="text-xs text-[var(--foreground)]/50">
                            {formatNumber(
                              item.unidadesVendidas,
                            )}{" "}
                            unidades
                          </p>
                        </div>
                      </div>

                      <p className="font-bold text-[var(--primary)]">
                        {formatCurrency(
                          item.ventas,
                        )}
                      </p>
                    </div>
                  ),
                )}

                {data
                  .productosPorIngresos
                  .length ===
                  0 && (
                  <p className="py-8 text-center text-sm text-[var(--foreground)]/50">
                    No hay
                    información
                    disponible.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========================= */}
        {/* GRANJAS */}
        {/* ========================= */}

        {activeTab ===
          "granjas" && (
          <section className="rounded-3xl border border-[var(--secondary)] bg-white p-6">
            <h2 className="text-xl font-bold">
              Granjas
            </h2>

            <p className="mt-1 text-sm text-[var(--foreground)]/60">
              Productos vendidos e
              ingresos generados
              por granja.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--secondary)] text-xs uppercase tracking-wide text-[var(--foreground)]/50">
                    <th className="px-3 py-3">
                      Granja
                    </th>

                    <th className="px-3 py-3 text-right">
                      Productos
                    </th>

                    <th className="px-3 py-3 text-right">
                      Unidades
                    </th>

                    <th className="px-3 py-3 text-right">
                      Pedidos
                    </th>

                    <th className="px-3 py-3 text-right">
                      Ventas
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.granjas.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                        className="border-b border-[var(--secondary)]/70 last:border-0"
                      >
                        <td className="px-3 py-4 font-semibold">
                          {displayName(
                            item.nombre,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right">
                          {formatNumber(
                            item.productos,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right font-semibold">
                          {formatNumber(
                            item.unidadesVendidas,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right">
                          {formatNumber(
                            item.pedidos,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right font-bold text-[var(--primary)]">
                          {formatCurrency(
                            item.ventas,
                          )}
                        </td>
                      </tr>
                    ),
                  )}

                  {data.granjas
                    .length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={
                          5
                        }
                        className="px-3 py-10 text-center text-sm text-[var(--foreground)]/50"
                      >
                        No hay
                        información
                        de
                        granjas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================= */}
        {/* MUNICIPIOS */}
        {/* ========================= */}

        {activeTab ===
          "municipios" && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-[var(--secondary)] bg-white p-6">
              <h2 className="text-xl font-bold">
                Municipios productores
              </h2>

              <p className="mt-1 text-sm text-[var(--foreground)]/60">
                Ventas asociadas al
                municipio productor.
              </p>

              <div className="mt-5 space-y-3">
                {data.municipios.productores.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-2xl bg-[var(--surface)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {index +
                              1}
                            .{" "}
                            {displayName(
                              item.nombre,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-[var(--foreground)]/50">
                            {formatNumber(
                              item.unidadesVendidas,
                            )}{" "}
                            unidades ·{" "}
                            {formatNumber(
                              item.pedidos,
                            )}{" "}
                            pedidos
                          </p>
                        </div>

                        <p className="font-bold text-[var(--primary)]">
                          {formatCurrency(
                            item.ventas,
                          )}
                        </p>
                      </div>
                    </div>
                  ),
                )}

                {data.municipios
                  .productores
                  .length ===
                  0 && (
                  <p className="py-8 text-center text-sm text-[var(--foreground)]/50">
                    No hay
                    información
                    disponible.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--secondary)] bg-white p-6">
              <h2 className="text-xl font-bold">
                Municipios de entrega
              </h2>

              <p className="mt-1 text-sm text-[var(--foreground)]/60">
                Pedidos entregados
                según municipio de
                destino.
              </p>

              <div className="mt-5 space-y-3">
                {data.municipios.entrega.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-2xl bg-[var(--surface)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {index +
                              1}
                            .{" "}
                            {displayName(
                              item.nombre,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-[var(--foreground)]/50">
                            {formatNumber(
                              item.pedidos,
                            )}{" "}
                            pedidos
                          </p>
                        </div>

                        <p className="font-bold text-[var(--primary)]">
                          {formatCurrency(
                            item.ventas,
                          )}
                        </p>
                      </div>
                    </div>
                  ),
                )}

                {data.municipios
                  .entrega
                  .length ===
                  0 && (
                  <p className="py-8 text-center text-sm text-[var(--foreground)]/50">
                    No hay
                    información
                    disponible.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========================= */}
        {/* REPARTIDORES */}
        {/* ========================= */}

        {activeTab ===
          "repartidores" && (
          <section className="rounded-3xl border border-[var(--secondary)] bg-white p-6">
            <h2 className="text-xl font-bold">
              Rendimiento de repartidores
            </h2>

            <p className="mt-1 text-sm text-[var(--foreground)]/60">
              Pedidos entregados y
              ventas asociadas.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--secondary)] text-xs uppercase tracking-wide text-[var(--foreground)]/50">
                    <th className="px-3 py-3">
                      Repartidor
                    </th>

                    <th className="px-3 py-3 text-right">
                      Pedidos entregados
                    </th>

                    <th className="px-3 py-3 text-right">
                      Ventas generadas
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.repartidores.map(
                    (
                      item,
                    ) => (
                      <tr
                        key={
                          item.id
                        }
                        className="border-b border-[var(--secondary)]/70 last:border-0"
                      >
                        <td className="px-3 py-4 font-semibold">
                          {displayName(
                            item.nombre,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right font-semibold">
                          {formatNumber(
                            item.pedidosEntregados,
                          )}
                        </td>

                        <td className="px-3 py-4 text-right font-bold text-[var(--primary)]">
                          {formatCurrency(
                            item.ventasGeneradas,
                          )}
                        </td>
                      </tr>
                    ),
                  )}

                  {data.repartidores
                    .length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={
                          3
                        }
                        className="px-3 py-10 text-center text-sm text-[var(--foreground)]/50"
                      >
                        No hay
                        información
                        de
                        repartidores.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-900">
                Importante
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-800">
                Las ventas
                generadas por
                repartidor
                representan el
                valor de los
                pedidos
                entregados que
                fueron
                asignados a ese
                repartidor. No
                representan su
                comisión o pago.
              </p>
            </div>
          </section>
        )}

        {/* ========================= */}
        {/* FINANZAS */}
        {/* ========================= */}

        {activeTab ===
          "finanzas" && (
          <section className="space-y-6">
            <div className="rounded-3xl border border-[var(--secondary)] bg-white p-6">
              <h2 className="text-xl font-bold">
                Finanzas de productos
              </h2>

              <p className="mt-1 text-sm text-[var(--foreground)]/60">
                Ingresos provenientes
                de las ventas de
                productos.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-[var(--surface)] p-5">
                  <p className="text-xs text-[var(--foreground)]/55">
                    Ventas
                  </p>

                  <p className="mt-2 text-xl font-bold text-[var(--primary)]">
                    {formatCurrency(
                      data.finanzas
                        .productos
                        .ventas,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--surface)] p-5">
                  <p className="text-xs text-[var(--foreground)]/55">
                    Costo
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    {data.finanzas
                      .productos
                      .costo ===
                    null
                      ? "No disponible"
                      : formatCurrency(
                          data
                            .finanzas
                            .productos
                            .costo,
                        )}
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--surface)] p-5">
                  <p className="text-xs text-[var(--foreground)]/55">
                    Ganancia
                  </p>

                  <p className="mt-2 text-xl font-bold text-[var(--primary)]">
                    {data.finanzas
                      .productos
                      .costo ===
                    null
                      ? "No disponible"
                      : formatCurrency(
                          data
                            .finanzas
                            .productos
                            .ganancia,
                        )}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs leading-5 text-amber-800">
                  Actualmente se
                  registra el precio
                  de venta, pero no
                  el costo de
                  adquisición. Por
                  eso este valor
                  representa ingresos
                  por productos y no
                  utilidad neta.
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-bold">
                Otros conceptos
              </h2>

              <div className="grid gap-4 lg:grid-cols-3">
                {(
                  [
                    {
                      nombre:
                        "Logística",
                      item:
                        data
                          .finanzas
                          .logistica,
                    },
                    {
                      nombre:
                        "Almacenamiento",
                      item:
                        data
                          .finanzas
                          .almacenamiento,
                    },
                    {
                      nombre:
                        "Entrega",
                      item:
                        data
                          .finanzas
                          .entrega,
                    },
                  ] as {
                    nombre: string;
                    item: FinanzasItem;
                  }[]
                ).map(
                  ({
                    nombre,
                    item,
                  }) => (
                    <div
                      key={
                        nombre
                      }
                      className="rounded-3xl border border-amber-200 bg-amber-50 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-amber-900">
                          {
                            nombre
                          }
                        </h3>

                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          No disponible
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-amber-800/80">
                        {
                          item.mensaje
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer className="mt-8 rounded-2xl border border-[var(--secondary)] bg-[var(--surface)] p-4">
          <div className="flex flex-col gap-2 text-xs text-[var(--foreground)]/55 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Pedidos encontrados:{" "}
              <strong>
                {formatNumber(
                  data.metadata
                    .totalPedidosEncontrados,
                )}
              </strong>
            </p>

            <p>
              Productos:{" "}
              <strong>
                {formatNumber(
                  data.metadata
                    .totalProductosCatalogo,
                )}
              </strong>
            </p>

            <p>
              Repartidores:{" "}
              <strong>
                {formatNumber(
                  data.metadata
                    .totalRepartidores,
                )}
              </strong>
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}