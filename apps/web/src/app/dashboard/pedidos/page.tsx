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

type TipoEntrega = "domicilio" | "recogida";

interface PedidoProducto {
  productoId: string;
  code: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad: string;
  IdProductor: string;
  IdMunicipalidad: string;
  presentacionCantidad?: number;
  presentacionNombre?: string;
}

interface Pedido {
  id: string;
  usuarioId: string;
  nombreCliente: string;
  productos: PedidoProducto[];
  subtotal: number;
  total: number;
  descuento?: number;
  estado: Estado;
  reservaId: string | null;
  IdMunicipalidad: string;
  direccionEntrega: string;
  telefonoEntrega?: string;
  tipoEntrega?: TipoEntrega;
  IdPuntoRecogida?: string | null;
  puntoRecogida?: {
    id?: string;
    nombre?: string;
    direccion?: string;
    municipio?: string;
    IdMunicipalidad?: string;
  } | null;
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

interface ProductoCatalogo {
  id: string;
  code: string;
  nombre: string;
  precio: number;
  precioVenta?: number;
  stock: number;
  unidad: string;
  IdProductor: string;
  IdMunicipalidad: string;
  activo: boolean;
  presentacionCantidad?: number;
  presentacionNombre?: string;
}

interface Municipalidad {
  id: string;
  nombre: string;
}

interface PuntoRecogida {
  id: string;
  nombre: string;
  direccion: string;
  municipio: string;
  IdMunicipalidad: string;
  activo: boolean;
}

interface EditProducto {
  productoId: string;
  code: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  unidad: string;
  IdProductor: string;
  IdMunicipalidad: string;
  presentacionCantidad?: number;
  presentacionNombre?: string;
}

interface EditForm {
  productos: EditProducto[];
  descuento: number;
  tipoEntrega: TipoEntrega;
  IdMunicipalidad: string;
  direccionEntrega: string;
  telefonoEntrega: string;
  IdPuntoRecogida: string;
  repartidorId: string;
  estado: Estado;
  descripcionCambio: string;
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
  }).format(Number.isFinite(value) ? value : 0);
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

function getApiData<T>(result: unknown): T[] {
  if (
    result &&
    typeof result === "object" &&
    "data" in result &&
    Array.isArray(result.data)
  ) {
    return result.data as T[];
  }

  if (
    result &&
    typeof result === "object" &&
    "productos" in result &&
    Array.isArray(result.productos)
  ) {
    return result.productos as T[];
  }

  return [];
}

function getApiObject<T>(result: unknown): T | null {
  if (
    result &&
    typeof result === "object" &&
    "data" in result &&
    result.data &&
    typeof result.data === "object"
  ) {
    return result.data as T;
  }

  return null;
}

function productoToEdit(
  producto: PedidoProducto,
): EditProducto {
  return {
    productoId: producto.productoId,
    code: producto.code,
    nombre: producto.nombre,
    cantidad: producto.cantidad,
    precioUnitario: producto.precioUnitario,
    unidad: producto.unidad,
    IdProductor: producto.IdProductor,
    IdMunicipalidad: producto.IdMunicipalidad,
    presentacionCantidad:
      producto.presentacionCantidad,
    presentacionNombre:
      producto.presentacionNombre,
  };
}

function getTipoEntrega(
  pedido: Pedido,
): TipoEntrega {
  if (pedido.tipoEntrega === "recogida") {
    return "recogida";
  }

  if (
    pedido.IdPuntoRecogida ||
    pedido.puntoRecogida
  ) {
    return "recogida";
  }

  return "domicilio";
}

export default function DashboardPedidosPage() {
  const {
    user,
    loading: authLoading,
    role,
  } = useAuth();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [repartidores, setRepartidores] =
    useState<Repartidor[]>([]);
  const [municipalidades, setMunicipalidades] =
    useState<Municipalidad[]>([]);
  const [puntosRecogida, setPuntosRecogida] =
    useState<PuntoRecogida[]>([]);
  const [productosCatalogo, setProductosCatalogo] =
    useState<ProductoCatalogo[]>([]);

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

  const [pedidoEditando, setPedidoEditando] =
    useState<Pedido | null>(null);

  const [editForm, setEditForm] =
    useState<EditForm | null>(null);

  const [confirmarEntregado, setConfirmarEntregado] =
    useState(false);

  const [guardandoEdicion, setGuardandoEdicion] =
    useState(false);

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
          typeof result.message === "string"
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
      if (!user || role !== "admin") {
        setLoading(false);
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

        const result = await api(
          `/api/pedidos${query}`,
        );

        setPedidos(
          getApiData<Pedido>(result),
        );
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
    [api, estadoFiltro, role, user],
  );

  const loadRepartidores = useCallback(
    async () => {
      if (!user || role !== "admin") {
        return;
      }

      try {
        const result = await api(
          "/api/usuarios/roles",
        );

        const lista =
          getApiData<Repartidor>(
            result,
          ).filter(
            (item) =>
              item &&
              item.role ===
                "repartidor",
          );

        setRepartidores(lista);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar los repartidores.",
        );
      }
    },
    [api, role, user],
  );

  const loadCatalogos = useCallback(
    async () => {
      if (!user || role !== "admin") {
        return;
      }

      try {
        const [
          municipalidadesResult,
          puntosResult,
          productosResult,
        ] = await Promise.all([
          api(
            "/api/municipalidades/disponibles",
          ),
          api(
            "/api/puntos-recogida?admin=1",
          ),
          api(
            "/api/productos?admin=1",
          ),
        ]);

        setMunicipalidades(
          getApiData<Municipalidad>(
            municipalidadesResult,
          ),
        );

        setPuntosRecogida(
          getApiData<PuntoRecogida>(
            puntosResult,
          ).filter(
            (item) => item.activo,
          ),
        );

        setProductosCatalogo(
          getApiData<ProductoCatalogo>(
            productosResult,
          ).filter(
            (item) => item.activo,
          ),
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar los catálogos.",
        );
      }
    },
    [api, role, user],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || role !== "admin") {
      setLoading(false);
      return;
    }

    void Promise.all([
      loadPedidos(),
      loadRepartidores(),
      loadCatalogos(),
    ]);
  }, [
    authLoading,
    user,
    role,
    loadPedidos,
    loadRepartidores,
    loadCatalogos,
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
        nuevoEstado: estado,
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

  const asignarRepartidor = async (
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

  const abrirEditor = async (
    pedido: Pedido,
  ) => {
    try {
      setError(null);

      const result = await api(
        `/api/pedidos/${pedido.id}`,
      );

      const detalle =
        getApiObject<Pedido>(result) ??
        pedido;

      const tipoEntrega =
        getTipoEntrega(detalle);

      setPedidoEditando(detalle);

      setEditForm({
        productos:
          detalle.productos.map(
            productoToEdit,
          ),
        descuento: Number(
          detalle.descuento ?? 0,
        ),
        tipoEntrega,
        IdMunicipalidad:
          detalle.IdMunicipalidad ??
          "",
        direccionEntrega:
          detalle.direccionEntrega ??
          "",
        telefonoEntrega:
          detalle.telefonoEntrega ??
          "",
        IdPuntoRecogida:
          detalle.IdPuntoRecogida ??
          "",
        repartidorId:
          detalle.repartidorId ??
          "",
        estado: detalle.estado,
        descripcionCambio: "",
      });

      setConfirmarEntregado(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cargar el pedido.",
      );
    }
  };

  const cerrarEditor = () => {
    if (guardandoEdicion) {
      return;
    }

    setPedidoEditando(null);
    setEditForm(null);
    setConfirmarEntregado(false);
  };

  const productosEditados =
    editForm?.productos ?? [];

  const subtotalEditado = useMemo(
    () =>
      productosEditados.reduce(
        (total, producto) =>
          total +
          producto.cantidad *
            producto.precioUnitario,
        0,
      ),
    [productosEditados],
  );

  const descuentoEditado = Math.max(
    0,
    Number(editForm?.descuento ?? 0),
  );

  const totalEditado = Math.max(
    0,
    subtotalEditado -
      descuentoEditado,
  );

  const productosDisponibles =
    useMemo(() => {
      if (!editForm) {
        return [];
      }

      const ids = new Set(
        editForm.productos.map(
          (item) => item.productoId,
        ),
      );

      return productosCatalogo.filter(
        (producto) =>
          !ids.has(producto.id),
      );
    }, [
      editForm,
      productosCatalogo,
    ]);

  const puntosFiltrados =
    useMemo(() => {
      if (!editForm) {
        return [];
      }

      return puntosRecogida.filter(
        (punto) =>
          punto.IdMunicipalidad ===
          editForm.IdMunicipalidad,
      );
    }, [
      editForm,
      puntosRecogida,
    ]);

  const actualizarProducto = (
    productoId: string,
    campo:
      | "cantidad"
      | "precioUnitario",
    valor: number,
  ) => {
    setEditForm((actual) => {
      if (!actual) {
        return actual;
      }

      return {
        ...actual,
        productos:
          actual.productos.map(
            (producto) =>
              producto.productoId ===
              productoId
                ? {
                    ...producto,
                    [campo]:
                      Math.max(
                        0,
                        valor,
                      ),
                  }
                : producto,
          ),
      };
    });
  };

  const agregarProducto = (
    producto: ProductoCatalogo,
  ) => {
    setEditForm((actual) => {
      if (!actual) {
        return actual;
      }

      const precio = Number(
        producto.precioVenta ??
          producto.precio ??
          0,
      );

      return {
        ...actual,
        productos: [
          ...actual.productos,
          {
            productoId: producto.id,
            code: producto.code,
            nombre: producto.nombre,
            cantidad: 1,
            precioUnitario: precio,
            unidad: producto.unidad,
            IdProductor:
              producto.IdProductor,
            IdMunicipalidad:
              producto.IdMunicipalidad,
            presentacionCantidad:
              producto.presentacionCantidad,
            presentacionNombre:
              producto.presentacionNombre,
          },
        ],
      };
    });
  };

  const eliminarProducto = (
    productoId: string,
  ) => {
    setEditForm((actual) => {
      if (!actual) {
        return actual;
      }

      return {
        ...actual,
        productos:
          actual.productos.filter(
            (producto) =>
              producto.productoId !==
              productoId,
          ),
      };
    });
  };

  const guardarEdicion = async () => {
    if (
      !pedidoEditando ||
      !editForm
    ) {
      return;
    }

    setError(null);

    if (
      editForm.productos.length === 0
    ) {
      setError(
        "El pedido debe tener al menos un producto.",
      );
      return;
    }

    if (
      pedidoEditando.estado ===
        "entregado" &&
      !confirmarEntregado
    ) {
      setError(
        "Debes confirmar que deseas editar un pedido entregado.",
      );
      return;
    }

    if (
      editForm.productos.some(
        (producto) =>
          producto.cantidad <= 0,
      )
    ) {
      setError(
        "Todas las cantidades deben ser mayores que cero.",
      );
      return;
    }

    if (
      editForm.productos.some(
        (producto) =>
          producto.precioUnitario < 0,
      )
    ) {
      setError(
        "Los precios no pueden ser negativos.",
      );
      return;
    }

    if (
      editForm.descuento < 0 ||
      editForm.descuento >
        subtotalEditado
    ) {
      setError(
        "El descuento no puede ser mayor que el subtotal.",
      );
      return;
    }

    if (
      !editForm.IdMunicipalidad
    ) {
      setError(
        "Debes seleccionar una municipalidad.",
      );
      return;
    }

    if (
      editForm.tipoEntrega ===
        "domicilio" &&
      !editForm.direccionEntrega.trim()
    ) {
      setError(
        "La dirección de entrega es obligatoria.",
      );
      return;
    }

    if (
      editForm.tipoEntrega ===
        "recogida" &&
      !editForm.IdPuntoRecogida
    ) {
      setError(
        "Debes seleccionar un punto de recogida.",
      );
      return;
    }

    if (
      editForm.descripcionCambio
        .length > 1000
    ) {
      setError(
        "La descripción del cambio no puede superar 1000 caracteres.",
      );
      return;
    }

    try {
      setGuardandoEdicion(true);

      const result = await api(
        `/api/pedidos/${pedidoEditando.id}`,
        "PATCH",
        {
          productos:
            editForm.productos.map(
              (producto) => ({
                productoId:
                  producto.productoId,
                cantidad:
                  producto.cantidad,
                precioUnitario:
                  producto.precioUnitario,
              }),
            ),
          descuento:
            editForm.descuento,
          tipoEntrega:
            editForm.tipoEntrega,
          IdMunicipalidad:
            editForm.IdMunicipalidad,
          direccionEntrega:
            editForm.tipoEntrega ===
            "domicilio"
              ? editForm.direccionEntrega.trim()
              : "",
          telefonoEntrega:
            editForm.tipoEntrega ===
            "domicilio"
              ? editForm.telefonoEntrega.trim()
              : "",
          IdPuntoRecogida:
            editForm.tipoEntrega ===
            "recogida"
              ? editForm.IdPuntoRecogida
              : null,
          repartidorId:
            editForm.repartidorId ||
            null,
          estado: editForm.estado,
          descripcionCambio:
            editForm.descripcionCambio.trim(),
          confirmarEdicionEntregado:
            pedidoEditando.estado ===
            "entregado",
        },
      );

      const actualizado =
        getApiObject<Pedido>(result);

      if (actualizado) {
        setPedidos((actuales) =>
          actuales.map((item) =>
            item.id ===
            pedidoEditando.id
              ? {
                  ...item,
                  ...actualizado,
                }
              : item,
          ),
        );
      } else {
        await loadPedidos();
      }

      cerrarEditor();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la edición.",
      );
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const pedidosFiltrados =
    useMemo(() => {
      const texto = busqueda
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
            pedido.nombreCliente,
            pedido.direccionEntrega,
            pedido.IdMunicipalidad,
            pedido.repartidorId ??
              "",
            pedido.puntoRecogida
              ?.nombre ?? "",
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

  const estadisticas = useMemo(
    () => ({
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
    }),
    [pedidos],
  );

  if (authLoading) {
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

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-[var(--muted)]">
          Cargando pedidos…
        </p>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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
              saving !== null ||
              loading
            }
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:border-[var(--primary)] disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

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
                placeholder="ID, consumidor, dirección, producto..."
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
                    event.target
                      .value as
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
                            {
                              pedido
                                .productos
                                .length
                            }{" "}
                            {pedido
                              .productos
                              .length ===
                            1
                              ? "producto"
                              : "productos"}{" "}
                            ·{" "}
                            {pedido
                              .direccionEntrega ||
                              pedido
                                .puntoRecogida
                                ?.nombre ||
                              "Recogida"}
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

                    {expandido && (
                      <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
                        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
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

                          <div className="grid gap-4 border-b border-dashed border-[var(--border)] p-6 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                                Consumidor
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
                                {getTipoEntrega(
                                  pedido,
                                ) ===
                                "recogida"
                                  ? "Punto de recogida"
                                  : "Dirección de entrega"}
                              </p>

                              <p className="mt-1 text-sm">
                                {getTipoEntrega(
                                  pedido,
                                ) ===
                                "recogida"
                                  ? pedido
                                      .puntoRecogida
                                      ?.nombre ||
                                    "Recogida"
                                  : pedido.direccionEntrega}
                              </p>
                            </div>
                          </div>

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

                              {!!pedido.descuento && (
                                <div className="flex justify-between text-sm text-red-600">
                                  <span>
                                    Descuento
                                  </span>

                                  <span>
                                    -
                                    {formatMoney(
                                      pedido.descuento,
                                    )}
                                  </span>
                                </div>
                              )}

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

                          <div className="border-t border-dashed border-[var(--border)] bg-[var(--surface)] p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <h3 className="text-sm font-bold uppercase tracking-wider">
                                Gestión del pedido
                              </h3>

                              <button
                                type="button"
                                onClick={() =>
                                  void abrirEditor(
                                    pedido,
                                  )
                                }
                                className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                              >
                                Editar pedido
                              </button>
                            </div>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                                        item,
                                      ) => (
                                        <option
                                          key={
                                            item.uid
                                          }
                                          value={
                                            item.uid
                                          }
                                        >
                                          {item.displayName ||
                                            item.email}
                                        </option>
                                      ),
                                    )}
                                </select>
                              </div>

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

                          <div className="border-t border-dashed border-[var(--border)] p-5 text-center text-xs text-[var(--muted)]">
                            Pedido gestionado
                            desde el panel
                            administrativo de
                            Canastas Verdes.
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

      {pedidoEditando &&
        editForm && (
          <div className="fixed inset-0 z-50 bg-black/50 sm:flex sm:items-center sm:justify-center sm:p-4">
            <div className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[94vh] sm:max-w-5xl sm:rounded-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-4 sm:px-6">
                <div>
                  <h2 className="text-xl font-bold">
                    Editar pedido
                  </h2>

                  <p className="text-xs text-[var(--muted)]">
                    #{pedidoEditando.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarEditor}
                  disabled={
                    guardandoEdicion
                  }
                  className="rounded-lg px-3 py-2 text-2xl hover:bg-[var(--surface)] disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                {pedidoEditando.estado ===
                  "entregado" && (
                  <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-bold">
                      Pedido entregado
                    </p>

                    <p className="mt-1">
                      Este pedido ya fue
                      entregado. La edición
                      quedará registrada en el
                      historial de modificaciones.
                    </p>

                    <label className="mt-3 flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={
                          confirmarEntregado
                        }
                        onChange={(event) =>
                          setConfirmarEntregado(
                            event.target
                              .checked,
                          )
                        }
                        className="mt-0.5"
                      />

                      <span>
                        Confirmo que deseo
                        modificar este pedido
                        entregado.
                      </span>
                    </label>
                  </div>
                )}

                <section>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold">
                        Productos
                      </h3>

                      <p className="text-xs text-[var(--muted)]">
                        Modifica cantidades,
                        precios o agrega y
                        elimina productos.
                      </p>
                    </div>

                    <select
                      value=""
                      onChange={(event) => {
                        const producto =
                          productosCatalogo.find(
                            (item) =>
                              item.id ===
                              event.target
                                .value,
                          );

                        if (producto) {
                          agregarProducto(
                            producto,
                          );
                        }
                      }}
                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                    >
                      <option value="">
                        + Agregar producto
                      </option>

                      {productosDisponibles.map(
                        (producto) => (
                          <option
                            key={
                              producto.id
                            }
                            value={
                              producto.id
                            }
                          >
                            {producto.nombre} ·{" "}
                            {formatMoney(
                              Number(
                                producto.precioVenta ??
                                  producto.precio ??
                                  0,
                              ),
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="mt-4 space-y-3">
                    {editForm.productos.map(
                      (producto) => (
                        <div
                          key={
                            producto.productoId
                          }
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">
                                {
                                  producto.nombre
                                }
                              </p>

                              <p className="mt-1 text-xs text-[var(--muted)]">
                                Código:{" "}
                                {
                                  producto.code
                                }{" "}
                                ·{" "}
                                {
                                  producto.unidad
                                }
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:w-[280px]">
                              <div>
                                <label className="text-xs font-semibold text-[var(--muted)]">
                                  Cantidad
                                </label>

                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={
                                    producto.cantidad
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    actualizarProducto(
                                      producto.productoId,
                                      "cantidad",
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ),
                                    )
                                  }
                                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-[var(--muted)]">
                                  Precio COP
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={
                                    producto.precioUnitario
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    actualizarProducto(
                                      producto.productoId,
                                      "precioUnitario",
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ),
                                    )
                                  }
                                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                                />
                              </div>
                            </div>

                            <div className="text-right sm:w-32">
                              <p className="text-xs text-[var(--muted)]">
                                Subtotal
                              </p>

                              <p className="font-bold">
                                {formatMoney(
                                  producto.cantidad *
                                    producto.precioUnitario,
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarProducto(
                                  producto.productoId,
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </section>

                <section className="mt-6 rounded-xl border border-[var(--border)] p-4">
                  <h3 className="font-bold">
                    Precios y descuento
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        Subtotal
                      </p>

                      <p className="mt-1 text-lg font-bold">
                        {formatMoney(
                          subtotalEditado,
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold">
                        Descuento COP
                      </label>

                      <input
                        type="number"
                        min="0"
                        max={subtotalEditado}
                        value={
                          editForm.descuento
                        }
                        onChange={(event) =>
                          setEditForm(
                            (actual) =>
                              actual
                                ? {
                                    ...actual,
                                    descuento:
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ),
                                  }
                                : actual,
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        Total
                      </p>

                      <p className="mt-1 text-lg font-bold text-[var(--primary)]">
                        {formatMoney(
                          totalEditado,
                        )}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="mt-6 rounded-xl border border-[var(--border)] p-4">
                  <h3 className="font-bold">
                    Entrega
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold">
                        Tipo de entrega
                      </label>

                      <select
                        value={
                          editForm.tipoEntrega
                        }
                        onChange={(event) =>
                          setEditForm(
                            (actual) =>
                              actual
                                ? {
                                    ...actual,
                                    tipoEntrega:
                                      event
                                        .target
                                        .value as TipoEntrega,
                                  }
                                : actual,
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      >
                        <option value="domicilio">
                          Domicilio
                        </option>

                        <option value="recogida">
                          Recogida
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold">
                        Municipalidad
                      </label>

                      <select
                        value={
                          editForm.IdMunicipalidad
                        }
                        onChange={(event) =>
                          setEditForm(
                            (actual) =>
                              actual
                                ? {
                                    ...actual,
                                    IdMunicipalidad:
                                      event
                                        .target
                                        .value,
                                    IdPuntoRecogida:
                                      "",
                                  }
                                : actual,
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      >
                        <option value="">
                          Seleccionar
                        </option>

                        {municipalidades.map(
                          (
                            municipalidad,
                          ) => (
                            <option
                              key={
                                municipalidad.id
                              }
                              value={
                                municipalidad.id
                              }
                            >
                              {
                                municipalidad.nombre
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {editForm.tipoEntrega ===
                      "domicilio" && (
                      <>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold">
                            Dirección
                          </label>

                          <input
                            type="text"
                            value={
                              editForm.direccionEntrega
                            }
                            onChange={(event) =>
                              setEditForm(
                                (actual) =>
                                  actual
                                    ? {
                                        ...actual,
                                        direccionEntrega:
                                          event
                                            .target
                                            .value,
                                      }
                                    : actual,
                              )
                            }
                            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold">
                            Teléfono
                          </label>

                          <input
                            type="tel"
                            value={
                              editForm.telefonoEntrega
                            }
                            onChange={(event) =>
                              setEditForm(
                                (actual) =>
                                  actual
                                    ? {
                                        ...actual,
                                        telefonoEntrega:
                                          event
                                            .target
                                            .value,
                                      }
                                    : actual,
                              )
                            }
                            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                          />
                        </div>
                      </>
                    )}

                    {editForm.tipoEntrega ===
                      "recogida" && (
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold">
                          Punto de recogida
                        </label>

                        <select
                          value={
                            editForm.IdPuntoRecogida
                          }
                          onChange={(event) =>
                            setEditForm(
                              (actual) =>
                                actual
                                  ? {
                                      ...actual,
                                      IdPuntoRecogida:
                                        event
                                          .target
                                          .value,
                                    }
                                  : actual,
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                        >
                          <option value="">
                            Seleccionar punto
                          </option>

                          {puntosFiltrados.map(
                            (punto) => (
                              <option
                                key={
                                  punto.id
                                }
                                value={
                                  punto.id
                                }
                              >
                                {punto.nombre} ·{" "}
                                {
                                  punto.direccion
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold">
                        Repartidor
                      </label>

                      <select
                        value={
                          editForm.repartidorId
                        }
                        onChange={(event) =>
                          setEditForm(
                            (actual) =>
                              actual
                                ? {
                                    ...actual,
                                    repartidorId:
                                      event
                                        .target
                                        .value,
                                  }
                                : actual,
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                      >
                        <option value="">
                          Sin asignar
                        </option>

                        {repartidores
                          .filter(
                            (item) =>
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
                  </div>
                </section>

                <section className="mt-6 rounded-xl border border-[var(--border)] p-4">
                  <h3 className="font-bold">
                    Estado
                  </h3>

                  <div className="mt-4 max-w-sm">
                    <select
                      value={
                        editForm.estado
                      }
                      onChange={(event) =>
                        setEditForm(
                          (actual) =>
                            actual
                              ? {
                                  ...actual,
                                  estado:
                                    event
                                      .target
                                      .value as Estado,
                                }
                              : actual,
                        )
                      }
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
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
                </section>

                <section className="mt-6 rounded-xl border border-[var(--border)] p-4">
                  <h3 className="font-bold">
                    Trazabilidad
                  </h3>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Describe brevemente por
                    qué se modificó el pedido.
                  </p>

                  <textarea
                    maxLength={1000}
                    rows={4}
                    value={
                      editForm.descripcionCambio
                    }
                    onChange={(event) =>
                      setEditForm(
                        (actual) =>
                          actual
                            ? {
                                ...actual,
                                descripcionCambio:
                                  event
                                    .target
                                    .value,
                              }
                            : actual,
                      )
                    }
                    placeholder="Ej.: Producto agotado en el punto de recogida; consumidor aceptó reemplazo."
                    className="mt-3 w-full resize-y rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                  />

                  <p className="mt-1 text-right text-xs text-[var(--muted)]">
                    {
                      editForm
                        .descripcionCambio
                        .length
                    }
                    /1000
                  </p>
                </section>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[var(--border)] bg-white p-4 sm:flex-row sm:justify-end sm:p-5">
                <button
                  type="button"
                  onClick={cerrarEditor}
                  disabled={
                    guardandoEdicion
                  }
                  className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-semibold hover:bg-[var(--surface)] disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void guardarEdicion()
                  }
                  disabled={
                    guardandoEdicion ||
                    (pedidoEditando.estado ===
                      "entregado" &&
                      !confirmarEntregado)
                  }
                  className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoEdicion
                    ? "Guardando…"
                    : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}