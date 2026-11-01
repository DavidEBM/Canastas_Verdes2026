import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import * as XLSX from "xlsx";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { paymentLabel } from "@/lib/pagos";

export const runtime = "nodejs";

type AnyRecord = Record<string, unknown>;

type CatalogProduct = AnyRecord & {
  id: string;
};

type PedidoLine = AnyRecord;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function positive(value: unknown): number {
  return Math.max(0, number(value));
}

function dateValue(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function parseDate(value: string, endExclusive = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00-05:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endExclusive) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

function dateForExcel(value: unknown): string {
  const date = dateValue(value);
  return date ? date.toISOString() : "";
}

function catalogName(value: AnyRecord | undefined): string {
  return text(value?.Nombre ?? value?.nombre ?? value?.name);
}

function safeText(value: unknown): string {
  const valueText = text(value);
  if (/^[=+\-@]/.test(valueText)) {
    return `'${valueText}`;
  }
  return valueText;
}

function withExcelSafety(row: AnyRecord): AnyRecord {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "string" ? safeText(value) : value,
    ]),
  );
}

function componentRows(value: unknown): AnyRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is AnyRecord =>
      Boolean(item) && typeof item === "object",
  );
}

function isAdditional(line: PedidoLine): boolean {
  return (
    line.adicional === true ||
    line.esAdicional === true ||
    text(line.tipo).toLowerCase() === "adicional" ||
    text(line.origen).toLowerCase() === "adicional" ||
    text(line.tipoLinea).toLowerCase() === "adicional"
  );
}

function setSheetFormatting(
  sheet: XLSX.WorkSheet,
  headers: string[],
  widths: number[],
  numericColumns: string[] = [],
) {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  sheet["!autofilter"] = {
    ref: `A1:${String.fromCharCode(64 + headers.length)}1`,
  };

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (const column of numericColumns) {
    const index = headers.indexOf(column);
    if (index < 0) continue;
    for (let row = 1; row <= range.e.r; row += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ c: index, r: row })];
      if (cell && typeof cell.v === "number") {
        cell.z = "#,##0.00";
      }
    }
  }
}

function addSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: AnyRecord[],
  headers: string[],
  widths: number[],
  numericColumns: string[] = [],
) {
  const safeRows = rows.map(withExcelSafety);
  const sheet = XLSX.utils.json_to_sheet(safeRows, {
    header: headers,
  });
  setSheetFormatting(sheet, headers, widths, numericColumns);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const params = new URL(request.url).searchParams;
    const desdeValue = text(params.get("desde"));
    const hastaValue = text(params.get("hasta"));

    if (!desdeValue || !hastaValue) {
      return NextResponse.json(
        {
          success: false,
          message: "Selecciona una fecha inicial y una fecha final.",
        },
        { status: 400 },
      );
    }

    const desde = parseDate(desdeValue);
    const hastaExclusive = parseDate(hastaValue, true);

    if (!desde || !hastaExclusive) {
      return NextResponse.json(
        {
          success: false,
          message: "El rango de fechas no es válido.",
        },
        { status: 400 },
      );
    }

    if (desde.getTime() >= hastaExclusive.getTime()) {
      return NextResponse.json(
        {
          success: false,
          message: "La fecha inicial no puede ser posterior a la fecha final.",
        },
        { status: 400 },
      );
    }

    const [productsSnapshot, producersSnapshot, municipalitiesSnapshot, categoriesSnapshot, usersSnapshot] =
      await Promise.all([
        adminDb.collection("productos").get(),
        adminDb.collection("productores").get(),
        adminDb.collection("municipalidades").get(),
        adminDb.collection("categorias").get(),
        adminDb.collection("usuarios").get(),
      ]);

    const pedidosQuery = adminDb
      .collection("pedidos")
      .where("fechaCreacion", ">=", Timestamp.fromDate(desde))
      .where("fechaCreacion", "<", Timestamp.fromDate(hastaExclusive));
    const pedidosSnapshot = await pedidosQuery.get();

    const products = new Map<string, CatalogProduct>();
    const producers = new Map<string, AnyRecord>();
    const municipalities = new Map<string, AnyRecord>();
    const categories = new Map<string, AnyRecord>();
    const users = new Map<string, AnyRecord>();

    for (const doc of productsSnapshot.docs) {
      products.set(doc.id, { id: doc.id, ...doc.data() });
    }
    for (const doc of producersSnapshot.docs) producers.set(doc.id, doc.data());
    for (const doc of municipalitiesSnapshot.docs) municipalities.set(doc.id, doc.data());
    for (const doc of categoriesSnapshot.docs) categories.set(doc.id, doc.data());
    for (const doc of usersSnapshot.docs) users.set(doc.id, doc.data());

    const municipalityName = (id: unknown) => {
      const key = text(id);
      const data = municipalities.get(key);
      return catalogName(data) || key;
    };
    const producerName = (id: unknown) => {
      const key = text(id);
      const data = producers.get(key);
      return catalogName(data) || key;
    };
    const categoryName = (id: unknown) => {
      const key = text(id);
      const data = categories.get(key);
      return catalogName(data) || key;
    };
    const userName = (id: unknown) => {
      const key = text(id);
      const data = users.get(key);
      return (
        text(data?.NombreCompleto) ||
        `${text(data?.Nombres)} ${text(data?.Apellidos)}`.trim() ||
        text(data?.Correo) ||
        key
      );
    };

    const catalogProductRows = [...products.values()].map((product) => ({
      "Código": text(product.code) || product.id,
      "Nombre": text(product.nombre),
      "Descripción": text(product.descripcion),
      "Categoría": categoryName(product.categoria),
      "Municipio": municipalityName(product.IdMunicipalidad),
      "Vereda": text(product.IdVereda ?? product.vereda),
      "Productor": producerName(product.IdProductor),
      "Presentación": text(product.presentacionNombre),
      "Cantidad presentación": number(product.presentacionCantidad),
      "Unidad": text(product.unidad),
      "Existencias actuales": number(product.stock),
      "Precio de venta": number(product.precioVenta ?? product.precio),
      "Costo PCC": number(product.costoPcc),
      "Estado": product.activo === true ? "Activo" : "Inactivo",
      "Fecha actualización": dateForExcel(product.ultimaActualizacion),
    }));

    const basketRows: AnyRecord[] = [];
    for (const product of products.values()) {
      if (!categoryName(product.categoria).toLowerCase().includes("canasta")) {
        continue;
      }

      const components = componentRows(product.componentes);
      if (components.length === 0) {
        basketRows.push({
          "Código canasta": text(product.code) || product.id,
          "Nombre canasta": text(product.nombre),
          "Descripción": text(product.descripcion),
          "Estado": product.activo === true ? "Activo" : "Inactivo",
          "Código producto": "",
          "Nombre producto": "",
          "Municipio producto": "",
          "Productor": "",
          "Presentación": text(product.presentacionNombre),
          "Cantidad incluida": 0,
          "Precio unitario producto": 0,
          "Precio venta canasta": number(product.precioVenta ?? product.precio),
          "Total componentes": 0,
        });
        continue;
      }

      for (const component of components) {
        const componentProduct = products.get(text(component.productoId));
        basketRows.push({
          "Código canasta": text(product.code) || product.id,
          "Nombre canasta": text(product.nombre),
          "Descripción": text(product.descripcion),
          "Estado": product.activo === true ? "Activo" : "Inactivo",
          "Código producto": text(componentProduct?.code) || text(component.productoId),
          "Nombre producto": text(componentProduct?.nombre),
          "Municipio producto": municipalityName(componentProduct?.IdMunicipalidad),
          "Productor": producerName(componentProduct?.IdProductor),
          "Presentación": text(componentProduct?.presentacionNombre),
          "Cantidad incluida": number(component.cantidad),
          "Precio unitario producto": number(componentProduct?.precioVenta ?? componentProduct?.precio),
          "Precio venta canasta": number(product.precioVenta ?? product.precio),
          "Total componentes": number(component.cantidad) * number(componentProduct?.precioVenta ?? componentProduct?.precio),
        });
      }
    }

    const producerPeriod = new Map<string, { cantidad: number; ventas: number; pedidos: Set<string> }>();
    const ptorGroups = new Map<string, AnyRecord>();
    const reporteCanastas: AnyRecord[] = [];

    for (const pedidoDoc of pedidosSnapshot.docs) {
      const pedido = pedidoDoc.data() as AnyRecord;
      const lines = Array.isArray(pedido.productos)
        ? (pedido.productos as PedidoLine[])
        : [];
      const originalLines = lines.filter((line) => !isAdditional(line));
      const additionalLines = lines.filter(isAdditional);

      const clientId = text(pedido.usuarioId);
      const clientName = userName(clientId);
      const tipoEntrega = text(pedido.tipoEntrega) || "domicilio";
      const medio = paymentLabel(pedido.medioPago ?? (pedido.pago as AnyRecord | undefined)?.medioPago);
      const originalTotal = originalLines.reduce(
        (sum, line) => sum + number(line.precioFinal ?? line.subtotal ?? number(line.precioUnitario) * number(line.cantidad)),
        0,
      );
      const additionalTotal = additionalLines.reduce(
        (sum, line) => sum + number(line.precioFinal ?? line.subtotal ?? number(line.precioUnitario) * number(line.cantidad)),
        0,
      );
      const reportLineCount = Math.max(originalLines.length, additionalLines.length, 1);

      for (let index = 0; index < reportLineCount; index += 1) {
        const original = originalLines[index];
        const additional = additionalLines[index];
        const originalTotalCell = index === 0 ? originalTotal : "";
        const additionalTotalCell = index === 0 ? additionalTotal : "";
        const combinedTotalCell = index === 0 ? originalTotal + additionalTotal : "";

        reporteCanastas.push({
          "No de cliente": clientId,
          "Nombre Cliente o usuario": clientName,
          "Código del producto que pidió": text(original?.code ?? original?.productoId),
          "Nombre del producto": text(original?.nombre),
          "Municipio de donde viene el producto solicitado": municipalityName(original?.IdMunicipalidad),
          "Presentación del producto": text(original?.presentacionNombre ?? original?.unidad),
          "Valor x unidad para el producto": original ? number(original.precioUnitario) : 0,
          "Cantidad del producto": original ? number(original.cantidad) : 0,
          "Tipo de entrega": tipoEntrega,
          "Valor a pagar x producto": original ? number(original.precioFinal ?? original.subtotal ?? number(original.precioUnitario) * number(original.cantidad)) : 0,
          "Valor total": originalTotalCell,
          "Código adicional": text(additional?.code ?? additional?.productoId),
          "Nombre producto adicional": text(additional?.nombre),
          "Cantidad del producto adicional": additional ? number(additional.cantidad) : 0,
          "Precio del producto adicional": additional ? number(additional.precioUnitario) : 0,
          "Valor total solo productos adicionales": additionalTotalCell,
          "Valor total a pagar + adicionales": combinedTotalCell,
          "Medio de pago": medio === "Sin registrar" ? "" : medio,
        });
      }

      if (text(pedido.estado).toLowerCase() !== "entregado") {
        continue;
      }

      for (const line of lines) {
        const productId = text(line.productoId);
        const product = products.get(productId);
        const quantity = positive(line.cantidad);
        const delivered = positive(line.cantidadEntregada ?? line.cantidadEntregado ?? quantity);
        const value = number(line.precioFinal ?? line.subtotal ?? number(line.precioUnitario) * quantity);
        const unitPrice = number(line.precioUnitario ?? product?.precioVenta ?? product?.precio);
        const cost = number(line.costoPccUnitario ?? product?.costoPcc);
        const municipality = municipalityName(line.IdMunicipalidad ?? product?.IdMunicipalidad);
        const producer = producerName(line.IdProductor ?? product?.IdProductor);
        const presentation = text(line.presentacionNombre ?? line.unidad ?? product?.presentacionNombre ?? product?.unidad);
        const key = [text(line.code ?? product?.code ?? productId), text(line.nombre ?? product?.nombre), municipality, producer, presentation, unitPrice, cost].join("|");
        const current = ptorGroups.get(key);
        if (current) {
          current["Cantidad"] = number(current["Cantidad"]) + quantity;
          current["Cantidad entregada"] = number(current["Cantidad entregada"]) + delivered;
          current["Total"] = number(current["Total"]) + value;
        } else {
          ptorGroups.set(key, {
            "Código del producto": text(line.code ?? product?.code ?? productId),
            "Nombre del producto": text(line.nombre ?? product?.nombre),
            Municipio: municipality,
            Productor: producer,
            Presentación: presentation,
            Cantidad: quantity,
            "Costos PCC": cost,
            "Valor de venta": unitPrice,
            "Cantidad entregada": delivered,
            Total: value,
          });
        }

        const producerId = text(line.IdProductor ?? product?.IdProductor);
        const producerCurrent = producerPeriod.get(producerId) ?? {
          cantidad: 0,
          ventas: 0,
          pedidos: new Set<string>(),
        };
        producerCurrent.cantidad += delivered;
        producerCurrent.ventas += value;
        producerCurrent.pedidos.add(pedidoDoc.id);
        producerPeriod.set(producerId, producerCurrent);
      }
    }

    const ptorRows: AnyRecord[] = [];
    const groupedPtor = new Map<string, AnyRecord[]>();
    for (const row of ptorGroups.values()) {
      const key = text(row.Municipio) || "Sin municipio";
      const group = groupedPtor.get(key) ?? [];
      group.push(row);
      groupedPtor.set(key, group);
    }
    for (const municipality of [...groupedPtor.keys()].sort((a, b) => a.localeCompare(b, "es"))) {
      const group = groupedPtor.get(municipality) ?? [];
      let subtotal = 0;
      for (const row of group.sort((a, b) => text(a["Nombre del producto"]).localeCompare(text(b["Nombre del producto"]), "es"))) {
        ptorRows.push(row);
        subtotal += number(row.Total);
      }
      ptorRows.push({
        "Código del producto": "TOTAL MUNICIPIO",
        "Nombre del producto": municipality,
        Municipio: municipality,
        Total: subtotal,
      });
    }

    const producerRows = [...producers.entries()].map(([id, producer]) => {
      const period = producerPeriod.get(id);
      return {
        "ID productor": id,
        Productor: catalogName(producer) || id,
        Descripción: text(producer.descripcion),
        Estado: producer.activo === false ? "Inactivo" : "Activo",
        "Cantidad entregada periodo": period?.cantidad ?? 0,
        "Ventas periodo": period?.ventas ?? 0,
        "Pedidos periodo": period?.pedidos.size ?? 0,
      };
    });

    const workbook = XLSX.utils.book_new();
    addSheet(workbook, "Canastas", basketRows, [
      "Código canasta", "Nombre canasta", "Descripción", "Estado",
      "Código producto", "Nombre producto", "Municipio producto", "Productor",
      "Presentación", "Cantidad incluida", "Precio unitario producto",
      "Precio venta canasta", "Total componentes",
    ], [18, 25, 32, 12, 18, 25, 22, 24, 20, 16, 20, 20, 18], [
      "Cantidad incluida", "Precio unitario producto", "Precio venta canasta", "Total componentes",
    ]);
    addSheet(workbook, "Productos", catalogProductRows, [
      "Código", "Nombre", "Descripción", "Categoría", "Municipio", "Vereda", "Productor",
      "Presentación", "Cantidad presentación", "Unidad", "Existencias actuales", "Precio de venta",
      "Costo PCC", "Estado", "Fecha actualización",
    ], [18, 25, 32, 18, 22, 20, 24, 20, 18, 14, 18, 18, 16, 12, 24], [
      "Cantidad presentación", "Existencias actuales", "Precio de venta", "Costo PCC",
    ]);
    addSheet(workbook, "Reporte_Ptor", ptorRows, [
      "Código del producto", "Nombre del producto", "Municipio", "Productor", "Presentación",
      "Cantidad", "Costos PCC", "Valor de venta", "Cantidad entregada", "Total",
    ], [22, 28, 22, 24, 20, 14, 16, 18, 20, 18], [
      "Cantidad", "Costos PCC", "Valor de venta", "Cantidad entregada", "Total",
    ]);
    addSheet(workbook, "Reporte_Canastas", reporteCanastas, [
      "No de cliente", "Nombre Cliente o usuario", "Código del producto que pidió", "Nombre del producto",
      "Municipio de donde viene el producto solicitado", "Presentación del producto", "Valor x unidad para el producto",
      "Cantidad del producto", "Tipo de entrega", "Valor a pagar x producto", "Valor total", "Código adicional",
      "Nombre producto adicional", "Cantidad del producto adicional", "Precio del producto adicional",
      "Valor total solo productos adicionales", "Valor total a pagar + adicionales", "Medio de pago",
    ], [22, 28, 22, 28, 34, 22, 20, 18, 16, 20, 18, 18, 28, 24, 20, 28, 28, 18], [
      "Valor x unidad para el producto", "Cantidad del producto", "Valor a pagar x producto", "Valor total",
      "Cantidad del producto adicional", "Precio del producto adicional", "Valor total solo productos adicionales",
      "Valor total a pagar + adicionales",
    ]);
    addSheet(workbook, "Productores", producerRows, [
      "ID productor", "Productor", "Descripción", "Estado", "Cantidad entregada periodo", "Ventas periodo", "Pedidos periodo",
    ], [20, 28, 36, 14, 24, 20, 18], [
      "Cantidad entregada periodo", "Ventas periodo", "Pedidos periodo",
    ]);

    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    }) as Buffer;

    const fileName = `consolidado-canastas-verdes-${desdeValue}-${hastaValue}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exportando consolidado de estadísticas:", error);
    if (error instanceof Error && error.message === "NO_AUTH") {
      return NextResponse.json(
        { success: false, message: "Debes iniciar sesión." },
        { status: 401 },
      );
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, message: "No tienes permisos para exportar estadísticas." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { success: false, message: "No fue posible generar el archivo Excel." },
      { status: 500 },
    );
  }
}
