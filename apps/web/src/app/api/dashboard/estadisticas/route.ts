import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

type Rol = "usuario" | "repartidor" | "admin";

type ProductoDocumento = {
  Nombre?: unknown;
  nombre?: unknown;
  descripcion?: unknown;
  precio?: unknown;
  stock?: unknown;
  categoria?: unknown;
  unidad?: unknown;
  imgPath?: unknown;
  activo?: unknown;
  code?: unknown;
  IdGranja?: unknown;
  IdMunicipalidad?: unknown;
};

type PedidoProducto = {
  productoId?: unknown;
  code?: unknown;
  nombre?: unknown;
  cantidad?: unknown;
  precioUnitario?: unknown;
  subtotal?: unknown;
  unidad?: unknown;
  IdGranja?: unknown;
  IdMunicipalidad?: unknown;
};

type PedidoDocumento = {
  usuarioId?: unknown;
  productos?: unknown;
  subtotal?: unknown;
  total?: unknown;
  estado?: unknown;
  reservaId?: unknown;
  IdMunicipalidad?: unknown;
  direccionEntrega?: unknown;
  repartidorId?: unknown;
  fechaCreacion?: unknown;
  ultimaActualizacion?: unknown;
  fechaCancelacion?: unknown;
};

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

type Finanzas = {
  disponible: boolean;
  ventas: number;
  costo: number | null;
  ganancia: number;
  mensaje: string;
};

/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function tokenFrom(request: Request): string | null {
  const value = request.headers.get("authorization");

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice(7).trim();

  return token || null;
}

function normalizeRole(value: unknown): Rol {
  if (typeof value !== "string") {
    return "usuario";
  }

  const role = value.trim().toLowerCase();

  if (role === "admin") {
    return "admin";
  }

  if (role === "repartidor") {
    return "repartidor";
  }

  return "usuario";
}

function roleFromClaims(
  claims: Record<string, unknown>,
): Rol | null {
  const role =
    claims.role ??
    claims.Rol ??
    claims.rol;

  if (
    role === "admin" ||
    role === "repartidor" ||
    role === "usuario"
  ) {
    return normalizeRole(role);
  }

  return null;
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function stringValue(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function displayValue(value: string): string {
  return value.replace(/_/g, " ").trim();
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function matchesFilter(
  value: string,
  filter: string | null,
): boolean {
  if (!filter) {
    return true;
  }

  if (!value) {
    return false;
  }

  return (
    normalizeText(value) ===
    normalizeText(filter)
  );
}

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const candidate = value as {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };

    if (typeof candidate.toDate === "function") {
      const date = candidate.toDate();

      return date instanceof Date &&
        !Number.isNaN(date.getTime())
        ? date
        : null;
    }

    if (typeof candidate.seconds === "number") {
      const milliseconds =
        candidate.seconds * 1000 +
        Math.floor(
          (candidate.nanoseconds ?? 0) / 1_000_000,
        );

      const date = new Date(milliseconds);

      return Number.isNaN(date.getTime())
        ? null
        : date;
    }
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  return null;
}

function parseDateStart(
  value: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(
      `${value}T00:00:00`,
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function parseDateEnd(
  value: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(
      `${value}T23:59:59.999`,
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function errorResponse(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status,
    },
  );
}

/*
 * ============================================================
 * AUTENTICACIÓN
 * ============================================================
 */

async function authenticateAdmin(
  request: Request,
) {
  const token = tokenFrom(request);

  if (!token) {
    throw new Error("NO_AUTH");
  }

  const user =
    await adminAuth.verifyIdToken(token);

  let role =
    roleFromClaims(
      user as Record<string, unknown>,
    );

  if (!role) {
    const usuarioSnap =
      await adminDb
        .collection("usuarios")
        .doc(user.uid)
        .get();

    if (usuarioSnap.exists) {
      const data =
        usuarioSnap.data() as Record<
          string,
          unknown
        >;

      role = normalizeRole(
        data.Rol ??
          data.rol ??
          data.Role ??
          data.role,
      );
    } else {
      role = "usuario";
    }
  }

  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return {
    user,
    role,
  };
}

/*
 * ============================================================
 * GET
 * ============================================================
 */

export async function GET(request: Request) {
  try {
    await authenticateAdmin(request);

    const url = new URL(request.url);

    const fechaDesdeParam =
      url.searchParams.get("fechaDesde");

    const fechaHastaParam =
      url.searchParams.get("fechaHasta");

    const categoria =
      url.searchParams.get("categoria");

    const producto =
      url.searchParams.get("producto");

    const granja =
      url.searchParams.get("granja");

    const municipio =
      url.searchParams.get("municipio");

    const repartidor =
      url.searchParams.get("repartidor");

    const fechaDesde =
      parseDateStart(fechaDesdeParam);

    const fechaHasta =
      parseDateEnd(fechaHastaParam);

    if (
      fechaDesdeParam &&
      !fechaDesde
    ) {
      return errorResponse(
        "La fechaDesde no tiene un formato válido.",
        400,
      );
    }

    if (
      fechaHastaParam &&
      !fechaHasta
    ) {
      return errorResponse(
        "La fechaHasta no tiene un formato válido.",
        400,
      );
    }

    if (
      fechaDesde &&
      fechaHasta &&
      fechaDesde > fechaHasta
    ) {
      return errorResponse(
        "La fechaDesde no puede ser posterior a fechaHasta.",
        400,
      );
    }

    /*
     * ========================================================
     * PRODUCTOS
     * ========================================================
     */

    const productosSnapshot =
      await adminDb
        .collection("productos")
        .get();

    const productosMap =
      new Map<
        string,
        ProductoDocumento
      >();

    for (
      const snapshot of productosSnapshot.docs
    ) {
      productosMap.set(
        snapshot.id,
        snapshot.data() as ProductoDocumento,
      );
    }

    /*
     * ========================================================
     * CATÁLOGO DE CATEGORÍAS Y GRANJAS
     * ========================================================
     *
     * Se construye ANTES de aplicar filtros.
     *
     * Esto es importante:
     *
     * /estadisticas?categoria=Frutas
     *
     * seguirá mostrando todas las categorías
     * disponibles en el desplegable.
     */

    const categoriasMap =
      new Map<string, string>();

    const granjasMap =
      new Map<string, string>();

    for (
      const productoData of productosMap.values()
    ) {
      const categoriaProducto =
        stringValue(
          productoData.categoria,
        );

      if (categoriaProducto) {
        categoriasMap.set(
          categoriaProducto,
          displayValue(
            categoriaProducto,
          ),
        );
      }

      const granjaProducto =
        stringValue(
          productoData.IdGranja,
        );

      if (granjaProducto) {
        granjasMap.set(
          granjaProducto,
          displayValue(
            granjaProducto,
          ),
        );
      }
    }

    /*
     * ========================================================
     * MUNICIPALIDADES
     * ========================================================
     */

    const municipiosSnapshot =
      await adminDb
        .collection("municipalidades")
        .get();

    const municipiosMap =
      new Map<string, string>();

    for (
      const snapshot of municipiosSnapshot.docs
    ) {
      const data =
        snapshot.data() as Record<
          string,
          unknown
        >;

      const id =
        stringValue(
          data.Id ??
            data.id ??
            snapshot.id,
        );

      const nombre =
        stringValue(
          data.Nombre ??
            data.nombre ??
            id,
        );

      if (id) {
        municipiosMap.set(
          id,
          nombre,
        );
      }

      if (snapshot.id) {
        municipiosMap.set(
          snapshot.id,
          nombre,
        );
      }
    }

    /*
     * ========================================================
     * REPARTIDORES
     * ========================================================
     *
     * El catálogo de repartidores también se construye
     * independientemente de las estadísticas.
     */

    const usuariosSnapshot =
      await adminDb
        .collection("usuarios")
        .get();

    const repartidoresMap =
      new Map<string, string>();

    for (
      const snapshot of usuariosSnapshot.docs
    ) {
      const data =
        snapshot.data() as Record<
          string,
          unknown
        >;

      const role =
        normalizeRole(
          data.Rol ??
            data.rol ??
            data.Role ??
            data.role,
        );

      if (role !== "repartidor") {
        continue;
      }

      const nombres =
        stringValue(
          data.Nombres ??
            data.nombres ??
            "",
        );

      const apellidos =
        stringValue(
          data.Apellidos ??
            data.apellidos ??
            "",
        );

      const nombreCompleto =
        `${nombres} ${apellidos}`
          .trim()
          .replace(
            /_/g,
            " ",
          );

      repartidoresMap.set(
        snapshot.id,
        nombreCompleto ||
          snapshot.id,
      );
    }

    /*
     * ========================================================
     * CATÁLOGOS PARA EL FRONTEND
     * ========================================================
     */

    const catalogoCategorias: CatalogoOpcion[] =
      [
        ...categoriasMap.entries(),
      ]
        .map(
          ([id, nombre]) => ({
            id,
            nombre,
          }),
        )
        .sort(
          (a, b) =>
            a.nombre.localeCompare(
              b.nombre,
              "es",
            ),
        );

    const catalogoGranjas: CatalogoOpcion[] =
      [
        ...granjasMap.entries(),
      ]
        .map(
          ([id, nombre]) => ({
            id,
            nombre,
          }),
        )
        .sort(
          (a, b) =>
            a.nombre.localeCompare(
              b.nombre,
              "es",
            ),
        );

    const catalogoMunicipios: CatalogoOpcion[] =
      [
        ...municipiosMap.entries(),
      ]
        .filter(
          ([id]) =>
            id.length > 0,
        )
        .map(
          ([id, nombre]) => ({
            id,
            nombre: displayValue(
              nombre,
            ),
          }),
        );

    /*
     * Eliminamos posibles duplicados producidos por
     * guardar tanto Id como document ID.
     */

    const municipiosUnicos =
      new Map<string, CatalogoOpcion>();

    for (
      const municipioItem of catalogoMunicipios
    ) {
      if (
        !municipiosUnicos.has(
          municipioItem.id,
        )
      ) {
        municipiosUnicos.set(
          municipioItem.id,
          municipioItem,
        );
      }
    }

    const catalogoProductos: CatalogoOpcion[] =
  [...productosMap.entries()]
    .map(([id, productoData]) => {
      const nombre =
        stringValue(
          productoData.Nombre ??
            productoData.nombre ??
            id,
        );

      const code =
        stringValue(
          productoData.code,
        );

      return {
        id,
        nombre: code
          ? `${displayValue(nombre)} (${displayValue(code)})`
          : displayValue(nombre),
      };
    })
    .sort((a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        "es",
      ),
    );

    const catalogoRepartidores: CatalogoOpcion[] =
      [
        ...repartidoresMap.entries(),
      ]
        .map(
          ([id, nombre]) => ({
            id,
            nombre: displayValue(
              nombre,
            ),
          }),
        )
        .sort(
          (a, b) =>
            a.nombre.localeCompare(
              b.nombre,
              "es",
            ),
        );

    /*
     * ========================================================
     * PEDIDOS
     * ========================================================
     */

    const pedidosSnapshot =
      await adminDb
        .collection("pedidos")
        .get();

    /*
     * ========================================================
     * ACUMULADORES
     * ========================================================
     */

    const productosStats =
      new Map<
        string,
        EstadisticaProducto
      >();

    const granjasStats =
      new Map<
        string,
        EstadisticaGrupo
      >();

    const municipiosProductoresStats =
      new Map<
        string,
        EstadisticaGrupo
      >();

    const municipiosEntregaStats =
      new Map<
        string,
        EstadisticaGrupo
      >();

    const repartidoresStats =
      new Map<
        string,
        EstadisticaRepartidor
      >();

    let pedidosContabilizados = 0;
    let unidadesVendidas = 0;
    let ventasProductos = 0;
    let ventasTotales = 0;

    /*
     * ========================================================
     * CATÁLOGO ACTUAL
     * ========================================================
     */

    let productosActivos = 0;
    let stockActualCatalogo = 0;

    for (
      const productoData of productosMap.values()
    ) {
      if (
        productoData.activo === true
      ) {
        productosActivos += 1;
      }

      stockActualCatalogo +=
        Math.max(
          0,
          numberValue(
            productoData.stock,
          ),
        );
    }

    /*
     * ========================================================
     * PROCESAMIENTO DE PEDIDOS
     * ========================================================
     */

    for (
      const pedidoSnapshot of pedidosSnapshot.docs
    ) {
      const pedido =
        pedidoSnapshot.data() as PedidoDocumento;

      /*
       * Solo entregados.
       */

      if (
        stringValue(
          pedido.estado,
        ) !== "entregado"
      ) {
        continue;
      }

      /*
       * ======================================================
       * FECHA
       * ======================================================
       */

      const fechaCreacion =
        parseDate(
          pedido.fechaCreacion,
        );

      if (
        fechaDesde &&
        (
          !fechaCreacion ||
          fechaCreacion < fechaDesde
        )
      ) {
        continue;
      }

      if (
        fechaHasta &&
        (
          !fechaCreacion ||
          fechaCreacion > fechaHasta
        )
      ) {
        continue;
      }

      /*
       * ======================================================
       * REPARTIDOR
       * ======================================================
       */

      const repartidorId =
        stringValue(
          pedido.repartidorId,
        );

      if (
        repartidor &&
        !matchesFilter(
          repartidorId,
          repartidor,
        )
      ) {
        continue;
      }

      /*
       * ======================================================
       * PRODUCTOS
       * ======================================================
       */

      const pedidoProductos =
        Array.isArray(
          pedido.productos,
        )
          ? pedido.productos
          : [];

      if (
        pedidoProductos.length === 0
      ) {
        continue;
      }

      const totalPedido =
        Math.max(
          0,
          numberValue(
            pedido.total,
          ),
        );

      /*
       * ======================================================
       * MUNICIPIO DE ENTREGA
       * ======================================================
       */

      const municipioEntregaId =
        stringValue(
          pedido.IdMunicipalidad,
        );

      const municipioEntregaNombre =
        municipiosMap.get(
          municipioEntregaId,
        ) ||
        municipioEntregaId;

      /*
       * ======================================================
       * FILTRO MUNICIPIO
       * ======================================================
       *
       * Puede coincidir con:
       *
       * - municipio de entrega
       * - municipio productor
       */

      if (municipio) {
        const coincideEntrega =
          matchesFilter(
            municipioEntregaId,
            municipio,
          ) ||
          matchesFilter(
            municipioEntregaNombre,
            municipio,
          );

        if (!coincideEntrega) {
          const coincideProducto =
            pedidoProductos.some(
              (itemUnknown) => {
                if (
                  !itemUnknown ||
                  typeof itemUnknown !==
                    "object"
                ) {
                  return false;
                }

                const item =
                  itemUnknown as PedidoProducto;

                const productoId =
                  stringValue(
                    item.productoId,
                  );

                const productoData =
                  productosMap.get(
                    productoId,
                  );

                const municipioProductoId =
                  stringValue(
                    item.IdMunicipalidad ??
                      productoData?.IdMunicipalidad,
                  );

                const municipioProductoNombre =
                  municipiosMap.get(
                    municipioProductoId,
                  ) ||
                  municipioProductoId;

                return (
                  matchesFilter(
                    municipioProductoId,
                    municipio,
                  ) ||
                  matchesFilter(
                    municipioProductoNombre,
                    municipio,
                  )
                );
              },
            );

          if (!coincideProducto) {
            continue;
          }
        }
      }

      /*
       * ======================================================
       * ACUMULACIÓN DE PRODUCTOS
       * ======================================================
       */

      let pedidoVentasProductos = 0;
      let pedidoUnidades = 0;

      let pedidoTieneProductoFiltrado =
        !producto &&
        !categoria &&
        !granja;

      for (
        const itemUnknown of pedidoProductos
      ) {
        if (
          !itemUnknown ||
          typeof itemUnknown !==
            "object"
        ) {
          continue;
        }

        const item =
          itemUnknown as PedidoProducto;

        const productoId =
          stringValue(
            item.productoId,
          );

        if (!productoId) {
          continue;
        }

        const productoData =
          productosMap.get(
            productoId,
          );

        const nombre =
          stringValue(
            item.nombre ??
              productoData?.Nombre ??
              productoData?.nombre ??
              productoId,
          );

        const code =
          stringValue(
            item.code ??
              productoData?.code ??
              "",
          );

        const unidad =
          stringValue(
            item.unidad ??
              productoData?.unidad ??
              "",
          );

        const categoriaProducto =
          stringValue(
            productoData?.categoria,
          );

        const granjaProducto =
          stringValue(
            item.IdGranja ??
              productoData?.IdGranja ??
              "",
          );

        const municipioProducto =
          stringValue(
            item.IdMunicipalidad ??
              productoData?.IdMunicipalidad ??
              "",
          );

        const municipioProductoNombre =
          municipiosMap.get(
            municipioProducto,
          ) ||
          municipioProducto;

        /*
         * ====================================================
         * FILTRO PRODUCTO
         * ====================================================
         */

        if (
          producto &&
          !(
            matchesFilter(
              productoId,
              producto,
            ) ||
            matchesFilter(
              code,
              producto,
            ) ||
            matchesFilter(
              nombre,
              producto,
            )
          )
        ) {
          continue;
        }

        /*
         * ====================================================
         * FILTRO CATEGORÍA
         * ====================================================
         */

        if (
          categoria &&
          !matchesFilter(
            categoriaProducto,
            categoria,
          )
        ) {
          continue;
        }

        /*
         * ====================================================
         * FILTRO GRANJA
         * ====================================================
         */

        if (
          granja &&
          !matchesFilter(
            granjaProducto,
            granja,
          )
        ) {
          continue;
        }

        /*
         * ====================================================
         * FILTRO MUNICIPIO
         * ====================================================
         */

        if (municipio) {
          const coincideMunicipio =
            matchesFilter(
              municipioProducto,
              municipio,
            ) ||
            matchesFilter(
              municipioProductoNombre,
              municipio,
            ) ||
            matchesFilter(
              municipioEntregaId,
              municipio,
            ) ||
            matchesFilter(
              municipioEntregaNombre,
              municipio,
            );

          if (!coincideMunicipio) {
            continue;
          }
        }

        pedidoTieneProductoFiltrado =
          true;

        const cantidad =
          Math.max(
            0,
            numberValue(
              item.cantidad,
            ),
          );

        const subtotal =
          Math.max(
            0,
            numberValue(
              item.subtotal,
            ),
          );

        pedidoUnidades +=
          cantidad;

        pedidoVentasProductos +=
          subtotal;

        /*
         * ====================================================
         * PRODUCTO
         * ====================================================
         */

        const existingProduct =
          productosStats.get(
            productoId,
          );

        if (existingProduct) {
          existingProduct.unidadesVendidas +=
            cantidad;

          existingProduct.ventas +=
            subtotal;
        } else {
          productosStats.set(
            productoId,
            {
              productoId,
              code,
              nombre,
              unidad,
              categoria:
                categoriaProducto,
              IdGranja:
                granjaProducto,
              IdMunicipalidad:
                municipioProducto,
              unidadesVendidas:
                cantidad,
              ventas:
                subtotal,
            },
          );
        }

        /*
         * ====================================================
         * GRANJA
         * ====================================================
         */

        if (granjaProducto) {
          const existingFarm =
            granjasStats.get(
              granjaProducto,
            );

          if (existingFarm) {
            existingFarm.unidadesVendidas +=
              cantidad;

            existingFarm.ventas +=
              subtotal;

            existingFarm.productos +=
              1;
          } else {
            granjasStats.set(
              granjaProducto,
              {
                id:
                  granjaProducto,
                nombre:
                  displayValue(
                    granjaProducto,
                  ),
                unidadesVendidas:
                  cantidad,
                ventas:
                  subtotal,
                productos:
                  1,
                pedidos:
                  0,
              },
            );
          }
        }

        /*
         * ====================================================
         * MUNICIPIO PRODUCTOR
         * ====================================================
         */

        if (municipioProducto) {
          const existingMunicipality =
            municipiosProductoresStats.get(
              municipioProducto,
            );

          if (
            existingMunicipality
          ) {
            existingMunicipality.unidadesVendidas +=
              cantidad;

            existingMunicipality.ventas +=
              subtotal;

            existingMunicipality.productos +=
              1;
          } else {
            municipiosProductoresStats.set(
              municipioProducto,
              {
                id:
                  municipioProducto,
                nombre:
                  displayValue(
                    municipioProductoNombre,
                  ),
                unidadesVendidas:
                  cantidad,
                ventas:
                  subtotal,
                productos:
                  1,
                pedidos:
                  0,
              },
            );
          }
        }
      }

      if (
        !pedidoTieneProductoFiltrado
      ) {
        continue;
      }

      /*
       * ======================================================
       * RESUMEN
       * ======================================================
       */

      pedidosContabilizados += 1;

      unidadesVendidas +=
        pedidoUnidades;

      ventasProductos +=
        pedidoVentasProductos;

      if (
        producto ||
        categoria ||
        granja
      ) {
        ventasTotales +=
          pedidoVentasProductos;
      } else {
        ventasTotales +=
          totalPedido;
      }

      /*
       * ======================================================
       * GRANJAS -> PEDIDOS
       * ======================================================
       */

      const granjasDelPedido =
        new Set<string>();

      for (
        const itemUnknown of pedidoProductos
      ) {
        if (
          !itemUnknown ||
          typeof itemUnknown !==
            "object"
        ) {
          continue;
        }

        const item =
          itemUnknown as PedidoProducto;

        const granjaId =
          stringValue(
            item.IdGranja,
          );

        if (
          granjaId &&
          granjasStats.has(
            granjaId,
          )
        ) {
          granjasDelPedido.add(
            granjaId,
          );
        }
      }

      for (
        const granjaId of granjasDelPedido
      ) {
        const farm =
          granjasStats.get(
            granjaId,
          );

        if (farm) {
          farm.pedidos += 1;
        }
      }

      /*
       * ======================================================
       * MUNICIPIOS PRODUCTORES -> PEDIDOS
       * ======================================================
       */

      const municipiosDelPedido =
        new Set<string>();

      for (
        const itemUnknown of pedidoProductos
      ) {
        if (
          !itemUnknown ||
          typeof itemUnknown !==
            "object"
        ) {
          continue;
        }

        const item =
          itemUnknown as PedidoProducto;

        const municipioId =
          stringValue(
            item.IdMunicipalidad,
          );

        if (
          municipioId &&
          municipiosProductoresStats.has(
            municipioId,
          )
        ) {
          municipiosDelPedido.add(
            municipioId,
          );
        }
      }

      for (
        const municipioId of municipiosDelPedido
      ) {
        const municipality =
          municipiosProductoresStats.get(
            municipioId,
          );

        if (municipality) {
          municipality.pedidos += 1;
        }
      }

      /*
       * ======================================================
       * MUNICIPIO DE ENTREGA
       * ======================================================
       */

      if (municipioEntregaId) {
        const existingMunicipality =
          municipiosEntregaStats.get(
            municipioEntregaId,
          );

        if (existingMunicipality) {
          existingMunicipality.ventas +=
            totalPedido;

          existingMunicipality.pedidos +=
            1;

          existingMunicipality.unidadesVendidas +=
            pedidoUnidades;
        } else {
          municipiosEntregaStats.set(
            municipioEntregaId,
            {
              id:
                municipioEntregaId,

              nombre:
                displayValue(
                  municipioEntregaNombre,
                ),

              unidadesVendidas:
                pedidoUnidades,

              ventas:
                totalPedido,

              productos:
                pedidoProductos.length,

              pedidos:
                1,
            },
          );
        }
      }

      /*
       * ======================================================
       * REPARTIDOR
       * ======================================================
       */

      if (repartidorId) {
        const existingDeliverer =
          repartidoresStats.get(
            repartidorId,
          );

        if (existingDeliverer) {
          existingDeliverer.pedidosEntregados +=
            1;

          existingDeliverer.ventasGeneradas +=
            totalPedido;
        } else {
          repartidoresStats.set(
            repartidorId,
            {
              id:
                repartidorId,

              nombre:
                displayValue(
                  repartidoresMap.get(
                    repartidorId,
                  ) ||
                    repartidorId,
                ),

              pedidosEntregados:
                1,

              ventasGeneradas:
                totalPedido,
            },
          );
        }
      }
    }

    /*
     * ========================================================
     * ORDENAR
     * ========================================================
     */

    const productosMasVendidos =
      [...productosStats.values()]
        .sort(
          (a, b) =>
            b.unidadesVendidas -
            a.unidadesVendidas,
        );

    const productosPorIngresos =
      [...productosStats.values()]
        .sort(
          (a, b) =>
            b.ventas -
            a.ventas,
        );

    const granjas =
      [...granjasStats.values()]
        .sort(
          (a, b) =>
            b.unidadesVendidas -
            a.unidadesVendidas,
        );

    const municipiosProductores =
      [
        ...municipiosProductoresStats.values(),
      ].sort(
        (a, b) =>
          b.unidadesVendidas -
          a.unidadesVendidas,
      );

    const municipiosEntrega =
      [
        ...municipiosEntregaStats.values(),
      ].sort(
        (a, b) =>
          b.ventas -
          a.ventas,
      );

    const repartidores =
      [...repartidoresStats.values()]
        .sort(
          (a, b) =>
            b.pedidosEntregados -
            a.pedidosEntregados,
        );

    /*
     * ========================================================
     * FINANZAS
     * ========================================================
     */

    const finanzas = {
      productos: {
        disponible: true,
        ventas:
          ventasProductos,
        costo: null,
        ganancia:
          ventasProductos,
        mensaje:
          "Actualmente se registra el valor de venta de los productos, pero no su costo de adquisición. Por tanto, este valor representa ingresos por productos, no utilidad neta.",
      } satisfies Finanzas,

      logistica: {
        disponible: false,
        ventas: 0,
        costo: 0,
        ganancia: 0,
        mensaje:
          "Todavía no existen campos de logística registrados en los pedidos.",
      } satisfies Finanzas,

      almacenamiento: {
        disponible: false,
        ventas: 0,
        costo: 0,
        ganancia: 0,
        mensaje:
          "Todavía no existen campos de almacenamiento registrados en los pedidos.",
      } satisfies Finanzas,

      entrega: {
        disponible: false,
        ventas: 0,
        costo: 0,
        ganancia: 0,
        mensaje:
          "Todavía no existe un valor económico de entrega registrado por pedido o repartidor.",
      } satisfies Finanzas,
    };

    /*
     * ========================================================
     * RESPUESTA
     * ========================================================
     */

    return NextResponse.json({
      success: true,

      filtros: {
        fechaDesde:
          fechaDesdeParam || null,
        fechaHasta:
          fechaHastaParam || null,
        categoria:
          categoria || null,
        producto:
          producto || null,
        granja:
          granja || null,
        municipio:
          municipio || null,
        repartidor:
          repartidor || null,
      },

      resumen: {
        pedidos:
          pedidosContabilizados,

        unidadesVendidas,

        gananciasProductos:
          ventasProductos,

        gananciasLogistica:
          0,

        gananciasAlmacenamiento:
          0,

        gananciasEntrega:
          0,

        gananciasTotales:
          ventasTotales,

        ingresosTotales:
          ventasTotales,
      },

      finanzas,

      productosMasVendidos,

      productosPorIngresos,

      granjas,

      municipios: {
        productores:
          municipiosProductores,
        entrega:
          municipiosEntrega,
      },

      repartidores,

      /*
       * ======================================================
       * CATÁLOGOS PARA FILTROS
       * ======================================================
       */

      catalogos: {
  productos: catalogoProductos,

  categorias: catalogoCategorias,

  granjas: catalogoGranjas,

  municipios: [
    ...municipiosUnicos.values(),
  ].sort(
    (a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        "es",
      ),
  ),

  repartidores: catalogoRepartidores,
},

      /*
       * ======================================================
       * INFORMACIÓN DEL CATÁLOGO
       * ======================================================
       */

      catalogo: {
        productosActivos,

        stockActual:
          stockActualCatalogo,

        ofertaHistoricaDisponible:
          false,

        mensaje:
          "El sistema actualmente almacena el stock actual, pero no registra un histórico de cantidades ofrecidas. No se calcula oferta histórica a partir del stock actual.",
      },

      metadata: {
        estadosContabilizados: [
          "entregado",
        ],

        estadosExcluidos: [
          "pendiente",
          "asignado",
          "en_camino",
          "cancelado",
        ],

        totalPedidosEncontrados:
          pedidosSnapshot.size,

        totalProductosCatalogo:
          productosMap.size,

        totalRepartidores:
          repartidoresMap.size,
      },
    });
  } catch (error) {
    console.error(
      "Error obteniendo estadísticas del dashboard:",
      error,
    );

    if (
      error instanceof Error
    ) {
      switch (
        error.message
      ) {
        case "NO_AUTH":
          return errorResponse(
            "Debes iniciar sesión.",
            401,
          );

        case "FORBIDDEN":
          return errorResponse(
            "No tienes permiso para consultar las estadísticas.",
            403,
          );
      }
    }

    return errorResponse(
      "No fue posible obtener las estadísticas.",
      500,
    );
  }
}