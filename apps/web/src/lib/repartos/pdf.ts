import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
} from "pdf-lib";

import QRCode from "qrcode";

interface ProductoPedido {
  productoId: string;
  code: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  unidad: string;
}

interface Cliente {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  direccion: string;
}

interface Repartidor {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
}

interface Municipalidad {
  nombre: string;
}

interface PuntoRecogida {
  id?: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  horario?: string;
  googleMapsUrl?: string;
  IdMunicipalidad?: string;
}

interface Costos {
  subtotalProductos: number;
  entrega: number;
  logistica: number;
  almacenamiento: number;
  total: number;
}

interface Firma {
  metodo?: "manuscrita" | "texto";
  valor?: string | null;
  recibidoPor?: string | null;
  fechaRecibido?: unknown;
}

interface Pedido {
  id: string;
  productos: ProductoPedido[];
  subtotal: number;
  total: number;
  estado: string;
  IdMunicipalidad: string;
  direccionEntrega?: string | null;
  telefonoEntrega?: string | null;
  fechaCreacion?: unknown;
  fechaRecibido?: unknown;
  completadoEn?: unknown;
  tipoEntrega?: "domicilio" | "recogida";
  IdPuntoRecogida?: string | null;
  puntoRecogida?: PuntoRecogida | null;
  ventaCompletada?: boolean;
  repartidorId?: string | null;
}

export interface RepartoPDFData {
  id: string;
  pedido: Pedido;
  cliente: Cliente;
  repartidor: Repartidor | null;
  municipalidad: Municipalidad;
  puntoRecogida?: PuntoRecogida | null;
  costos: Costos;

  /**
   * Nombre principal utilizado por el PDF.
   */
  tipoEntrega?: "domicilio" | "recogida";

  /**
   * Compatibilidad con rutas que todavía envían
   * modalidadEntrega.
   */
  modalidadEntrega?: "domicilio" | "recogida";

  firma: Firma | null;
  ventaCompletada?: boolean;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const MARGIN_X = 42;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 42;

const PRIMARY = rgb(
  31 / 255,
  107 / 255,
  58 / 255,
);

const DARK = rgb(
  23 / 255,
  53 / 255,
  31 / 255,
);

const LIGHT_GREEN = rgb(
  241 / 255,
  248 / 255,
  242 / 255,
);

const BORDER = rgb(
  210 / 255,
  225 / 255,
  214 / 255,
);

const GRAY = rgb(
  100 / 255,
  110 / 255,
  105 / 255,
);

const WHITE = rgb(1, 1, 1);

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dateValue(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value
  ) {
    const seconds = Number(
      (
        value as {
          seconds: number;
        }
      ).seconds,
    );

    if (!Number.isNaN(seconds)) {
      return new Date(seconds * 1000);
    }
  }

  const date = new Date(
    value as string | number | Date,
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDate(value: unknown) {
  const date = dateValue(value);

  if (!date) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function fullName(
  person:
    | Cliente
    | Repartidor
    | null
    | undefined,
) {
  if (!person) {
    return "No asignado";
  }

  return `${cleanText(person.nombres)} ${cleanText(
    person.apellidos,
  )}`
    .replace(/\s+/g, " ")
    .trim() || "Sin nombre";
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const clean = cleanText(text);

  if (!clean) {
    return [""];
  }

  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current
      ? `${current} ${word}`
      : word;

    if (
      font.widthOfTextAtSize(
        candidate,
        size,
      ) <= maxWidth
    ) {
      current = candidate;
      continue;
    }

    if (!current) {
      let partial = "";

      for (const char of word) {
        const candidatePart =
          partial + char;

        if (
          font.widthOfTextAtSize(
            candidatePart,
            size,
          ) <= maxWidth
        ) {
          partial = candidatePart;
        } else {
          if (partial) {
            lines.push(partial);
          }

          partial = char;
        }
      }

      current = partial;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = DARK,
) {
  page.drawText(cleanText(text), {
    x,
    y,
    size,
    font,
    color,
  });
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = DARK,
) {
  const clean = cleanText(text);

  const width =
    font.widthOfTextAtSize(
      clean,
      size,
    );

  page.drawText(clean, {
    x: rightX - width,
    y,
    size,
    font,
    color,
  });
}

function drawBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color = LIGHT_GREEN,
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color,
    borderColor: BORDER,
    borderWidth: 0.7,
  });
}

function drawLine(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 0.7,
    color: BORDER,
  });
}

function addPage(
  pdf: PDFDocument,
): PDFPage {
  const page = pdf.addPage([
    PAGE_WIDTH,
    PAGE_HEIGHT,
  ]);

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 7,
    width: PAGE_WIDTH,
    height: 7,
    color: PRIMARY,
  });

  return page;
}

function drawHeader(
  page: PDFPage,
  data: RepartoPDFData,
  bold: PDFFont,
  regular: PDFFont,
) {
  drawText(
    page,
    "CANASTAS VERDES",
    MARGIN_X,
    PAGE_HEIGHT - 62,
    bold,
    20,
    PRIMARY,
  );

  drawText(
    page,
    "Comprobante de pedido y entrega",
    MARGIN_X,
    PAGE_HEIGHT - 80,
    regular,
    9,
    GRAY,
  );

  drawText(
    page,
    `Pedido #${data.id}`,
    PAGE_WIDTH - MARGIN_X - 150,
    PAGE_HEIGHT - 62,
    bold,
    11,
    DARK,
  );

  drawText(
    page,
    `Estado: ${cleanText(
      data.pedido.estado,
    )}`,
    PAGE_WIDTH - MARGIN_X - 150,
    PAGE_HEIGHT - 80,
    regular,
    9,
    GRAY,
  );

  drawLine(
    page,
    MARGIN_X,
    PAGE_HEIGHT - 94,
    PAGE_WIDTH - MARGIN_X,
    PAGE_HEIGHT - 94,
  );
}

function drawCompletedStamp(
  page: PDFPage,
  bold: PDFFont,
) {
  const stampWidth = 190;
  const stampHeight = 48;

  const x =
    PAGE_WIDTH -
    MARGIN_X -
    stampWidth;

  const y =
    PAGE_HEIGHT -
    145;

  page.drawRectangle({
    x,
    y,
    width: stampWidth,
    height: stampHeight,
    color: LIGHT_GREEN,
    borderColor: PRIMARY,
    borderWidth: 2,
  });

  drawText(
    page,
    "✓ VENTA COMPLETADA",
    x + 14,
    y + 27,
    bold,
    12,
    PRIMARY,
  );

  drawText(
    page,
    "CANASTAS VERDES",
    x + 14,
    y + 11,
    bold,
    8,
    DARK,
  );
}

function drawFooter(
  page: PDFPage,
  pageNumber: number,
  totalPages: number,
  regular: PDFFont,
) {
  drawLine(
    page,
    MARGIN_X,
    35,
    PAGE_WIDTH - MARGIN_X,
    35,
  );

  drawText(
    page,
    "Canastas Verdes",
    MARGIN_X,
    21,
    regular,
    7,
    GRAY,
  );

  drawRightText(
    page,
    `Página ${pageNumber} de ${totalPages}`,
    PAGE_WIDTH - MARGIN_X,
    21,
    regular,
    7,
    GRAY,
  );
}

function drawSectionTitle(
  page: PDFPage,
  title: string,
  y: number,
  bold: PDFFont,
) {
  drawText(
    page,
    title,
    MARGIN_X,
    y,
    bold,
    11,
    PRIMARY,
  );

  return y - 17;
}

function drawInfoBox(
  page: PDFPage,
  title: string,
  lines: string[],
  x: number,
  y: number,
  width: number,
  bold: PDFFont,
  regular: PDFFont,
) {
  const lineHeight = 13;
  const paddingX = 10;

  const contentWidth =
    width - paddingX * 2;

  const wrappedLines =
    lines.flatMap((line) =>
      wrapText(
        line,
        regular,
        8,
        contentWidth,
      ),
    );

  const height =
    30 +
    wrappedLines.length *
      lineHeight;

  drawBox(
    page,
    x,
    y - height,
    width,
    height,
  );

  drawText(
    page,
    title,
    x + paddingX,
    y - 17,
    bold,
    9,
    PRIMARY,
  );

  let lineY = y - 33;

  for (const line of wrappedLines) {
    drawText(
      page,
      line,
      x + paddingX,
      lineY,
      regular,
      8,
      DARK,
    );

    lineY -= lineHeight;
  }

  return height;
}

async function addSignature(
  pdf: PDFDocument,
  page: PDFPage,
  firma: Firma,
  x: number,
  y: number,
  width: number,
  height: number,
  regular: PDFFont,
  bold: PDFFont,
) {
  if (
    !firma?.metodo ||
    !firma.valor
  ) {
    return;
  }

  if (
    firma.metodo === "manuscrita" &&
    firma.valor.startsWith(
      "data:image/",
    )
  ) {
    try {
      const base64 =
        firma.valor.split(",")[1];

      if (!base64) {
        return;
      }

      const bytes =
        Uint8Array.from(
          Buffer.from(
            base64,
            "base64",
          ),
        );

      const image =
        firma.valor.includes(
          "image/jpeg",
        )
          ? await pdf.embedJpg(bytes)
          : await pdf.embedPng(bytes);

      const scale = Math.min(
        width / image.width,
        height / image.height,
      );

      const imageWidth =
        image.width * scale;

      const imageHeight =
        image.height * scale;

      page.drawImage(image, {
        x:
          x +
          (width - imageWidth) /
            2,

        y:
          y +
          (height - imageHeight) /
            2,

        width: imageWidth,
        height: imageHeight,
      });
    } catch {
      drawText(
        page,
        "Firma manuscrita registrada",
        x + 10,
        y + height / 2,
        regular,
        8,
        GRAY,
      );
    }

    return;
  }

  if (firma.metodo === "texto") {
    const lines = wrapText(
      firma.valor,
      regular,
      10,
      width - 20,
    );

    let textY =
      y + height - 25;

    for (const line of lines.slice(
      0,
      5,
    )) {
      drawText(
        page,
        line,
        x + 10,
        textY,
        regular,
        10,
        DARK,
      );

      textY -= 15;
    }

    drawText(
      page,
      "Confirmación textual",
      x + 10,
      y + 10,
      bold,
      7,
      PRIMARY,
    );
  }
}

export async function generarPDFReparto(
  data: RepartoPDFData,
  options?: {
    baseUrl?: string;
  },
) {
  const pdf =
    await PDFDocument.create();

  const regular =
    await pdf.embedFont(
      StandardFonts.Helvetica,
    );

  const bold =
    await pdf.embedFont(
      StandardFonts.HelveticaBold,
    );

  /*
   * =====================================================
   * MODALIDAD DE ENTREGA
   * =====================================================
   */

  const tipoEntrega =
    data.tipoEntrega ??
    data.modalidadEntrega ??
    data.pedido.tipoEntrega ??
    "domicilio";

  /*
   * =====================================================
   * QR
   * =====================================================
   */

  const baseUrl =
    options?.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const verificationUrl =
    `${baseUrl.replace(
      /\/$/,
      "",
    )}/recibo/${encodeURIComponent(
      data.id,
    )}`;

  const qrDataUrl =
    await QRCode.toDataURL(
      verificationUrl,
      {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 300,
      },
    );

  const qrBase64 =
    qrDataUrl.split(",")[1];

  const qrBytes =
    Uint8Array.from(
      Buffer.from(
        qrBase64,
        "base64",
      ),
    );

  const qrImage =
    await pdf.embedPng(qrBytes);

  /*
   * =====================================================
   * PRIMERA PÁGINA
   * =====================================================
   */

  let page = addPage(pdf);

  drawHeader(
    page,
    data,
    bold,
    regular,
  );

  const ventaCompletada =
    data.ventaCompletada === true ||
    data.pedido.ventaCompletada ===
      true ||
    data.pedido.estado ===
      "entregado";

  if (ventaCompletada) {
    drawCompletedStamp(
      page,
      bold,
    );
  }

  let y =
    PAGE_HEIGHT - 120;

  /*
   * =====================================================
   * CLIENTE / ENTREGA
   * =====================================================
   */

  const columnGap = 12;

  const columnWidth =
    (
      PAGE_WIDTH -
      MARGIN_X * 2 -
      columnGap
    ) / 2;

  const clienteLines = [
    `Nombre: ${fullName(
      data.cliente,
    )}`,

    `Correo: ${
      cleanText(
        data.cliente?.correo,
      ) || "No registrado"
    }`,

    `Teléfono: ${
      cleanText(
        data.cliente?.telefono,
      ) || "No registrado"
    }`,
  ];

  if (
    tipoEntrega ===
    "domicilio"
  ) {
    clienteLines.push(
      `Dirección: ${
        cleanText(
          data.pedido
            .direccionEntrega,
        ) ||
        cleanText(
          data.cliente?.direccion,
        ) ||
        "No registrada"
      }`,
    );
  }

  const entregaLines = [
    `Municipio: ${
      cleanText(
        data.municipalidad?.nombre,
      ) || "No registrado"
    }`,

    `Tipo de entrega: ${
      tipoEntrega ===
      "recogida"
        ? "Recogida"
        : "Domicilio"
    }`,

    `Creado: ${formatDate(
      data.pedido.fechaCreacion,
    )}`,
  ];

  if (
    tipoEntrega ===
    "domicilio"
  ) {
    entregaLines.push(
      `Dirección: ${
        cleanText(
          data.pedido
            .direccionEntrega,
        ) || "No registrada"
      }`,
    );
  }

  if (
    tipoEntrega ===
    "recogida"
  ) {
    entregaLines.push(
      `Punto de recogida: ${
        cleanText(
          data.puntoRecogida
            ?.nombre,
        ) ||
        cleanText(
          data.pedido
            .puntoRecogida
            ?.nombre,
        ) ||
        "No especificado"
      }`,
    );

    entregaLines.push(
      `Dirección del punto: ${
        cleanText(
          data.puntoRecogida
            ?.direccion,
        ) ||
        cleanText(
          data.pedido
            .puntoRecogida
            ?.direccion,
        ) ||
        "No registrada"
      }`,
    );

    const horario =
      data.puntoRecogida
        ?.horario ??
      data.pedido
        .puntoRecogida
        ?.horario;

    if (horario) {
      entregaLines.push(
        `Horario: ${cleanText(
          horario,
        )}`,
      );
    }

    const telefonoPunto =
      data.puntoRecogida
        ?.telefono ??
      data.pedido
        .puntoRecogida
        ?.telefono;

    if (telefonoPunto) {
      entregaLines.push(
        `Teléfono del punto: ${cleanText(
          telefonoPunto,
        )}`,
      );
    }
  }

  const clienteHeight =
    drawInfoBox(
      page,
      "CLIENTE",
      clienteLines,
      MARGIN_X,
      y,
      columnWidth,
      bold,
      regular,
    );

  const entregaHeight =
    drawInfoBox(
      page,
      "ENTREGA",
      entregaLines,
      MARGIN_X +
        columnWidth +
        columnGap,
      y,
      columnWidth,
      bold,
      regular,
    );

  y -=
    Math.max(
      clienteHeight,
      entregaHeight,
    ) + 22;

  /*
   * =====================================================
   * REPARTIDOR
   * =====================================================
   */

  if (
    tipoEntrega ===
    "domicilio"
  ) {
    const repartidorLines = [
      `Nombre: ${fullName(
        data.repartidor,
      )}`,

      `Correo: ${
        cleanText(
          data.repartidor?.correo,
        ) || "No registrado"
      }`,

      `Teléfono: ${
        cleanText(
          data.repartidor?.telefono,
        ) || "No registrado"
      }`,
    ];

    const repartidorHeight =
      drawInfoBox(
        page,
        "REPARTIDOR",
        repartidorLines,
        MARGIN_X,
        y,
        PAGE_WIDTH -
          MARGIN_X * 2,
        bold,
        regular,
      );

    y -=
      repartidorHeight + 22;
  }

  /*
   * =====================================================
   * PRODUCTOS
   * =====================================================
   */

  y = drawSectionTitle(
    page,
    "PRODUCTOS DEL PEDIDO",
    y,
    bold,
  );

  const tableX = MARGIN_X;

  const tableWidth =
    PAGE_WIDTH -
    MARGIN_X * 2;

  const colProducto = 195;
  const colCantidad = 50;
  const colUnidad = 105;
  const colPrecio = 80;

  const colSubtotal =
    tableWidth -
    colProducto -
    colCantidad -
    colUnidad -
    colPrecio;

  const headerHeight = 23;

  function drawProductHeader() {
    page.drawRectangle({
      x: tableX,
      y:
        y -
        headerHeight +
        4,
      width: tableWidth,
      height: headerHeight,
      color: PRIMARY,
    });

    const headerY = y - 11;

    drawText(
      page,
      "Producto",
      tableX + 7,
      headerY,
      bold,
      8,
      WHITE,
    );

    drawText(
      page,
      "Cant.",
      tableX +
        colProducto +
        5,
      headerY,
      bold,
      8,
      WHITE,
    );

    drawText(
      page,
      "Unidad",
      tableX +
        colProducto +
        colCantidad +
        5,
      headerY,
      bold,
      8,
      WHITE,
    );

    drawText(
      page,
      "Precio",
      tableX +
        colProducto +
        colCantidad +
        colUnidad +
        5,
      headerY,
      bold,
      8,
      WHITE,
    );

    drawText(
      page,
      "Subtotal",
      tableX +
        colProducto +
        colCantidad +
        colUnidad +
        colPrecio +
        5,
      headerY,
      bold,
      8,
      WHITE,
    );

    y -= 27;
  }

  drawProductHeader();

  for (
    let productIndex = 0;
    productIndex <
    (data.pedido.productos
      ?.length || 0);
    productIndex++
  ) {
    const producto =
      data.pedido.productos[
        productIndex
      ];

    const productName =
      cleanText(
        producto.nombre,
      ) || "Producto";

    const unitText =
      cleanText(
        producto.unidad,
      ) || "Unidad";

    const productLines =
      wrapText(
        productName,
        regular,
        8,
        colProducto - 14,
      );

    const unitLines =
      wrapText(
        unitText,
        regular,
        8,
        colUnidad - 14,
      );

    const contentLines =
      Math.max(
        productLines.length,
        unitLines.length,
        1,
      );

    const rowHeight =
      Math.max(
        22,
        contentLines * 10 + 10,
      );

    if (
      y - rowHeight <
      MARGIN_BOTTOM + 130
    ) {
      page = addPage(pdf);

      drawHeader(
        page,
        data,
        bold,
        regular,
      );

      y =
        PAGE_HEIGHT - 120;

      y = drawSectionTitle(
        page,
        "PRODUCTOS DEL PEDIDO",
        y,
        bold,
      );

      drawProductHeader();
    }

    if (
      productIndex % 2 === 0
    ) {
      page.drawRectangle({
        x: tableX,
        y:
          y -
          rowHeight +
          4,
        width: tableWidth,
        height: rowHeight,
        color: LIGHT_GREEN,
      });
    }

    let productY = y - 10;

    for (
      const line of productLines
    ) {
      drawText(
        page,
        line,
        tableX + 7,
        productY,
        regular,
        8,
      );

      productY -= 10;
    }

    drawText(
      page,
      String(
        producto.cantidad,
      ),
      tableX +
        colProducto +
        5,
      y - 10,
      regular,
      8,
    );

    let unitY = y - 10;

    for (
      const line of unitLines
    ) {
      drawText(
        page,
        line,
        tableX +
          colProducto +
          colCantidad +
          5,
        unitY,
        regular,
        8,
      );

      unitY -= 10;
    }

    const priceRight =
      tableX +
      colProducto +
      colCantidad +
      colUnidad +
      colPrecio -
      7;

    drawRightText(
      page,
      money(
        producto.precioUnitario,
      ),
      priceRight,
      y - 10,
      regular,
      8,
    );

    drawRightText(
      page,
      money(
        producto.subtotal,
      ),
      tableX +
        tableWidth -
        7,
      y - 10,
      regular,
      8,
    );

    y -= rowHeight;

    drawLine(
      page,
      tableX,
      y + 4,
      tableX + tableWidth,
      y + 4,
    );
  }

  /*
   * =====================================================
   * RESUMEN DE COSTOS
   * =====================================================
   */

  if (
    y - 125 <
    MARGIN_BOTTOM
  ) {
    page = addPage(pdf);

    drawHeader(
      page,
      data,
      bold,
      regular,
    );

    y =
      PAGE_HEIGHT - 120;
  }

  y -= 18;

  const costsWidth = 250;

  const costsX =
    PAGE_WIDTH -
    MARGIN_X -
    costsWidth;

  const costsHeight = 115;

  drawBox(
    page,
    costsX,
    y - costsHeight,
    costsWidth,
    costsHeight,
  );

  const costsPadding = 14;

  drawText(
    page,
    "RESUMEN DE COSTOS",
    costsX +
      costsPadding,
    y - 18,
    bold,
    9,
    PRIMARY,
  );

  const costRows = [
    [
      "Productos",
      data.costos.subtotalProductos,
    ],
    [
      "Entrega",
      data.costos.entrega,
    ],
    [
      "Logística",
      data.costos.logistica,
    ],
    [
      "Almacenamiento",
      data.costos.almacenamiento,
    ],
  ] as const;

  let costY = y - 37;

  const costsRight =
    costsX +
    costsWidth -
    costsPadding;

  for (
    const [label, value] of costRows
  ) {
    drawText(
      page,
      label,
      costsX +
        costsPadding,
      costY,
      regular,
      8,
    );

    drawRightText(
      page,
      money(value),
      costsRight,
      costY,
      regular,
      8,
    );

    costY -= 15;
  }

  drawLine(
    page,
    costsX +
      costsPadding,
    costY + 6,
    costsRight,
    costY + 6,
  );

  const totalY =
    costY - 8;

  drawText(
    page,
    "TOTAL",
    costsX +
      costsPadding,
    totalY,
    bold,
    10,
    DARK,
  );

  drawRightText(
    page,
    money(data.costos.total),
    costsRight,
    totalY,
    bold,
    10,
    PRIMARY,
  );

  y -=
    costsHeight + 20;

  /*
   * =====================================================
   * QR
   * =====================================================
   */

  if (
    y - 110 <
    MARGIN_BOTTOM
  ) {
    page = addPage(pdf);

    drawHeader(
      page,
      data,
      bold,
      regular,
    );

    y =
      PAGE_HEIGHT - 120;
  }

  page.drawImage(
    qrImage,
    {
      x: MARGIN_X,
      y: y - 90,
      width: 90,
      height: 90,
    },
  );

  drawText(
    page,
    "Verificación del comprobante",
    MARGIN_X + 105,
    y - 25,
    bold,
    9,
    PRIMARY,
  );

  const qrLines =
    wrapText(
      verificationUrl,
      regular,
      7,
      250,
    );

  let qrY = y - 42;

  for (
    const line of qrLines
  ) {
    drawText(
      page,
      line,
      MARGIN_X + 105,
      qrY,
      regular,
      7,
      GRAY,
    );

    qrY -= 10;
  }

  /*
   * =====================================================
   * RECEPCIÓN
   * =====================================================
   */

  y -= 115;

  if (
    y - 180 <
    MARGIN_BOTTOM
  ) {
    page = addPage(pdf);

    drawHeader(
      page,
      data,
      bold,
      regular,
    );

    y =
      PAGE_HEIGHT - 120;
  }

  y = drawSectionTitle(
    page,
    "CONFIRMACIÓN DE RECEPCIÓN",
    y,
    bold,
  );

  const firmaBoxX = MARGIN_X;

  const firmaBoxWidth =
    PAGE_WIDTH -
    MARGIN_X * 2;

  const firmaBoxHeight = 125;

  drawBox(
    page,
    firmaBoxX,
    y - firmaBoxHeight,
    firmaBoxWidth,
    firmaBoxHeight,
    WHITE,
  );

  if (data.firma) {
    drawText(
      page,
      data.firma.metodo ===
        "manuscrita"
        ? "Método: Firma manuscrita"
        : "Método: Confirmación textual",
      firmaBoxX + 10,
      y - 18,
      bold,
      8,
      PRIMARY,
    );

    await addSignature(
      pdf,
      page,
      data.firma,
      firmaBoxX + 10,
      y - 105,
      firmaBoxWidth - 20,
      75,
      regular,
      bold,
    );

    if (
      data.firma.recibidoPor
    ) {
      drawText(
        page,
        `Recibido por: ${data.firma.recibidoPor}`,
        firmaBoxX + 10,
        y - 115,
        regular,
        8,
        DARK,
      );
    }

    drawText(
      page,
      `Fecha de recepción: ${formatDate(
        data.firma.fechaRecibido ||
          data.pedido.fechaRecibido ||
          data.pedido.completadoEn,
      )}`,
      firmaBoxX + 260,
      y - 115,
      regular,
      8,
      DARK,
    );
  } else {
    drawText(
      page,
      ventaCompletada
        ? "Venta completada. No se registró una firma."
        : "La recepción aún no ha sido registrada.",
      firmaBoxX + 10,
      y - 45,
      regular,
      9,
      ventaCompletada
        ? PRIMARY
        : GRAY,
    );

    if (ventaCompletada) {
      drawText(
        page,
        "CANASTAS VERDES — VENTA COMPLETADA",
        firmaBoxX + 10,
        y - 70,
        bold,
        10,
        PRIMARY,
      );

      drawText(
        page,
        `Fecha de finalización: ${formatDate(
          data.pedido.completadoEn ||
            data.pedido.fechaRecibido,
        )}`,
        firmaBoxX + 10,
        y - 90,
        regular,
        8,
        DARK,
      );
    }
  }

  /*
   * =====================================================
   * PAGINACIÓN
   * =====================================================
   */

  const pages = pdf.getPages();

  pages.forEach(
    (currentPage, index) => {
      drawFooter(
        currentPage,
        index + 1,
        pages.length,
        regular,
      );
    },
  );

  return pdf.save();
}