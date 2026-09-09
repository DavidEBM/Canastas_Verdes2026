"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { storage } from "@/lib/firebase";

import * as XLSX from "xlsx";

import { useAuth } from "@/hooks/useAuth";

/* =========================================================
   TIPOS
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

type CatalogOption = {
  id: string;
  nombre: string;
};

/* =========================================================
   FORMULARIO
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
   UNIDAD / PRESENTACIÓN
========================================================= */

function parseUnidad(unidad: string) {
  const match = unidad.match(
    /^\s*(.*?)\s*x\s*(.*?)\s*$/i,
  );

  if (!match) {
    return {
      cantidad: "",
      presentacion: unidad.trim(),
    };
  }

  return {
    cantidad: match[1].trim(),
    presentacion: match[2].trim(),
  };
}

/* =========================================================
   EXCEL
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

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/* =========================================================
   CATÁLOGOS
========================================================= */

function normalizeOptions(
  value: unknown,
): CatalogOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const data =
        item as Record<string, unknown>;

      const id =
        typeof data.id === "string"
          ? data.id
          : typeof data.Id === "string"
            ? data.Id
            : "";

      const nombre =
        typeof data.nombre === "string"
          ? data.nombre
          : typeof data.Nombre === "string"
            ? data.Nombre
            : typeof data.name === "string"
              ? data.name
              : "";

      if (!nombre.trim()) {
        return null;
      }

      return {
        id: id || nombre,
        nombre: nombre.trim(),
      };
    })
    .filter(
      (
        item,
      ): item is CatalogOption =>
        item !== null,
    );
}

/* =========================================================
   COMBOBOX
========================================================= */

interface CatalogComboboxProps {
  label: string;
  value: string;
  options: CatalogOption[];
  loading?: boolean;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

function CatalogCombobox({
  label,
  value,
  options,
  loading = false,
  required = false,
  placeholder = "Seleccionar...",
  onChange,
}: CatalogComboboxProps) {
  const [open, setOpen] =
    useState(false);

  const [search, setSearch] =
    useState(value);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filteredOptions =
    options.filter((item) =>
      item.nombre
        .toLowerCase()
        .includes(
          search.trim().toLowerCase(),
        ),
    );

  const selectOption = (
    option: CatalogOption,
  ) => {
    onChange(option.nombre);
    setSearch(option.nombre);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setSearch("");
    setOpen(true);
  };

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm font-semibold">
        {label}{" "}
        {required && (
          <span className="text-red-600">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <input
          type="text"
          required={required}
          value={search}
          placeholder={
            loading
              ? "Cargando opciones..."
              : options.length === 0
                ? "No hay opciones disponibles"
                : placeholder
          }
          disabled={
            loading ||
            options.length === 0
          }
          onFocus={() =>
            setOpen(true)
          }
          onChange={(event) => {
            const newValue =
              event.target.value;

            setSearch(newValue);
            onChange(newValue);
            setOpen(true);
          }}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 pr-10 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="button"
          onClick={() => {
            if (
              !loading &&
              options.length > 0
            ) {
              setOpen(
                (current) => !current,
              );
            }
          }}
          disabled={
            loading ||
            options.length === 0
          }
          className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-[var(--foreground)]/60"
          aria-label={`Mostrar opciones de ${label}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${
              open ? "rotate-180" : ""
            }`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {open &&
        !loading &&
        options.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg">
            {filteredOptions.length >
            0 ? (
              filteredOptions.map(
                (option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      selectOption(
                        option,
                      )
                    }
                    className={`block w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] ${
                      value ===
                      option.nombre
                        ? "bg-[var(--secondary)] font-semibold text-[var(--primary)]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    {option.nombre}
                  </button>
                ),
              )
            ) : (
              <div className="px-3 py-3 text-sm text-[var(--foreground)]/60">
                No se encontraron
                coincidencias.
              </div>
            )}

            {value && (
              <button
                type="button"
                onClick={clear}
                className="w-full border-t border-[var(--border)] px-3 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Limpiar selección
              </button>
            )}
          </div>
        )}

      {options.length === 0 &&
        !loading && (
          <p className="mt-1 text-xs text-amber-700">
            No hay opciones
            registradas en Firebase.
          </p>
        )}

      {options.length > 0 && (
        <p className="mt-1 text-xs text-[var(--foreground)]/55">
          Escribe para buscar o
          utiliza la flecha para
          seleccionar.
        </p>
      )}
    </div>
  );
}

/* =========================================================
   PÁGINA
========================================================= */

export default function DashboardProductosPage() {
  const {
    user,
    loading,
    role,
  } = useAuth();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [categories, setCategories] =
    useState<CatalogOption[]>([]);

  const [municipalities, setMunicipalities] =
    useState<CatalogOption[]>([]);

  const [farms, setFarms] =
    useState<CatalogOption[]>([]);

  const [presentations, setPresentations] =
    useState<CatalogOption[]>([]);

  const [form, setForm] =
    useState<ProductForm>({
      ...empty,
    });

  const [cantidad, setCantidad] =
    useState("");

  const [presentacion, setPresentacion] =
    useState("");

  const [editing, setEditing] =
    useState<string | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [loadingCatalogs, setLoadingCatalogs] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  /* =======================================================
     PREVIEW DE IMAGEN
  ======================================================= */

  const [imagePreviewUrl, setImagePreviewUrl] =
    useState<string | null>(null);

  const [originalImagePath, setOriginalImagePath] =
    useState<string | null>(null);

  /* =======================================================
     CREAR PREVIEW DEL ARCHIVO LOCAL
  ======================================================= */

  useEffect(() => {
    if (!imageFile) {
      return;
    }

    const previewUrl =
      URL.createObjectURL(imageFile);

    setImagePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [imageFile]);

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

      const response = await fetch(
        path,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
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
        },
      );

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
          typeof result ===
            "object" &&
          "message" in result &&
          typeof result.message ===
            "string"
            ? result.message
            : "No fue posible completar la operación.";

        throw new Error(message);
      }

      return result;
    },
    [user],
  );

  /* =======================================================
     PRODUCTOS
  ======================================================= */

  const loadProducts =
    useCallback(
      async () => {
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
            typeof result ===
              "object" &&
            "data" in result &&
            Array.isArray(
              result.data,
            )
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
      },
      [api, role, user],
    );

  /* =======================================================
     CATÁLOGOS
  ======================================================= */

  const loadCatalogs =
    useCallback(
      async () => {
        if (
          !user ||
          role !== "admin"
        ) {
          return;
        }

        try {
          setLoadingCatalogs(true);

          const [
            categoriesResult,
            municipalitiesResult,
            farmsResult,
            presentationsResult,
          ] = await Promise.all([
            api("/api/categorias"),
            api(
              "/api/municipalidades",
            ),
            api("/api/granjas"),
            api("/api/presentaciones"),
          ]);

          if (
            categoriesResult &&
            typeof categoriesResult ===
              "object" &&
            "data" in
              categoriesResult
          ) {
            setCategories(
              normalizeOptions(
                categoriesResult.data,
              ),
            );
          }

          if (
            municipalitiesResult &&
            typeof municipalitiesResult ===
              "object" &&
            "data" in
              municipalitiesResult
          ) {
            setMunicipalities(
              normalizeOptions(
                municipalitiesResult.data,
              ),
            );
          }

          if (
            farmsResult &&
            typeof farmsResult ===
              "object" &&
            "data" in farmsResult
          ) {
            setFarms(
              normalizeOptions(
                farmsResult.data,
              ),
            );
          }

          if (
            presentationsResult &&
            typeof presentationsResult ===
              "object" &&
            "data" in
              presentationsResult
          ) {
            setPresentations(
              normalizeOptions(
                presentationsResult.data,
              ),
            );
          }
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No fue posible cargar los catálogos.",
          );
        } finally {
          setLoadingCatalogs(false);
        }
      },
      [api, role, user],
    );

  useEffect(() => {
    if (
      !loading &&
      user &&
      role === "admin"
    ) {
      void loadProducts();
      void loadCatalogs();
    }
  }, [
    loading,
    user,
    role,
    loadProducts,
    loadCatalogs,
  ]);

  /* =======================================================
     SET FORM
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
     RESET
  ======================================================= */

  const resetForm = () => {
    setEditing(null);
    setForm({ ...empty });
    setCantidad("");
    setPresentacion("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setOriginalImagePath(null);
    setError(null);
  };

  /* =======================================================
     IMAGEN
  ======================================================= */

  const selectImage = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0] ??
      null;

    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Selecciona una imagen JPG, PNG o WEBP.",
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "La imagen no puede superar los 5 MB.",
      );
      return;
    }

    setError(null);
    setImageFile(file);

    if (!form.imageName.trim()) {
      const originalName =
        file.name.replace(
          /\.[^/.]+$/,
          "",
        );

      setForm((current) => ({
        ...current,
        imageName:
          originalName,
      }));
    }
  };

  /* =======================================================
     CANCELAR NUEVA IMAGEN
  ======================================================= */

  const clearSelectedImage = () => {
    setImageFile(null);

    setImagePreviewUrl(
      editing && form.imgPath
        ? form.imgPath
        : null,
    );

    setError(null);
  };

  /* =======================================================
     SUBIR / REEMPLAZAR IMAGEN
  ======================================================= */

  const processImage =
    async (): Promise<{
      imgPath: string;
      imageName: string;
      newStoragePath: string | null;
    }> => {
      if (!imageFile) {
        return {
          imgPath: form.imgPath,
          imageName:
            form.imageName.trim(),
          newStoragePath: null,
        };
      }

      const cleanName =
        form.imageName
          .trim()
          .replace(
            /\.[^/.]+$/,
            "",
          )
          .replace(
            /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ_-]+/g,
            "-",
          )
          .replace(
            /^-+|-+$/g,
            "",
          );

      if (!cleanName) {
        throw new Error(
          "Indica un nombre válido para la imagen.",
        );
      }

      const extension =
        imageFile.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const fileName =
        `${cleanName}.${extension}`;

      const storagePath =
        `productos/${fileName}`;

      const imageRef = ref(
        storage,
        storagePath,
      );

      await uploadBytes(
        imageRef,
        imageFile,
        {
          contentType:
            imageFile.type,
        },
      );

      const imageUrl =
        await getDownloadURL(
          imageRef,
        );

      return {
        imgPath: imageUrl,
        imageName: fileName,
        newStoragePath: storagePath,
      };
    };

  /* =======================================================
     GUARDAR
  ======================================================= */

  const save = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

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

    if (!form.categoria.trim()) {
      setError(
        "Selecciona una categoría.",
      );
      return;
    }

    if (!cantidad.trim()) {
      setError(
        "Indica la cantidad de la unidad.",
      );
      return;
    }

    if (!presentacion.trim()) {
      setError(
        "Selecciona una presentación.",
      );
      return;
    }

    if (!form.IdGranja.trim()) {
      setError(
        "Selecciona una granja.",
      );
      return;
    }

    if (
      !form.IdMunicipalidad.trim()
    ) {
      setError(
        "Selecciona una municipalidad.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    let uploadedNewPath:
      | string
      | null = null;

    try {
      const wasEditing =
        Boolean(editing);

      const unidad =
        `${cantidad.trim()} x ${presentacion.trim()}`;

      const image =
        await processImage();

      uploadedNewPath =
        image.newStoragePath;

      await api(
        editing
          ? `/api/productos/${editing}`
          : "/api/productos",
        editing ? "PUT" : "POST",
        {
          ...form,
          code: form.code.trim(),
          nombre: form.nombre.trim(),
          descripcion:
            form.descripcion.trim(),
          categoria:
            form.categoria.trim(),
          unidad,
          IdGranja:
            form.IdGranja.trim(),
          IdMunicipalidad:
            form.IdMunicipalidad.trim(),
          imgPath:
            image.imgPath,
          imageName:
            image.imageName,
        },
      );

      if (
        wasEditing &&
        uploadedNewPath &&
        originalImagePath &&
        originalImagePath !==
          uploadedNewPath
      ) {
        try {
          await deleteObject(
            ref(
              storage,
              originalImagePath,
            ),
          );
        } catch (caught) {
          console.warn(
            "No fue posible eliminar la imagen anterior:",
            caught,
          );
        }
      }

      resetForm();

      setNotice(
        wasEditing
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );

      await loadProducts();
    } catch (caught) {
      if (uploadedNewPath) {
        try {
          await deleteObject(
            ref(
              storage,
              uploadedNewPath,
            ),
          );
        } catch {
          // No interrumpimos el mensaje principal.
        }
      }

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
     EDITAR
  ======================================================= */

  const edit = (
    product: Product,
  ) => {
    const {
      id,
      ...data
    } = product;

    const parsed =
      parseUnidad(
        product.unidad,
      );

    setEditing(id);

    setForm({
      ...empty,
      ...data,
    });

    setCantidad(
      parsed.cantidad,
    );

    setPresentacion(
      parsed.presentacion,
    );

    setImageFile(null);

    /*
     * Al editar se utiliza directamente
     * la URL almacenada en Firebase.
     */
    setImagePreviewUrl(
      product.imgPath || null,
    );

    setOriginalImagePath(
      product.imageName
        ? `productos/${product.imageName}`
        : null,
    );

    setError(null);
    setNotice(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     ELIMINAR
  ======================================================= */

  const remove = async (
    product: Product,
  ) => {
    if (
      !window.confirm(
        `¿Eliminar "${product.nombre}"?\n\nEl producto será desactivado.`,
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

      await loadProducts();
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
     EXCEL - PLANTILLA
  ======================================================= */

  const template = () => {
    const rows: Record<
      string,
      unknown
    >[] = products.map(
      (product) => ({
        id: product.id,
        accion: "ACTUALIZAR",
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

    if (rows.length === 0) {
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
        [
          "unidad debe utilizar el formato: 2 x Kg, 3 x Paquete, etc.",
        ],
        [
          "categoria, IdGranja e IdMunicipalidad utilizan los nombres registrados.",
        ],
        [
          "La presentación se selecciona desde el catálogo de presentaciones.",
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
     IMPORTAR EXCEL
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

    if (
      !/\.(xlsx|xls)$/i.test(
        file.name,
      )
    ) {
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
          { type: "array" },
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
        >(sheet, {
          defval: "",
        });

      if (!rows.length) {
        throw new Error(
          "La primera hoja no contiene productos.",
        );
      }

      const result =
        await api(
          "/api/productos/importar",
          "POST",
          { rows },
        );

      const data =
        result &&
        typeof result ===
          "object" &&
        "data" in result &&
        result.data &&
        typeof result.data ===
          "object"
          ? (result.data as {
              created?: number;
              updated?: number;
              deleted?: number;
            })
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

  /* =======================================================
     ESTADOS DE ACCESO
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
          pueden gestionar el
          catálogo.
        </p>
      </main>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

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
      </div>

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

      {/* ===================================================
          FORMULARIO
      =================================================== */}

      <form
        onSubmit={save}
        className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5"
      >
        <div className="mb-6">
          <h2 className="text-lg font-bold">
            {editing
              ? "Editar producto"
              : "Agregar producto"}
          </h2>

          <p className="mt-1 text-sm text-[var(--foreground)]/60">
            Completa la información
            del producto. Los campos
            marcados con * son
            obligatorios.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* Código */}

          <div>
            <label
              htmlFor="product-code"
              className="mb-1.5 block text-sm font-semibold"
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
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Nombre */}

          <div>
            <label
              htmlFor="product-name"
              className="mb-1.5 block text-sm font-semibold"
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
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Precio */}

          <div>
            <label
              htmlFor="product-price"
              className="mb-1.5 block text-sm font-semibold"
            >
              Precio *
            </label>

            <input
              id="product-price"
              required
              type="number"
              min="0"
              step="1"
              value={form.precio}
              onChange={(event) =>
                set(
                  "precio",
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Stock */}

          <div>
            <label
              htmlFor="product-stock"
              className="mb-1.5 block text-sm font-semibold"
            >
              Stock disponible *
            </label>

            <input
              id="product-stock"
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(event) =>
                set(
                  "stock",
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Categoría */}

          <CatalogCombobox
            label="Categoría"
            value={form.categoria}
            options={categories}
            loading={loadingCatalogs}
            required
            placeholder="Escribe para buscar categoría..."
            onChange={(value) =>
              set(
                "categoria",
                value,
              )
            }
          />

          {/* Cantidad */}

          <div>
            <label
              htmlFor="product-quantity"
              className="mb-1.5 block text-sm font-semibold"
            >
              Unidad *
            </label>

            <input
              id="product-quantity"
              required
              type="text"
              inputMode="decimal"
              value={cantidad}
              onChange={(event) =>
                setCantidad(
                  event.target.value,
                )
              }
              placeholder="Ej. 2"
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm outline-none focus:border-[var(--primary)]"
            />

            <p className="mt-1 text-xs text-[var(--foreground)]/55">
              Cantidad incluida.
            </p>
          </div>

          {/* Presentación */}

          <CatalogCombobox
            label="Presentación"
            value={presentacion}
            options={presentations}
            loading={loadingCatalogs}
            required
            placeholder="Escribe para buscar presentación..."
            onChange={(value) =>
              setPresentacion(value)
            }
          />

          {/* Granja */}

          <CatalogCombobox
            label="Granja productora"
            value={form.IdGranja}
            options={farms}
            loading={loadingCatalogs}
            required
            placeholder="Escribe para buscar granja..."
            onChange={(value) =>
              set(
                "IdGranja",
                value,
              )
            }
          />

          {/* Municipalidad */}

          <CatalogCombobox
            label="Municipalidad"
            value={
              form.IdMunicipalidad
            }
            options={municipalities}
            loading={loadingCatalogs}
            required
            placeholder="Escribe para buscar municipio..."
            onChange={(value) =>
              set(
                "IdMunicipalidad",
                value,
              )
            }
          />

          {/* =================================================
              IMAGEN
          ================================================= */}

          <div className="sm:col-span-2 lg:col-span-4">

            <label className="mb-1.5 block text-sm font-semibold">
              Imagen del producto
            </label>

            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">

              {/* PREVIEW */}

              <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">

                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt={
                      form.nombre
                        ? `Imagen de ${form.nombre}`
                        : "Vista previa del producto"
                    }
                    className="h-full max-h-[220px] w-full object-contain p-3"
                    onError={() => {
                      setImagePreviewUrl(
                        null,
                      );

                      setError(
                        "No fue posible cargar la imagen del producto.",
                      );
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 text-center">

                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-3 text-[var(--foreground)]/30"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      />

                      <circle
                        cx="8.5"
                        cy="8.5"
                        r="1.5"
                      />

                      <path d="m21 15-5-5L5 21" />
                    </svg>

                    <p className="text-sm font-semibold text-[var(--foreground)]/60">
                      Sin imagen
                    </p>

                    <p className="mt-1 text-xs text-[var(--foreground)]/40">
                      Selecciona una imagen
                      para verla aquí
                    </p>
                  </div>
                )}

                {/* INDICADOR */}

                {imageFile && (
                  <div className="absolute left-2 top-2 rounded-full bg-[var(--primary)] px-2.5 py-1 text-[10px] font-bold text-white shadow">
                    NUEVA IMAGEN
                  </div>
                )}

                {!imageFile &&
                  editing &&
                  form.imgPath && (
                    <div className="absolute left-2 top-2 rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-bold text-white shadow">
                      IMAGEN ACTUAL
                    </div>
                  )}
              </div>

              {/* CONTROLES */}

              <div>

                <label
                  htmlFor="product-image"
                  className={`flex min-h-[90px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[var(--primary)] bg-[var(--secondary)]/40 px-4 text-center transition hover:bg-[var(--secondary)] ${
                    busy
                      ? "pointer-events-none opacity-60"
                      : ""
                  }`}
                >
                  <div>

                    <div className="mb-1 text-sm font-bold text-[var(--primary)]">
                      {imageFile
                        ? "Cambiar imagen"
                        : editing &&
                            form.imgPath
                          ? "Reemplazar imagen"
                          : "Seleccionar imagen"}
                    </div>

                    <div className="text-xs text-[var(--foreground)]/60">
                      JPG, PNG o WEBP · Máx. 5 MB
                    </div>

                  </div>

                  <input
                    id="product-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={selectImage}
                    disabled={busy}
                    className="sr-only"
                  />
                </label>

                <label
                  htmlFor="image-name"
                  className="mb-1.5 mt-4 block text-xs font-semibold text-[var(--foreground)]/70"
                >
                  Nombre del archivo
                </label>

                <input
                  id="image-name"
                  type="text"
                  value={
                    form.imageName
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        imageName:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Ej. tomate-chonto"
                  disabled={busy}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="mt-1 text-xs text-[var(--foreground)]/55">
                  Puedes cambiar el
                  nombre incluso sin
                  seleccionar una imagen
                  nueva.
                </p>

                {imageFile && (
                  <>
                    <p className="mt-2 text-xs font-medium text-[var(--primary)]">
                      Nueva imagen seleccionada:
                    </p>

                    <p className="mt-0.5 truncate text-xs text-[var(--foreground)]/60">
                      {imageFile.name}
                    </p>

                    <button
                      type="button"
                      onClick={
                        clearSelectedImage
                      }
                      disabled={busy}
                      className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                    >
                      Cancelar nueva imagen
                    </button>
                  </>
                )}

                {!imageFile &&
                  editing &&
                  form.imgPath && (
                    <p className="mt-2 text-xs text-green-700">
                      Imagen actual:{" "}
                      {form.imageName ||
                        "registrada"}
                    </p>
                  )}

              </div>
            </div>
          </div>

          {/* Descripción */}

          <div className="sm:col-span-2 lg:col-span-4">
            <label
              htmlFor="product-description"
              className="mb-1.5 block text-sm font-semibold"
            >
              Descripción
            </label>

            <textarea
              id="product-description"
              rows={4}
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
              className="w-full resize-y rounded-lg border border-[var(--border)] p-2.5 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Activo */}

          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(event) =>
                set(
                  "activo",
                  event.target.checked,
                )
              }
              className="h-4 w-4"
            />

            <span className="text-sm font-semibold">
              Producto activo y visible
              en la tienda
            </span>
          </label>
        </div>

        {/* BOTONES */}

        <div className="mt-6 flex flex-wrap gap-3">

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      {/* ===================================================
          TABLA
      =================================================== */}

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
            ) : products.length ===
              0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[var(--foreground)]/60"
                >
                  No hay productos
                  registrados.
                </td>
              </tr>
            ) : (
              products.map(
                (product) => (
                  <tr
                    key={product.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3 font-medium">
                      {product.code}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {product.nombre}
                      </p>

                      <p className="text-xs text-[var(--foreground)]/60">
                        {product.categoria ||
                          "Sin categoría"}
                      </p>

                      <p className="text-xs text-[var(--foreground)]/50">
                        {product.unidad}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {formatPrice(
                        product.precio,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {product.stock}
                    </td>

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

                    <td className="px-4 py-3">
                      <div className="flex gap-3">

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            edit(
                              product,
                            )
                          }
                          className="font-semibold text-[var(--primary)] disabled:opacity-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            remove(
                              product,
                            )
                          }
                          className="font-semibold text-red-600 disabled:opacity-50"
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

