import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type Rol = "consumidor" | "repartidor" | "admin";

type ProductoDocumento = {
  code?: unknown;
  nombre?: unknown;
  descripcion?: unknown;
  precio?: unknown;
  stock?: unknown;
  costoPcc?: unknown;
  porcentajeLogistica?: unknown;
  porcentajeTransporte?: unknown;
  precioSugerido?: unknown;
  precioVenta?: unknown;
  categoria?: unknown;
  unidad?: unknown;
  activo?: unknown;
  IdProductor?: unknown;
  IdMunicipalidad?: unknown;
  FechaCierre?: unknown;
};

type PedidoProducto = {
  productoId?: unknown;
  code?: unknown;
  nombre?: unknown;
  cantidad?: unknown;
  precioUnitario?: unknown;
  precioFinal?: unknown;
  subtotal?: unknown;
  unidad?: unknown;

  IdProductor?: unknown;
  IdMunicipalidad?: unknown;

  costoPccUnitario?: unknown;
  costoPcc?: unknown;
  porcentajeLogistica?: unknown;
  porcentajeTransporte?: unknown;
  costoLogistica?: unknown;
  costoTransporte?: unknown;
  otrosCostos?: unknown;
  costoTotal?: unknown;
  utilidad?: unknown;
};

type PedidoDocumento = {
  usuarioId?: unknown;
  productos?: unknown;
  subtotal?: unknown;
  total?: unknown;
  precioFinal?: unknown;

  costoProductos?: unknown;
  costoPcc?: unknown;
  costoLogistica?: unknown;
  costoTransporte?: unknown;
  otrosCostos?: unknown;
  costoTotal?: unknown;
  utilidad?: unknown;
  margen?: unknown;

  estado?: unknown;
  IdMunicipalidad?: unknown;
  repartidorId?: unknown;
  fechaCreacion?: unknown;
  fechaRecibido?: unknown;
};

type UsuarioDocumento = {
  Nombres?: unknown;
  Apellidos?: unknown;
  Correo?: unknown;
  Rol?: unknown;
};

type ProductorDocumento = {
  nombre?: unknown;
  descripcion?: unknown;
  activo?: unknown;
};

type MunicipalidadDocumento = {
  nombre?: unknown;
  departamento?: unknown;
  activo?: unknown;
};

type CategoriaDocumento = {
  nombre?: unknown;
  activo?: unknown;
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

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function positiveNumber(value: unknown): number {
  return Math.max(0, numberValue(value));
}

function timestampToDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function normalizeRole(value: unknown): Rol | null {
  const role = stringValue(value).toLowerCase();

  if (
    role === "admin" ||
    role === "repartidor" ||
    role === "consumidor"
  ) {
    return role;
  }

  return null;
}

function tokenFrom(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  return token || null;
}

function queryValue(
  searchParams: URLSearchParams,
  key: string,
): string {
  return (searchParams.get(key) ?? "").trim();
}

function withinDateRange(
  date: Date | null,
  desde: Date | null,
  hasta: Date | null,
): boolean {
  if (!date) {
    return false;
  }

  if (desde && date < desde) {
    return false;
  }

  if (hasta && date > hasta) {
    return false;
  }

  return true;
}

function displayName(
  first: unknown,
  last: unknown,
  fallback: string,
): string {
  const name =
    `${stringValue(first)} ${stringValue(last)}`.trim();

  return name || fallback;
}

export async function GET(request: Request) {
  try {
    /*
     * ================================================
     * Autenticación
     * ================================================
     */

    const token = tokenFrom(request);

    if (!token) {
      return errorResponse(
        "No autorizado.",
        401,
      );
    }

    const decoded =
      await adminAuth.verifyIdToken(token);

    const userSnapshot = await adminDb
      .collection("usuarios")
      .doc(decoded.uid)
      .get();

    const userData =
      userSnapshot.exists
        ? (userSnapshot.data() as UsuarioDocumento)
        : null;

    const role = normalizeRole(
      decoded.role ??
        decoded.rol ??
        userData?.Rol,
    );

    if (role !== "admin") {
      return errorResponse(
        "No tienes permisos para consultar las estadísticas.",
        403,
      );
    }

    /*
     * ================================================
     * Filtros
     * ================================================
     */

    const url = new URL(request.url);
    const params = url.searchParams;

    const categoria = queryValue(params, "categoria");
    const producto = queryValue(params, "producto");
    const productor = queryValue(params, "productor");
    const municipio = queryValue(params, "municipio");
    const repartidor = queryValue(params, "repartidor");
    const desdeValue = queryValue(params, "desde");
    const hastaValue = queryValue(params, "hasta");

    let desde: Date | null = null;
    let hasta: Date | null = null;

    if (desdeValue) {
      desde = new Date(`${desdeValue}T00:00:00`);

      if (Number.isNaN(desde.getTime())) {
        return errorResponse(
          "La fecha inicial no es válida.",
          400,
        );
      }
    }

    if (hastaValue) {
      hasta = new Date(`${hastaValue}T23:59:59.999`);

      if (Number.isNaN(hasta.getTime())) {
        return errorResponse(
          "La fecha final no es válida.",
          400,
        );
      }
    }

    /*
     * ================================================
     * Cargar catálogos
     * ================================================
     */

    const [
      productosSnapshot,
      productoresSnapshot,
      municipalidadesSnapshot,
      usuariosSnapshot,
      categoriasSnapshot,
      pedidosSnapshot,
    ] = await Promise.all([
      adminDb.collection("productos").get(),
      adminDb.collection("productores").get(),
      adminDb.collection("municipalidades").get(),
      adminDb.collection("usuarios").get(),
      adminDb.collection("categorias").get(),
      adminDb.collection("pedidos").get(),
    ]);

    /*
     * ================================================
     * Mapas
     * ================================================
     */

    const productosMap =
      new Map<string, ProductoDocumento>();

    for (const doc of productosSnapshot.docs) {
      productosMap.set(
        doc.id,
        doc.data() as ProductoDocumento,
      );
    }

    const productoresMap =
      new Map<string, ProductorDocumento>();

    for (const doc of productoresSnapshot.docs) {
      productoresMap.set(
        doc.id,
        doc.data() as ProductorDocumento,
      );
    }

    const municipalidadesMap =
      new Map<string, MunicipalidadDocumento>();

    for (const doc of municipalidadesSnapshot.docs) {
      municipalidadesMap.set(
        doc.id,
        doc.data() as MunicipalidadDocumento,
      );
    }

    const categoriasMap =
      new Map<string, CategoriaDocumento>();

    for (const doc of categoriasSnapshot.docs) {
      categoriasMap.set(
        doc.id,
        doc.data() as CategoriaDocumento,
      );
    }

    const repartidoresMap =
      new Map<
        string,
        {
          id: string;
          nombre: string;
          correo: string;
        }
      >();

    for (const doc of usuariosSnapshot.docs) {
      const data =
        doc.data() as UsuarioDocumento;

      if (normalizeRole(data.Rol) !== "repartidor") {
        continue;
      }

      repartidoresMap.set(doc.id, {
        id: doc.id,
        nombre: displayName(
          data.Nombres,
          data.Apellidos,
          doc.id,
        ),
        correo: stringValue(data.Correo),
      });
    }

    /*
     * ================================================
     * Estadísticas
     * ================================================
     */

    const productosStats =
      new Map<string, ProductoEstadistica>();

    const productoresStats =
      new Map<
        string,
        {
          id: string;
          nombre: string;
          ventas: number;
          costo: number;
          utilidad: number;
          productosVendidos: number;
          pedidos: number;
        }
      >();

    const municipiosProductorStats =
      new Map<
        string,
        {
          id: string;
          nombre: string;
          departamento: string;
          ventas: number;
          pedidos: number;
        }
      >();

    const municipiosEntregaStats =
      new Map<
        string,
        {
          id: string;
          nombre: string;
          departamento: string;
          ventas: number;
          pedidos: number;
        }
      >();

    const repartidoresStats =
      new Map<
        string,
        {
          id: string;
          nombre: string;
          correo: string;
          ventasGeneradas: number;
          pedidosEntregados: number;
        }
      >();

    const consumidores = new Set<string>();

    let pedidosEntregados = 0;
    let ventasTotales = 0;
    let costosTotales = 0;
    let utilidadTotal = 0;
    let productosVendidos = 0;

    /*
     * ================================================
     * Procesar pedidos entregados
     * ================================================
     */

    for (const pedidoDoc of pedidosSnapshot.docs) {
      const pedido =
        pedidoDoc.data() as PedidoDocumento;

      if (stringValue(pedido.estado) !== "entregado") {
        continue;
      }

      /*
       * Se mantiene la fecha de creación como fecha
       * principal del filtro histórico.
       */
      const fechaCreacion =
        timestampToDate(pedido.fechaCreacion);

      if (
        !withinDateRange(
          fechaCreacion,
          desde,
          hasta,
        )
      ) {
        continue;
      }

      const pedidoProductos =
        Array.isArray(pedido.productos)
          ? (pedido.productos as PedidoProducto[])
          : [];

      if (pedidoProductos.length === 0) {
        continue;
      }

      /*
       * Municipio de entrega.
       */
      const pedidoMunicipioId =
        stringValue(pedido.IdMunicipalidad);

      if (
        municipio &&
        pedidoMunicipioId !== municipio
      ) {
        continue;
      }

      /*
       * Repartidor.
       */
      const pedidoRepartidorId =
        stringValue(pedido.repartidorId);

      if (
        repartidor &&
        pedidoRepartidorId !== repartidor
      ) {
        continue;
      }

      let pedidoVentas = 0;
      let pedidoCostos = 0;
      let pedidoUtilidad = 0;
      let pedidoProductosVendidos = 0;

      let pedidoCoincide = false;

      const productoresPedido =
        new Set<string>();

      /*
       * ==============================================
       * Items del pedido
       *
       * IMPORTANTE:
       * Los valores financieros salen del snapshot
       * guardado al marcar el pedido como entregado.
       * ==============================================
       */

      for (const item of pedidoProductos) {
        const productoId =
          stringValue(item.productoId);

        const productoDoc =
          productosMap.get(productoId);

        const nombre =
          stringValue(item.nombre) ||
          stringValue(productoDoc?.nombre) ||
          productoId;

        const code =
          stringValue(item.code) ||
          stringValue(productoDoc?.code);

        const unidad =
          stringValue(item.unidad) ||
          stringValue(productoDoc?.unidad);

        const cantidad =
          positiveNumber(item.cantidad);

        /*
         * Datos históricos congelados.
         */
        const ventas =
          positiveNumber(
            item.precioFinal ??
              item.subtotal,
          );

        const costo =
          positiveNumber(
            item.costoTotal ??
              item.costoPcc,
          );

        const utilidad =
          numberValue(
            item.utilidad ??
              (ventas - costo),
          );

        const productorId =
          stringValue(item.IdProductor) ||
          stringValue(productoDoc?.IdProductor);

        const municipioProductorId =
          stringValue(item.IdMunicipalidad) ||
          stringValue(
            productoDoc?.IdMunicipalidad,
          );

        /*
         * La categoría actualmente se obtiene del
         * producto. Si posteriormente se quiere una
         * trazabilidad histórica absoluta de categoría,
         * también debe congelarse en el pedido.
         */
        const categoriaId =
          stringValue(productoDoc?.categoria);

        const categoriaNombre =
          stringValue(
            categoriasMap.get(categoriaId)?.nombre,
          ) || categoriaId;

        const productorNombre =
          stringValue(
            productoresMap.get(productorId)?.nombre,
          ) || productorId;

        /*
         * ==============================================
         * Filtros a nivel de producto
         * ==============================================
         */

        if (
          producto &&
          productoId !== producto
        ) {
          continue;
        }

        if (
          categoria &&
          categoriaId !== categoria
        ) {
          continue;
        }

        if (
          productor &&
          productorId !== productor
        ) {
          continue;
        }

        pedidoCoincide = true;

        pedidoVentas += ventas;
        pedidoCostos += costo;
        pedidoUtilidad += utilidad;
        pedidoProductosVendidos += cantidad;

        if (productorId) {
          productoresPedido.add(productorId);
        }

        /*
         * ==============================================
         * Estadísticas por producto
         * ==============================================
         */

        const existing =
          productosStats.get(productoId);

        if (existing) {
          existing.cantidadVendida += cantidad;
          existing.ventas += ventas;
          existing.costo += costo;
          existing.utilidad += utilidad;
        } else {
          productosStats.set(productoId, {
            id: productoId,
            code,
            nombre,
            categoria: categoriaNombre,
            unidad,
            IdProductor: productorId,
            productor: productorNombre,
            IdMunicipalidad:
              municipioProductorId,
            municipalidad:
              stringValue(
                municipalidadesMap.get(
                  municipioProductorId,
                )?.nombre,
              ) || municipioProductorId,
            cantidadVendida: cantidad,
            ventas,
            costo,
            utilidad,
            stock: positiveNumber(
              productoDoc?.stock,
            ),
          });
        }

        /*
         * ==============================================
         * Estadísticas por productor
         * ==============================================
         */

        if (productorId) {
          const current =
            productoresStats.get(productorId);

          if (current) {
            current.ventas += ventas;
            current.costo += costo;
            current.utilidad += utilidad;
            current.productosVendidos += cantidad;
          } else {
            productoresStats.set(productorId, {
              id: productorId,
              nombre: productorNombre,
              ventas,
              costo,
              utilidad,
              productosVendidos: cantidad,
              pedidos: 0,
            });
          }
        }

        /*
         * ==============================================
         * Municipio del productor
         * ==============================================
         */

        if (municipioProductorId) {
          const municipalidad =
            municipalidadesMap.get(
              municipioProductorId,
            );

          const current =
            municipiosProductorStats.get(
              municipioProductorId,
            );

          if (current) {
            current.ventas += ventas;
          } else {
            municipiosProductorStats.set(
              municipioProductorId,
              {
                id: municipioProductorId,
                nombre:
                  stringValue(
                    municipalidad?.nombre,
                  ) || municipioProductorId,
                departamento:
                  stringValue(
                    municipalidad?.departamento,
                  ),
                ventas,
                pedidos: 0,
              },
            );
          }
        }
      }

      /*
       * ================================================
       * El pedido solo cuenta si al menos un item
       * cumple los filtros.
       * ================================================
       */

      if (!pedidoCoincide) {
        continue;
      }

      pedidosEntregados += 1;

      const usuarioId =
        stringValue(pedido.usuarioId);

      if (usuarioId) {
        consumidores.add(usuarioId);
      }

      ventasTotales += pedidoVentas;
      costosTotales += pedidoCostos;
      utilidadTotal += pedidoUtilidad;
      productosVendidos += pedidoProductosVendidos;

      /*
       * ================================================
       * Pedidos por productor
       * ================================================
       */

      for (const productorId of productoresPedido) {
        const current =
          productoresStats.get(productorId);

        if (current) {
          current.pedidos += 1;
        }
      }

      /*
       * ================================================
       * Municipio de entrega
       * ================================================
       */

      if (pedidoMunicipioId) {
        const municipalidad =
          municipalidadesMap.get(
            pedidoMunicipioId,
          );

        const current =
          municipiosEntregaStats.get(
            pedidoMunicipioId,
          );

        if (current) {
          current.ventas += pedidoVentas;
          current.pedidos += 1;
        } else {
          municipiosEntregaStats.set(
            pedidoMunicipioId,
            {
              id: pedidoMunicipioId,
              nombre:
                stringValue(
                  municipalidad?.nombre,
                ) || pedidoMunicipioId,
              departamento:
                stringValue(
                  municipalidad?.departamento,
                ),
              ventas: pedidoVentas,
              pedidos: 1,
            },
          );
        }
      }

      /*
       * ================================================
       * Repartidor
       * ================================================
       */

      if (pedidoRepartidorId) {
        const repartidorInfo =
          repartidoresMap.get(
            pedidoRepartidorId,
          );

        const current =
          repartidoresStats.get(
            pedidoRepartidorId,
          );

        if (current) {
          current.ventasGeneradas +=
            pedidoVentas;

          current.pedidosEntregados += 1;
        } else {
          repartidoresStats.set(
            pedidoRepartidorId,
            {
              id: pedidoRepartidorId,
              nombre:
                repartidorInfo?.nombre ??
                pedidoRepartidorId,
              correo:
                repartidorInfo?.correo ?? "",
              ventasGeneradas: pedidoVentas,
              pedidosEntregados: 1,
            },
          );
        }
      }
    }

    /*
     * ================================================
     * Catálogo actual
     *
     * Estos valores son actuales y NO se utilizan
     * para calcular ventas históricas.
     * ================================================
     */

    const catalogoProductos =
      productosSnapshot.docs.map((doc) => {
        const product =
          doc.data() as ProductoDocumento;

        const productorId =
          stringValue(product.IdProductor);

        const municipioId =
          stringValue(product.IdMunicipalidad);

        const categoriaId =
          stringValue(product.categoria);

        return {
          id: doc.id,
          code: stringValue(product.code),
          nombre: stringValue(product.nombre),

          categoria:
            stringValue(
              categoriasMap.get(
                categoriaId,
              )?.nombre,
            ) || categoriaId,

          IdProductor: productorId,

          productor:
            stringValue(
              productoresMap.get(
                productorId,
              )?.nombre,
            ) || productorId,

          IdMunicipalidad: municipioId,

          municipalidad:
            stringValue(
              municipalidadesMap.get(
                municipioId,
              )?.nombre,
            ) || municipioId,

          precio:
            numberValue(product.precio),

          precioVenta:
            numberValue(product.precioVenta),

          costoPcc:
            numberValue(product.costoPcc),

          stock:
            numberValue(product.stock),

          activo:
            product.activo === true,

          unidad:
            stringValue(product.unidad),
        };
      });

    /*
     * ================================================
     * Catálogos para filtros
     * ================================================
     */

    const catalogoProductores =
      productoresSnapshot.docs.map((doc) => {
        const data =
          doc.data() as ProductorDocumento;

        return {
          id: doc.id,
          nombre:
            stringValue(data.nombre) || doc.id,
          activo: data.activo === true,
        };
      });

    const catalogoMunicipalidades =
      municipalidadesSnapshot.docs.map((doc) => {
        const data =
          doc.data() as MunicipalidadDocumento;

        return {
          id: doc.id,
          nombre:
            stringValue(data.nombre) || doc.id,
          departamento:
            stringValue(data.departamento),
          activo: data.activo === true,
        };
      });

    const catalogoCategorias =
      categoriasSnapshot.docs.map((doc) => {
        const data =
          doc.data() as CategoriaDocumento;

        return {
          id: doc.id,
          nombre:
            stringValue(data.nombre) || doc.id,
          activo: data.activo === true,
        };
      });

    /*
     * ================================================
     * Resultados
     * ================================================
     */

    const productos = [
      ...productosStats.values(),
    ].sort(
      (a, b) => b.ventas - a.ventas,
    );

    const productores = [
      ...productoresStats.values(),
    ].sort(
      (a, b) => b.ventas - a.ventas,
    );

    const municipiosProductores = [
      ...municipiosProductorStats.values(),
    ].sort(
      (a, b) => b.ventas - a.ventas,
    );

    const municipiosEntrega = [
      ...municipiosEntregaStats.values(),
    ].sort(
      (a, b) => b.ventas - a.ventas,
    );

    const repartidores = [
      ...repartidoresStats.values(),
    ].sort(
      (a, b) =>
        b.ventasGeneradas -
        a.ventasGeneradas,
    );

    const margen =
      ventasTotales > 0
        ? (utilidadTotal / ventasTotales) * 100
        : 0;

    const stockActual =
      catalogoProductos.reduce(
        (total, product) =>
          total + product.stock,
        0,
      );

    const productosActivos =
      catalogoProductos.filter(
        (product) => product.activo,
      ).length;

    return NextResponse.json({
      success: true,

      filtros: {
        categoria,
        producto,
        productor,
        municipio,
        repartidor,
        desde: desdeValue,
        hasta: hastaValue,
      },

      resumen: {
        ventasTotales,
        costosTotales,
        utilidadTotal,
        margen,
        pedidosEntregados,
        productosVendidos,
        consumidores: consumidores.size,
        productosActivos,
        stockActual,
      },

      productos,

      productores,

      municipios: {
        productores:
          municipiosProductores,
        entrega:
          municipiosEntrega,
      },

      repartidores,

      finanzas: {
        ventas: ventasTotales,
        costos: costosTotales,
        utilidad: utilidadTotal,
        margen,
      },

      catalogos: {
        productos: catalogoProductos,
        productores: catalogoProductores,
        municipalidades:
          catalogoMunicipalidades,
        categorias: catalogoCategorias,
      },
    });
  } catch (error) {
    console.error(
      "Error obteniendo estadísticas del dashboard:",
      error,
    );

    return errorResponse(
      "No fue posible obtener las estadísticas.",
      500,
    );
  }
}