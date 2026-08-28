"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import * as XLSX from "xlsx";

import { useAuth } from "@/hooks/useAuth";

/* =========================================================
   Tipos
========================================================= */

type Product = {
  id: string;
  code: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  unidad: string;
  imgPath: string;
  imageName: string;
  activo: boolean;
  IdGranja: string;
  IdMunicipalidad: string;
};

type ProductForm = Omit<Product, "id">;

/* =========================================================
   Estado inicial
========================================================= */

const empty: ProductForm = {
  code: "",
  nombre: "",
  descripcion: "",
  precio: 0,
  stock: 0,
  categoria: "",
  unidad: "",
  imgPath: "",
  imageName: "",
  activo: true,
  IdGranja: "",
  IdMunicipalidad: "",
};

/* =========================================================
   Columnas para Excel
========================================================= */

const columns: (keyof ProductForm)[] = [
  "code",
  "nombre",
  "descripcion",
  "precio",
  "stock",
  "categoria",
  "unidad",
  "imgPath",
  "imageName",
  "activo",
  "IdGranja",
  "IdMunicipalidad",
];

/* =========================================================
   Formato de precio
========================================================= */

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/* =========================================================
   Página
========================================================= */

export default function DashboardProductosPage() {
  const {
    user,
    loading,
    role,
  } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);

  const [form, setForm] =
    useState<ProductForm>({
      ...empty,
    });

  const [editing, setEditing] =
    useState<string | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  /* =======================================================
     API
  ======================================================= */

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
        await user.getIdToken();

      const response =
        await fetch(path, {
          method,
          headers: {
            Authorization:
              `Bearer ${token}`,

            ...(body !== undefined
              ? {
                  "Content-Type":
                    "application/json",
                }
              : {}),
          },

          body:
            body !== undefined
              ? JSON.stringify(body)
              : undefined,
        });

      let result: unknown = null;

      try {
        result =
          await response.json();
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

  /* =======================================================
     Cargar productos
  ======================================================= */

  const load =
    useCallback(async () => {
      if (
        !user ||
        role !== "admin"
      ) {
        return;
      }

      try {
        setLoadingProducts(true);
        setError(null);

        const result =
          await api(
            "/api/productos?admin=1",
          );

        if (
          result &&
          typeof result === "object" &&
          "data" in result &&
          Array.isArray(result.data)
        ) {
          setProducts(
            result.data as Product[],
          );
        } else {
          setProducts([]);
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar los productos.",
        );
      } finally {
        setLoadingProducts(false);
      }
    }, [
      api,
      role,
      user,
    ]);

  /* =======================================================
     Cargar al entrar
  ======================================================= */

  useEffect(() => {
    if (
      !loading &&
      user &&
      role === "admin"
    ) {
      void load();
    }
  }, [
    load,
    loading,
    role,
    user,
  ]);

  /* =======================================================
     Actualizar formulario
  ======================================================= */

  const set = (
    key: keyof ProductForm,
    value: string | boolean,
  ) => {
    setForm((current) => ({
      ...current,

      [key]:
        key === "precio" ||
        key === "stock"
          ? Number(value)
          : value,
    }));
  };

  /* =======================================================
     Restablecer formulario
  ======================================================= */

  const resetForm = () => {
    setEditing(null);

    setForm({
      ...empty,
    });

    setError(null);
  };

  /* =======================================================
     Guardar producto
  ======================================================= */

  const save = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    /* -----------------------------------------------------
       Validaciones
    ----------------------------------------------------- */

    if (!form.code.trim()) {
      setError(
        "El código del producto es obligatorio.",
      );
      return;
    }

    if (!form.nombre.trim()) {
      setError(
        "El nombre del producto es obligatorio.",
      );
      return;
    }

    if (
      !Number.isFinite(form.precio) ||
      form.precio < 0
    ) {
      setError(
        "El precio no es válido.",
      );
      return;
    }

    if (
      !Number.isFinite(form.stock) ||
      !Number.isInteger(form.stock) ||
      form.stock < 0
    ) {
      setError(
        "El stock debe ser un número entero mayor o igual a cero.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const wasEditing =
        Boolean(editing);

      await api(
        editing
          ? `/api/productos/${editing}`
          : "/api/productos",
        editing
          ? "PUT"
          : "POST",
        {
          ...form,

          code:
            form.code.trim(),

          nombre:
            form.nombre.trim(),

          descripcion:
            form.descripcion.trim(),

          categoria:
            form.categoria.trim(),

          unidad:
            form.unidad.trim(),

          IdGranja:
            form.IdGranja.trim(),

          IdMunicipalidad:
            form.IdMunicipalidad.trim(),

          imgPath:
            form.imgPath.trim(),

          imageName:
            form.imageName.trim(),
        },
      );

      resetForm();

      setNotice(
        wasEditing
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar el producto.",
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     Editar
  ======================================================= */

  const edit = (
    product: Product,
  ) => {
    const {
      id,
      ...data
    } = product;

    setEditing(id);

    setForm({
      ...empty,
      ...data,
    });

    setError(null);
    setNotice(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     Eliminar
  ======================================================= */

  const remove = async (
    product: Product,
  ) => {
    if (
      !window.confirm(
        `¿Eliminar "${product.nombre}"?\n\nEsta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await api(
        `/api/productos/${product.id}`,
        "DELETE",
      );

      if (
        editing === product.id
      ) {
        resetForm();
      }

      setNotice(
        "Producto eliminado correctamente.",
      );

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible eliminar el producto.",
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     Descargar plantilla Excel
  ======================================================= */

  const template = () => {
    const rows:
      Record<string, unknown>[] =
      products.map(
        (product) => ({
          id: product.id,

          accion:
            "ACTUALIZAR",

          ...columns.reduce<
            Record<string, unknown>
          >(
            (
              result,
              key,
            ) => ({
              ...result,
              [key]:
                product[key],
            }),
            {},
          ),
        }),
      );

    if (
      rows.length === 0
    ) {
      rows.push({
        id: "",
        accion: "CREAR",
        ...empty,
      });
    }

    const workbook =
      XLSX.utils.book_new();

    const productSheet =
      XLSX.utils.json_to_sheet(
        rows,
      );

    XLSX.utils.book_append_sheet(
      workbook,
      productSheet,
      "Productos",
    );

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet([
        ["Instrucciones"],

        [
          "Accion: CREAR, ACTUALIZAR o ELIMINAR.",
        ],

        [
          "Para actualizar o eliminar conserva el id.",
        ],

        [
          "Código, nombre, precio y stock son obligatorios.",
        ],

        [
          "Precio y stock deben ser valores numéricos.",
        ],

        [
          "Stock debe ser un número entero.",
        ],

        [
          "activo puede ser TRUE o FALSE.",
        ],
      ]);

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      "Instrucciones",
    );

    XLSX.writeFile(
      workbook,
      "plantilla-productos-canastas-verdes.xlsx",
    );
  };

  /* =======================================================
     Importar Excel
  ======================================================= */

  const importFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const validExtension =
      /\.(xlsx|xls)$/i.test(
        file.name,
      );

    if (!validExtension) {
      setError(
        "Selecciona un archivo Excel válido (.xlsx o .xls).",
      );
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const workbook =
        XLSX.read(
          await file.arrayBuffer(),
          {
            type: "array",
          },
        );

      const firstSheetName =
        workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error(
          "El archivo no contiene hojas.",
        );
      }

      const sheet =
        workbook.Sheets[
          firstSheetName
        ];

      const rows =
        XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(
          sheet,
          {
            defval: "",
          },
        );

      if (!rows.length) {
        throw new Error(
          "La primera hoja no contiene productos.",
        );
      }

      const result =
        await api(
          "/api/productos/importar",
          "POST",
          {
            rows,
          },
        );

      const data =
        result &&
        typeof result === "object" &&
        "data" in result &&
        result.data &&
        typeof result.data === "object"
          ? result.data as {
              created?: number;
              updated?: number;
              deleted?: number;
            }
          : null;

      setNotice(
        data
          ? `Importación completada: ${
              data.created ?? 0
            } creados, ${
              data.updated ?? 0
            } actualizados y ${
              data.deleted ?? 0
            } eliminados.`
          : "Importación completada correctamente.",
      );

      await load();
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

  /* =======================================================
     Estados de acceso
  ======================================================= */

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        Cargando...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="text-2xl font-bold">
          Acceso restringido
        </h1>

        <p className="mt-2 text-sm text-[var(--foreground)]/70">
          Debes iniciar sesión para
          administrar los productos.
        </p>
      </main>
    );
  }

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="text-2xl font-bold">
          Sin permisos
        </h1>

        <p className="mt-2 text-sm text-[var(--foreground)]/70">
          Solo los administradores
          pueden gestionar el catálogo.
        </p>
      </main>
    );
  }

  /* =======================================================
     Render
  ======================================================= */

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* =================================================
          ENCABEZADO
      ================================================= */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Productos
          </h1>

          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Administra el catálogo de
            Canastas Verdes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          {/* Descargar Excel */}

          <button
            type="button"
            onClick={template}
            disabled={busy}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Descargar plantilla Excel
          </button>

          {/* Importar Excel */}

          <label
            className={`cursor-pointer rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 ${
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
      </div>

      {/* =================================================
          MENSAJES
      ================================================= */}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </div>
      )}

      {/* =================================================
          FORMULARIO
      ================================================= */}

      <form
        onSubmit={save}
        className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5"
      >

        <div className="mb-6">
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            {editing
              ? "Editar producto"
              : "Agregar producto"}
          </h2>

          <p className="mt-1 text-sm text-[var(--foreground)]/60">
            Completa la información del
            producto. Los campos marcados
            con * son obligatorios.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* =================================================
              CÓDIGO
          ================================================= */}

          <div>
            <label
              htmlFor="product-code"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              Código del producto *
            </label>

            <input
              id="product-code"
              required
              value={form.code}
              onChange={(event) =>
                set(
                  "code",
                  event.target.value,
                )
              }
              placeholder="Ej. AS0001"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Identificador único del producto.
            </p>
          </div>

          {/* =================================================
              NOMBRE
          ================================================= */}

          <div>
            <label
              htmlFor="product-name"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              Nombre del producto *
            </label>

            <input
              id="product-name"
              required
              value={form.nombre}
              onChange={(event) =>
                set(
                  "nombre",
                  event.target.value,
                )
              }
              placeholder="Ej. Tomate Chonto"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Nombre que verá el cliente.
            </p>
          </div>

          {/* =================================================
              PRECIO
          ================================================= */}

          <div>
            <label
              htmlFor="product-price"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              Precio *
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--foreground)]/50">
                $
              </span>

              <input
                id="product-price"
                required
                min="0"
                step="1"
                type="number"
                value={form.precio}
                onChange={(event) =>
                  set(
                    "precio",
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-7 pr-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              />
            </div>

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Precio en pesos colombianos (COP).
            </p>
          </div>

          {/* =================================================
              STOCK
          ================================================= */}

          <div>
            <label
              htmlFor="product-stock"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              Stock disponible *
            </label>

            <input
              id="product-stock"
              required
              min="0"
              step="1"
              type="number"
              value={form.stock}
              onChange={(event) =>
                set(
                  "stock",
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Cantidad disponible para venta.
            </p>
          </div>

          {/* =================================================
              CATEGORÍA
          ================================================= */}

          <div>
            <label
              htmlFor="product-category"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              Categoría
            </label>

            <input
              id="product-category"
              value={form.categoria}
              onChange={(event) =>
                set(
                  "categoria",
                  event.target.value,
                )
              }
              placeholder="Ej. Verduras"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Categoría a la que pertenece.
            </p>
          </div>

          {/* =================================================
              UNIDAD / PRESENTACIÓN
          ================================================= */}

          <div>
            <label
              htmlFor="product-unit"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              Unidad / presentación
            </label>

            <input
              id="product-unit"
              value={form.unidad}
              onChange={(event) =>
                set(
                  "unidad",
                  event.target.value,
                )
              }
              placeholder="Ej. kg, libra, atado"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Forma en la que se vende el producto.
            </p>
          </div>

          {/* =================================================
              ID GRANJA
          ================================================= */}

          <div>
            <label
              htmlFor="product-farm"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              ID de la granja
            </label>

            <input
              id="product-farm"
              value={form.IdGranja}
              onChange={(event) =>
                set(
                  "IdGranja",
                  event.target.value,
                )
              }
              placeholder="Ej. GR001"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Identificador de la granja productora.
            </p>
          </div>

          {/* =================================================
              ID MUNICIPALIDAD
          ================================================= */}

          <div>
            <label
              htmlFor="product-municipality"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              ID de municipalidad
            </label>

            <input
              id="product-municipality"
              value={
                form.IdMunicipalidad
              }
              onChange={(event) =>
                set(
                  "IdMunicipalidad",
                  event.target.value,
                )
              }
              placeholder="Ej. MUN001"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Municipio donde se produce.
            </p>
          </div>

          {/* =================================================
              RUTA DE IMAGEN
          ================================================= */}

          <div className="sm:col-span-2">
            <label
              htmlFor="product-image-path"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              Ruta de imagen
            </label>

            <input
              id="product-image-path"
              value={form.imgPath}
              onChange={(event) =>
                set(
                  "imgPath",
                  event.target.value,
                )
              }
              placeholder="Ej. products/tomate-chonto.jpg"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Ruta del archivo almacenado en Firebase Storage.
            </p>
          </div>

          {/* =================================================
              NOMBRE IMAGEN
          ================================================= */}

          <div className="sm:col-span-2">
            <label
              htmlFor="product-image-name"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              Nombre del archivo de imagen
            </label>

            <input
              id="product-image-name"
              value={form.imageName}
              onChange={(event) =>
                set(
                  "imageName",
                  event.target.value,
                )
              }
              placeholder="Ej. tomate-chonto.jpg"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Nombre exacto del archivo de imagen.
            </p>
          </div>

          {/* =================================================
              DESCRIPCIÓN
          ================================================= */}

          <div className="sm:col-span-2 lg:col-span-4">
            <label
              htmlFor="product-description"
              className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
            >
              Descripción
            </label>

            <textarea
              id="product-description"
              value={
                form.descripcion
              }
              onChange={(event) =>
                set(
                  "descripcion",
                  event.target.value,
                )
              }
              placeholder="Describe brevemente el producto..."
              className="min-h-28 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Información adicional que podrá mostrarse en la tienda.
            </p>
          </div>

          {/* =================================================
              ESTADO
          ================================================= */}

          <div className="sm:col-span-2 lg:col-span-2">
            <div className="h-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <label
                htmlFor="product-active"
                className="flex cursor-pointer items-start gap-3"
              >
                <input
                  id="product-active"
                  checked={form.activo}
                  onChange={(event) =>
                    set(
                      "activo",
                      event.target.checked,
                    )
                  }
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />

                <span>
                  <span className="block text-sm font-semibold text-[var(--foreground)]">
                    Producto activo
                  </span>

                  <span className="mt-1 block text-xs text-[var(--foreground)]/55">
                    Si está activo podrá mostrarse
                    y venderse en la tienda.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* =================================================
              BOTONES
          ================================================= */}

          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? "Guardando..."
                : editing
                  ? "Guardar cambios"
                  : "Crear producto"}
            </button>

            {editing && (
              <button
                type="button"
                onClick={resetForm}
                disabled={busy}
                className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>
      </form>

      {/* =================================================
          TABLA
      ================================================= */}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full min-w-[760px] text-left text-sm">

          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="px-4 py-3">
                Código
              </th>

              <th className="px-4 py-3">
                Producto
              </th>

              <th className="px-4 py-3">
                Precio
              </th>

              <th className="px-4 py-3">
                Stock
              </th>

              <th className="px-4 py-3">
                Estado
              </th>

              <th className="px-4 py-3">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>

            {loadingProducts ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[var(--foreground)]/60"
                >
                  Cargando productos...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[var(--foreground)]/60"
                >
                  No hay productos registrados.
                </td>
              </tr>
            ) : (
              products.map(
                (product) => (
                  <tr
                    key={product.id}
                    className="border-t border-[var(--border)]"
                  >

                    {/* Código */}

                    <td className="px-4 py-3 font-medium">
                      {product.code}
                    </td>

                    {/* Producto */}

                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {product.nombre}
                      </p>

                      <p className="text-xs text-[var(--foreground)]/60">
                        {product.categoria ||
                          "Sin categoría"}
                      </p>
                    </td>

                    {/* Precio */}

                    <td className="px-4 py-3">
                      {formatPrice(
                        product.precio,
                      )}
                    </td>

                    {/* Stock */}

                    <td className="px-4 py-3">
                      {product.stock}
                    </td>

                    {/* Estado */}

                    <td className="px-4 py-3">
                      <span
                        className={
                          product.activo
                            ? "font-medium text-green-700"
                            : "font-medium text-red-700"
                        }
                      >
                        {product.activo
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </td>

                    {/* Acciones */}

                    <td className="px-4 py-3">
                      <div className="flex gap-3">

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            edit(product)
                          }
                          className="font-semibold text-[var(--primary)] disabled:opacity-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void remove(
                              product,
                            )
                          }
                          className="font-semibold text-red-700 disabled:opacity-50"
                        >
                          Eliminar
                        </button>

                      </div>
                    </td>

                  </tr>
                ),
              )
            )}

          </tbody>
        </table>
      </div>
    </main>
  );
}