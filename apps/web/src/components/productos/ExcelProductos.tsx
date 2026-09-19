"use client";

import { ChangeEvent } from "react";
import * as XLSX from "xlsx";

type Product = {
  id: string;
  code: string;
  nombre: string;
  descripcion: string;
  precio: number;
  costoPcc: number;
  porcentajeLogistica: number;
  porcentajeTransporte: number;
  precioSugerido: number;
  precioVenta: number;
  stock: number;
  categoria: string;
  unidad: string;
  activo: boolean;
  IdProductor: string;
  IdMunicipalidad: string;
  componentes: {
    productoId: string;
    cantidad: number;
  }[];
};

type CatalogOption = {
  id: string;
  nombre: string;
};

interface ExcelProductosProps {
  products: Product[];
  producers: CatalogOption[];
  municipalities: CatalogOption[];
  busy: boolean;
  api: (
    path: string,
    method?: string,
    body?: unknown,
  ) => Promise<unknown>;
  loadProducts: () => Promise<void>;
  setBusy: (value: boolean) => void;
  setError: (value: string | null) => void;
  setNotice: (value: string | null) => void;
}

const CANASTA_CATEGORY = "Canasta";

/**
 * Convierte una unidad antigua con formato:
 *
 * "200 x gr"
 *
 * en:
 *
 * cantidad = "200"
 * presentacion = "gr"
 *
 * Si no tiene formato "cantidad x presentación",
 * conserva toda la unidad como presentación.
 */
function parseUnidad(unidad: string) {
  const value = String(unidad ?? "").trim();

  if (!value) {
    return {
      cantidad: "",
      presentacion: "",
    };
  }

  const match = value.match(/^\s*(.*?)\s*x\s*(.*?)\s*$/i);

  if (!match) {
    return {
      cantidad: "",
      presentacion: value,
    };
  }

  return {
    cantidad: match[1].trim(),
    presentacion: match[2].trim(),
  };
}

/**
 * Todas las filas Excel utilizan unknown porque
 * las filas normales contienen números mientras que
 * las filas vacías contienen strings.
 *
 * Esto evita el error:
 *
 * Type 'string' is not assignable to type 'number'
 */
type ExcelRow = Record<string, unknown>;

export default function ExcelProductos({
  products,
  producers,
  municipalities,
  busy,
  api,
  loadProducts,
  setBusy,
  setError,
  setNotice,
}: ExcelProductosProps) {
  /*
   * ============================================================
   * EXPORTAR PLANTILLA
   * ============================================================
   */

  const template = () => {
    const BLANK_ROWS = 10;

    /*
     * ============================================================
     * PRODUCTOS
     * ============================================================
     */

    const productRows: ExcelRow[] = products
      .filter(
        (product) =>
          product.categoria.trim().toLowerCase() !==
          CANASTA_CATEGORY.toLowerCase(),
      )
      .map((product): ExcelRow => {
        const producer = producers.find(
          (item) => item.id === product.IdProductor,
        );

        const municipality = municipalities.find(
          (item) => item.id === product.IdMunicipalidad,
        );

        const parsedUnidad = parseUnidad(product.unidad);

        return {
          Codigo: product.code,
          Nombre: product.nombre,
          Descripcion: product.descripcion,
          Precio: product.precio,
          CostoPcc: product.costoPcc,
          PorcentajeLogistica: product.porcentajeLogistica,
          PorcentajeTransporte: product.porcentajeTransporte,
          PrecioSugerido: product.precioSugerido,
          PrecioVenta: product.precioVenta,
          Stock: product.stock,
          Categoria: product.categoria,
          Unidad: parsedUnidad.presentacion,
          Cantidad: parsedUnidad.cantidad,
          NombreProductor: producer?.nombre ?? "",
          NombreMunicipio: municipality?.nombre ?? "",
          Activo: product.activo ? "Sí" : "No",
        };
      });

    /*
     * Filas vacías para nuevos productos.
     */

    for (let i = 0; i < BLANK_ROWS; i++) {
      productRows.push({
        Codigo: "",
        Nombre: "",
        Descripcion: "",
        Precio: "",
        CostoPcc: "",
        PorcentajeLogistica: "",
        PorcentajeTransporte: "",
        PrecioSugerido: "",
        PrecioVenta: "",
        Stock: "",
        Categoria: "",
        Unidad: "",
        Cantidad: "",
        NombreProductor: "",
        NombreMunicipio: "",
        Activo: "Sí",
      });
    }

    /*
     * ============================================================
     * CANASTAS
     * ============================================================
     */

    const canastaProducts = products.filter(
      (product) =>
        product.categoria.trim().toLowerCase() ===
        CANASTA_CATEGORY.toLowerCase(),
    );

    const canastaRows: ExcelRow[] = canastaProducts.map(
      (canasta): ExcelRow => {
        const producer = producers.find(
          (item) => item.id === canasta.IdProductor,
        );

        const municipality = municipalities.find(
          (item) => item.id === canasta.IdMunicipalidad,
        );

        const parsedUnidad = parseUnidad(canasta.unidad);

        return {
          Codigo: canasta.code,
          Nombre: canasta.nombre,
          Descripcion: canasta.descripcion,
          Precio: canasta.precio,
          CostoPcc: canasta.costoPcc,
          PorcentajeLogistica: canasta.porcentajeLogistica,
          PorcentajeTransporte: canasta.porcentajeTransporte,
          PrecioSugerido: canasta.precioSugerido,
          PrecioVenta: canasta.precioVenta,
          Stock: canasta.stock,
          Categoria: CANASTA_CATEGORY,
          Unidad: parsedUnidad.presentacion,
          Cantidad: parsedUnidad.cantidad,
          NombreProductor: producer?.nombre ?? "",
          NombreMunicipio: municipality?.nombre ?? "",
          Activo: canasta.activo ? "Sí" : "No",
        };
      },
    );

    /*
     * Filas vacías para nuevas canastas.
     */

    for (let i = 0; i < BLANK_ROWS; i++) {
      canastaRows.push({
        Codigo: "",
        Nombre: "",
        Descripcion: "",
        Precio: "",
        CostoPcc: "",
        PorcentajeLogistica: "",
        PorcentajeTransporte: "",
        PrecioSugerido: "",
        PrecioVenta: "",
        Stock: "",
        Categoria: CANASTA_CATEGORY,
        Unidad: "",
        Cantidad: "",
        NombreProductor: "",
        NombreMunicipio: "",
        Activo: "Sí",
      });
    }

    /*
     * ============================================================
     * COMPONENTES DE CANASTAS
     * ============================================================
     */

    const componentRows: ExcelRow[] = [];

    for (const canasta of canastaProducts) {
      for (const component of canasta.componentes ?? []) {
        const product = products.find(
          (item) => item.id === component.productoId,
        );

        if (!product) continue;

        componentRows.push({
          CodigoCanasta: canasta.code,
          Producto: product.code,
          Cantidad: component.cantidad,
        });
      }
    }

    /*
     * Filas vacías para nuevos componentes.
     */

    for (let i = 0; i < BLANK_ROWS; i++) {
      componentRows.push({
        CodigoCanasta: "",
        Producto: "",
        Cantidad: "",
      });
    }

    /*
     * ============================================================
     * INSTRUCCIONES
     * ============================================================
     */

    const instructionsRows = [
      ["INSTRUCCIONES PARA ACTUALIZAR EL CATÁLOGO"],
      [""],
      ["1. No cambies el Código de un producto o canasta existente."],
      ["2. Puedes modificar los datos de las filas existentes."],
      [
        "3. Para agregar un producto nuevo, escribe los datos en una fila vacía al final de la hoja Productos.",
      ],
      [
        "4. Para agregar una canasta nueva, escribe los datos en una fila vacía al final de la hoja Canastas.",
      ],
      [
        "5. Las filas que no aparezcan en el Excel NO se eliminarán.",
      ],
      ["6. Activo debe ser Sí o No."],
      [
        "7. Los valores de Precio, CostoPcc, PrecioSugerido y PrecioVenta están expresados en COP.",
      ],
      [
        "8. PorcentajeLogistica y PorcentajeTransporte se expresan como números entre 0 y 100.",
      ],
      [
        "9. Unidad contiene la presentación, por ejemplo Kg, gr, Paquete, Mano, etc.",
      ],
      ["10. Cantidad contiene la cantidad de la presentación."],
      [
        "11. NombreProductor debe coincidir con un productor existente.",
      ],
      [
        "12. NombreMunicipio debe coincidir con una municipalidad existente.",
      ],
      [
        "13. En ComponentesCanastas, CodigoCanasta debe ser el código de una canasta.",
      ],
      [
        "14. En ComponentesCanastas, Producto debe ser el código de un producto existente.",
      ],
      [
        "15. Cantidad en ComponentesCanastas indica cuántas unidades del producto contiene la canasta.",
      ],
      [
        "16. No agregues IDs de Firebase, URLs, JSON ni información técnica.",
      ],
      [
        "17. Puedes agregar nuevos registros después de los registros existentes.",
      ],
      [
        "18. Los registros sin cambios se conservarán sin modificaciones.",
      ],
    ];

    /*
     * ============================================================
     * CREAR WORKBOOK
     * ============================================================
     */

    const workbook = XLSX.utils.book_new();

    /*
     * Productos
     */

    const productSheet =
      XLSX.utils.json_to_sheet(productRows);

    XLSX.utils.book_append_sheet(
      workbook,
      productSheet,
      "Productos",
    );

    /*
     * Canastas
     */

    const canastaSheet =
      XLSX.utils.json_to_sheet(canastaRows);

    XLSX.utils.book_append_sheet(
      workbook,
      canastaSheet,
      "Canastas",
    );

    /*
     * Componentes
     */

    const componentSheet =
      XLSX.utils.json_to_sheet(componentRows);

    XLSX.utils.book_append_sheet(
      workbook,
      componentSheet,
      "ComponentesCanastas",
    );

    /*
     * Instrucciones
     */

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet(instructionsRows);

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      "Instrucciones",
    );

    /*
     * ============================================================
     * ANCHOS DE COLUMNAS
     * ============================================================
     */

    const productWidths = [
      14,
      28,
      40,
      14,
      14,
      22,
      24,
      18,
      16,
      12,
      20,
      18,
      12,
      30,
      25,
      12,
    ];

    productSheet["!cols"] = productWidths.map(
      (wch) => ({ wch }),
    );

    canastaSheet["!cols"] = productWidths.map(
      (wch) => ({ wch }),
    );

    componentSheet["!cols"] = [
      { wch: 18 },
      { wch: 20 },
      { wch: 12 },
    ];

    instructionsSheet["!cols"] = [
      { wch: 110 },
    ];

    /*
     * ============================================================
     * DESCARGAR ARCHIVO
     * ============================================================
     */

    XLSX.writeFile(
      workbook,
      "catalogo-productos-canastas-verdes.xlsx",
    );
  };

  /*
   * ============================================================
   * IMPORTAR EXCEL
   * ============================================================
   */

  const importFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    /*
     * Validar extensión.
     */

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError(
        "Selecciona un archivo Excel válido (.xlsx o .xls).",
      );
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      /*
       * Leer archivo.
       */

      const workbook = XLSX.read(
        await file.arrayBuffer(),
        {
          type: "array",
        },
      );

      /*
       * ============================================================
       * VERIFICAR HOJAS
       * ============================================================
       */

      const requiredSheets = [
        "Productos",
        "Canastas",
        "ComponentesCanastas",
      ];

      const missingSheets = requiredSheets.filter(
        (sheetName) =>
          !workbook.SheetNames.includes(sheetName),
      );

      if (missingSheets.length > 0) {
        throw new Error(
          `El archivo no contiene las hojas requeridas: ${missingSheets.join(
            ", ",
          )}.`,
        );
      }

      /*
       * ============================================================
       * PRODUCTOS
       * ============================================================
       */

      const productSheet =
        workbook.Sheets["Productos"];

      if (!productSheet) {
        throw new Error(
          "No fue posible leer la hoja Productos.",
        );
      }

      const productRows =
        XLSX.utils
          .sheet_to_json<ExcelRow>(
            productSheet,
            {
              defval: "",
            },
          )
          .filter((row) =>
            Object.values(row).some(
              (value) =>
                String(value ?? "").trim() !== "",
            ),
          );

      /*
       * ============================================================
       * CANASTAS
       * ============================================================
       */

      const canastaSheet =
        workbook.Sheets["Canastas"];

      if (!canastaSheet) {
        throw new Error(
          "No fue posible leer la hoja Canastas.",
        );
      }

      const canastaRows =
        XLSX.utils
          .sheet_to_json<ExcelRow>(
            canastaSheet,
            {
              defval: "",
            },
          )
          .filter((row) =>
            Object.values(row).some(
              (value) =>
                String(value ?? "").trim() !== "",
            ),
          );

      /*
       * ============================================================
       * COMPONENTES
       * ============================================================
       */

      const componentSheet =
        workbook.Sheets["ComponentesCanastas"];

      if (!componentSheet) {
        throw new Error(
          "No fue posible leer la hoja ComponentesCanastas.",
        );
      }

      const componentRows =
        XLSX.utils
          .sheet_to_json<ExcelRow>(
            componentSheet,
            {
              defval: "",
            },
          )
          .filter((row) =>
            Object.values(row).some(
              (value) =>
                String(value ?? "").trim() !== "",
            ),
          );

      /*
       * ============================================================
       * VALIDAR DATOS
       * ============================================================
       */

      if (
        productRows.length === 0 &&
        canastaRows.length === 0 &&
        componentRows.length === 0
      ) {
        throw new Error(
          "El archivo no contiene datos para importar.",
        );
      }

      /*
       * ============================================================
       * ENVIAR AL API
       * ============================================================
       */

      const result = await api(
        "/api/productos/importar",
        "POST",
        {
          productos: productRows,
          canastas: canastaRows,
          componentesCanastas: componentRows,
        },
      );

      /*
       * ============================================================
       * PROCESAR RESPUESTA
       * ============================================================
       */

      const data =
        result &&
        typeof result === "object" &&
        "data" in result &&
        result.data &&
        typeof result.data === "object"
          ? (result.data as {
              created?: number;
              updated?: number;
              deactivated?: number;
              unchanged?: number;
              totalProcessed?: number;
              componentsProcessed?: number;
            })
          : null;

      if (data) {
        setNotice(
          `Importación completada: ${
            data.created ?? 0
          } creados, ${
            data.updated ?? 0
          } actualizados, ${
            data.deactivated ?? 0
          } desactivados y ${
            data.unchanged ?? 0
          } sin cambios${
            data.componentsProcessed !== undefined
              ? `; ${data.componentsProcessed} componentes procesados`
              : ""
          }.`,
        );
      } else {
        setNotice(
          "Importación completada correctamente.",
        );
      }

      await loadProducts();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible importar el Excel.",
      );
    } finally {
      setBusy(false);
    }
  };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={template}
        disabled={busy}
        className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
      >
        Descargar plantilla Excel
      </button>

      <label
        className={`cursor-pointer rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] ${
          busy
            ? "pointer-events-none opacity-50"
            : ""
        }`}
      >
        Importar Excel

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={importFile}
          disabled={busy}
          className="sr-only"
        />
      </label>
    </div>
  );
}
