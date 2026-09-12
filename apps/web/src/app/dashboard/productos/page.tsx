"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
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
  costoPcc: number;
  porcentajeLogistica: number;
  porcentajeTransporte: number;
  precioSugerido: number;
  precioVenta: number;
  stock: number;
  categoria: string;
  unidad: string;
  imgPath: string;
  imageName: string;
  activo: boolean;
  IdProductor: string;
  IdMunicipalidad: string;
  componentes: {
    productoId: string;
    cantidad: number;
  }[];
};

type ProductForm = Omit<Product, "id">;

type CatalogOption = {
  id: string;
  nombre: string;
};

type CanastaComponent = {
  productoId: string;
  cantidad: number;
};

type BulkChanges = {
  stock: string;
  activo: "" | "true" | "false";
  categoria: string;
  cantidad: string;
  presentacion: string;
  IdProductor: string;
  IdMunicipalidad: string;

  precio: string;
  costoPcc: string;
  porcentajeLogistica: string;
  porcentajeTransporte: string;
  precioSugerido: string;
  precioVenta: string;

  logisticaModo: "porcentaje" | "fijo";
  transporteModo: "porcentaje" | "fijo";
};

/* =========================================================
CONSTANTES
========================================================= */

const CANASTA_CATEGORY = "Canasta";

const CANASTA_PRESENTATIONS = [
  { id: "Grande", nombre: "Grande" },
  { id: "Mediana", nombre: "Mediana" },
  { id: "Pequeña", nombre: "Pequeña" },
];

const empty: ProductForm = {
  code: "",
  nombre: "",
  descripcion: "",
  precio: 0,
  costoPcc: 0,
  porcentajeLogistica: 0,
  porcentajeTransporte: 0,
  precioSugerido: 0,
  precioVenta: 0,
  stock: 100,
  categoria: "",
  unidad: "",
  imgPath: "",
  imageName: "",
  activo: true,
  IdProductor: "",
  IdMunicipalidad: "",
  componentes: [],
};

const emptyBulkChanges: BulkChanges = {
  stock: "",
  activo: "",
  categoria: "",
  cantidad: "",
  presentacion: "",
  IdProductor: "",
  IdMunicipalidad: "",

  precio: "",
  costoPcc: "",
  porcentajeLogistica: "",
  porcentajeTransporte: "",
  precioSugerido: "",
  precioVenta: "",

  logisticaModo: "porcentaje",
  transporteModo: "porcentaje",
};

/* =========================================================
UNIDAD / PRESENTACIÓN
========================================================= */

function parseUnidad(unidad: string) {
  const match = unidad.match(/^\s*(.*?)\s*x\s*(.*?)\s*$/i);

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
FORMATO
========================================================= */

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function percentageValue(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 100
  ) {
    throw new Error(
      `${fieldName} debe ser un porcentaje entre 0 y 100.`,
    );
  }

  return parsed;
}

/**
 * Convierte un costo fijo COP a porcentaje tomando
 * como base el costo PCC del producto.
 */
function fixedCostToPercentage(
  fixedCost: number,
  costoPcc: number,
  fieldName: string,
) {
  if (!Number.isFinite(fixedCost) || fixedCost < 0) {
    throw new Error(`${fieldName} no es válido.`);
  }

  if (!Number.isFinite(costoPcc) || costoPcc <= 0) {
    throw new Error(
      `No se puede convertir ${fieldName} a porcentaje porque el producto no tiene Costo PCC.`,
    );
  }

  const percentage = (fixedCost / costoPcc) * 100;

  if (percentage > 100) {
    throw new Error(
      `${fieldName} equivale a ${percentage.toFixed(
        2,
      )}%, superando el 100%.`,
    );
  }

  return Number(percentage.toFixed(4));
}

/**
 * Permite interpretar:
 * 10      -> 10%
 * "10%"   -> 10%
 * 5000 COP -> 5000 como costo fijo
 */
function parseBulkCostValue(value: string) {
  const clean = value.trim();

  if (!clean) {
    return null;
  }

  const isPercentage =
    clean.includes("%");

  const numeric = Number(
    clean.replace(/[%$COP\s.]/gi, "").replace(",", "."),
  );

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(
      `El valor "${value}" no es válido.`,
    );
  }

  return {
    value: numeric,
    isPercentage,
  };
}

/* =========================================================
EXCEL
========================================================= */

const columns = [
  "code",
  "nombre",
  "descripcion",
  "precio",
  "costoPcc",
  "porcentajeLogistica",
  "porcentajeTransporte",
  "precioSugerido",
  "precioVenta",
  "stock",
  "categoria",
  "unidad",
  "imgPath",
  "imageName",
  "activo",
  "IdProductor",
  "IdMunicipalidad",
  "componentes",
] as const;

/* =========================================================
CATÁLOGOS
========================================================= */

function normalizeOptions(value: unknown): CatalogOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const data = item as Record<string, unknown>;

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
        id: id || nombre.trim(),
        nombre: nombre.trim(),
      };
    })
    .filter(
      (item): item is CatalogOption => item !== null,
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
  requireSelection?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function CatalogCombobox({
  label,
  value,
  options,
  loading = false,
  required = false,
  placeholder = "Seleccionar...",
  requireSelection = false,
  disabled = false,
  onChange,
}: CatalogComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const selected = options.find(
      (option) => option.id === value,
    );

    if (selected) {
      setSearch(selected.nombre);
      return;
    }

    setSearch(value);
  }, [value, options]);

  const filteredOptions = options.filter((item) =>
    item.nombre
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const selectOption = (option: CatalogOption) => {
    onChange(option.id);
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
          <span className="text-red-600">*</span>
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
            disabled ||
            loading ||
            options.length === 0
          }
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const newValue = event.target.value;

            setSearch(newValue);

            if (requireSelection) {
              onChange("");
            } else {
              const exactOption = options.find(
                (option) =>
                  option.nombre.toLowerCase() ===
                  newValue.trim().toLowerCase(),
              );

              onChange(
                exactOption
                  ? exactOption.id
                  : newValue,
              );
            }

            setOpen(true);
          }}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 pr-10 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="button"
          onClick={() => {
            if (
              !disabled &&
              !loading &&
              options.length > 0
            ) {
              setOpen((current) => !current);
            }
          }}
          disabled={
            disabled ||
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
        !disabled &&
        !loading &&
        options.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    selectOption(option)
                  }
                  className={`block w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] ${
                    value === option.id
                      ? "bg-[var(--secondary)] font-semibold text-[var(--primary)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {option.nombre}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-[var(--foreground)]/60">
                No se encontraron coincidencias.
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
    </div>
  );
}

/* =========================================================
PÁGINA
========================================================= */

export default function DashboardProductosPage() {
  const { user, loading, role } = useAuth();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [categories, setCategories] =
    useState<CatalogOption[]>([]);

  const [municipalities, setMunicipalities] =
    useState<CatalogOption[]>([]);

  const [producers, setProducers] =
    useState<CatalogOption[]>([]);

  const [presentations, setPresentations] =
    useState<CatalogOption[]>([]);

  const [form, setForm] =
    useState<ProductForm>({
      ...empty,
    });

  const [cantidad, setCantidad] = useState("");
  const [presentacion, setPresentacion] =
    useState("");

  const [editing, setEditing] =
    useState<string | null>(null);

  const [busy, setBusy] = useState(false);
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

  const [imagePreviewUrl, setImagePreviewUrl] =
    useState<string | null>(null);

  const [originalImagePath, setOriginalImagePath] =
    useState<string | null>(null);

  const [isCanasta, setIsCanasta] =
    useState(false);

  const [canastaComponents, setCanastaComponents] =
    useState<CanastaComponent[]>([]);

  const [canastaPresentation, setCanastaPresentation] =
    useState("Grande");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("");
  const [producerFilter, setProducerFilter] =
    useState("");
  const [municipalityFilter, setMunicipalityFilter] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState<"" | "active" | "inactive">("");
  const [selectedOnly, setSelectedOnly] =
    useState(false);

  const [selectedIds, setSelectedIds] =
    useState<Set<string>>(new Set());

  const [bulkOpen, setBulkOpen] =
    useState(false);

  const [bulkConfirmOpen, setBulkConfirmOpen] =
    useState(false);

  const [bulkChanges, setBulkChanges] =
    useState<BulkChanges>({
      ...emptyBulkChanges,
    });

  /* =======================================================
  PREVIEW
  ======================================================= */

  useEffect(() => {
    if (!imageFile) return;

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
        throw new Error("Debes iniciar sesión.");
      }

      const token = await user.getIdToken();

      const response = await fetch(path, {
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

  /* =======================================================
  PRODUCTOS
  ======================================================= */

  const loadProducts = useCallback(async () => {
    if (!user || role !== "admin") return;

    try {
      setLoadingProducts(true);
      setError(null);

      const result = await api(
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
  }, [api, role, user]);

  /* =======================================================
  CATÁLOGOS
  ======================================================= */

  const loadCatalogs = useCallback(async () => {
    if (!user || role !== "admin") return;

    try {
      setLoadingCatalogs(true);
      setError(null);

      const [
        categoriesResult,
        municipalitiesResult,
        producersResult,
        presentationsResult,
      ] = await Promise.all([
        api("/api/categorias"),
        api("/api/municipalidades"),
        api("/api/productores"),
        api("/api/presentaciones"),
      ]);

      if (
        categoriesResult &&
        typeof categoriesResult === "object" &&
        "data" in categoriesResult
      ) {
        setCategories(
          normalizeOptions(
            categoriesResult.data,
          ),
        );
      }

      if (
        municipalitiesResult &&
        typeof municipalitiesResult === "object" &&
        "data" in municipalitiesResult
      ) {
        setMunicipalities(
          normalizeOptions(
            municipalitiesResult.data,
          ),
        );
      }

      if (
        producersResult &&
        typeof producersResult === "object"
      ) {
        const data =
          "productores" in producersResult
            ? producersResult.productores
            : "data" in producersResult
              ? producersResult.data
              : [];

        setProducers(
          normalizeOptions(data),
        );
      }

      if (
        presentationsResult &&
        typeof presentationsResult === "object" &&
        "data" in presentationsResult
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
  }, [api, role, user]);

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
  FILTROS
  ======================================================= */

  const filteredProducts = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const producer = producers.find(
        (item) =>
          item.id === product.IdProductor,
      );

      const municipality =
        municipalities.find(
          (item) =>
            item.id ===
            product.IdMunicipalidad,
        );

      const matchesSearch =
        !normalizedSearch ||
        [
          product.code,
          product.nombre,
          product.descripcion,
          product.categoria,
          product.unidad,
          producer?.nombre ?? "",
          municipality?.nombre ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCategory =
        !categoryFilter ||
        product.categoria === categoryFilter;

      const matchesProducer =
        !producerFilter ||
        product.IdProductor ===
          producerFilter;

      const matchesMunicipality =
        !municipalityFilter ||
        product.IdMunicipalidad ===
          municipalityFilter;

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active"
          ? product.activo
          : !product.activo);

      const matchesSelected =
        !selectedOnly ||
        selectedIds.has(product.id);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesProducer &&
        matchesMunicipality &&
        matchesStatus &&
        matchesSelected
      );
    });
  }, [
    products,
    producers,
    municipalities,
    search,
    categoryFilter,
    producerFilter,
    municipalityFilter,
    statusFilter,
    selectedOnly,
    selectedIds,
  ]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setProducerFilter("");
    setMunicipalityFilter("");
    setStatusFilter("");
    setSelectedOnly(false);
  };

  /* =======================================================
  SELECCIÓN
  ======================================================= */

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const selectVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);

      filteredProducts.forEach((product) => {
        next.add(product.id);
      });

      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  /* =======================================================
  FORM
  ======================================================= */

  const set = (
    key: keyof ProductForm,
    value:
      | string
      | boolean
      | number
      | CanastaComponent[],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      ...empty,
      componentes: [],
    });

    setCantidad("");
    setPresentacion("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setOriginalImagePath(null);

    setIsCanasta(false);
    setCanastaComponents([]);
    setCanastaPresentation("Grande");

    setError(null);
  };

  /* =======================================================
  IMAGEN
  ======================================================= */

  const selectImage = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0] ?? null;

    event.target.value = "";

    if (!file) return;

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

    if (file.size > 5 * 1024 * 1024) {
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
        imageName: originalName,
      }));
    }
  };

  const clearSelectedImage = () => {
    setImageFile(null);

    setImagePreviewUrl(
      editing && form.imgPath
        ? form.imgPath
        : null,
    );

    setError(null);
  };

  const processImage = async (): Promise<{
    imgPath: string;
    imageName: string;
    newStoragePath: string | null;
  }> => {
    if (!imageFile) {
      return {
        imgPath: form.imgPath,
        imageName: form.imageName.trim(),
        newStoragePath: null,
      };
    }

    const cleanName = form.imageName
      .trim()
      .replace(/\.[^/.]+$/, "")
      .replace(
        /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ_-]+/g,
        "-",
      )
      .replace(/^-+|-+$/g, "");

    if (!cleanName) {
      throw new Error(
        "Indica un nombre válido para la imagen.",
      );
    }

    const extension =
      imageFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

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
        contentType: imageFile.type,
      },
    );

    const imageUrl =
      await getDownloadURL(imageRef);

    return {
      imgPath: imageUrl,
      imageName: fileName,
      newStoragePath: storagePath,
    };
  };

  /* =======================================================
  CANASTAS
  ======================================================= */

  const toggleCanastaComponent = (
    productId: string,
  ) => {
    setCanastaComponents((current) => {
      const exists = current.some(
        (item) =>
          item.productoId === productId,
      );

      if (exists) {
        return current.filter(
          (item) =>
            item.productoId !== productId,
        );
      }

      return [
        ...current,
        {
          productoId: productId,
          cantidad: 1,
        },
      ];
    });
  };

  const setCanastaQuantity = (
    productId: string,
    cantidad: number,
  ) => {
    setCanastaComponents((current) =>
      current.map((item) =>
        item.productoId === productId
          ? {
              ...item,
              cantidad,
            }
          : item,
      ),
    );
  };

  /* =======================================================
  GUARDAR
  ======================================================= */

  const save = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const category = isCanasta
      ? CANASTA_CATEGORY
      : form.categoria.trim();

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
      setError("El precio no es válido.");
      return;
    }

    if (
      !Number.isFinite(form.precioVenta) ||
      form.precioVenta < 0
    ) {
      setError(
        "El precio de venta no es válido.",
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

    let porcentajeLogistica: number;
    let porcentajeTransporte: number;

    try {
      porcentajeLogistica =
        percentageValue(
          form.porcentajeLogistica,
          "El porcentaje de logística",
        );

      porcentajeTransporte =
        percentageValue(
          form.porcentajeTransporte,
          "El porcentaje de transporte",
        );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Los porcentajes no son válidos.",
      );
      return;
    }

    if (!category) {
      setError(
        "Selecciona una categoría.",
      );
      return;
    }

    if (isCanasta) {
      if (!canastaPresentation) {
        setError(
          "Selecciona la presentación de la canasta.",
        );
        return;
      }

      if (canastaComponents.length === 0) {
        setError(
          "Agrega al menos un producto a la canasta.",
        );
        return;
      }

      if (
        canastaComponents.some(
          (item) =>
            !Number.isInteger(
              item.cantidad,
            ) ||
            item.cantidad <= 0,
        )
      ) {
        setError(
          "Las cantidades de los productos de la canasta deben ser mayores que cero.",
        );
        return;
      }
    } else {
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
    }

    if (!form.IdProductor.trim()) {
      setError(
        "Selecciona un productor del catálogo.",
      );
      return;
    }

    if (
      !producers.some(
        (producer) =>
          producer.id === form.IdProductor,
      )
    ) {
      setError(
        "El productor seleccionado no es válido.",
      );
      return;
    }

    if (!form.IdMunicipalidad.trim()) {
      setError(
        "Selecciona una municipalidad.",
      );
      return;
    }

    if (
      !municipalities.some(
        (municipality) =>
          municipality.id ===
          form.IdMunicipalidad,
      )
    ) {
      setError(
        "La municipalidad seleccionada no es válida.",
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
      const wasEditing = Boolean(editing);

      const unidad = isCanasta
        ? `1 x ${canastaPresentation}`
        : `${cantidad.trim()} x ${presentacion.trim()}`;

      const image =
        await processImage();

      uploadedNewPath =
        image.newStoragePath;

      const components = isCanasta
        ? canastaComponents
        : [];

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
          categoria: category,
          unidad,
          IdProductor:
            form.IdProductor.trim(),
          IdMunicipalidad:
            form.IdMunicipalidad.trim(),
          imgPath: image.imgPath,
          imageName: image.imageName,
          componentes: components,
          porcentajeLogistica,
          porcentajeTransporte,
          precio: isCanasta
            ? form.precioVenta
            : form.precio,
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
          : isCanasta
            ? "Canasta creada correctamente."
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
          // Ignorar.
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

  const edit = (product: Product) => {
    const { id, ...data } = product;

    const parsed = parseUnidad(
      product.unidad,
    );

    const productIsCanasta =
      product.categoria
        .trim()
        .toLowerCase() ===
      CANASTA_CATEGORY.toLowerCase();

    setEditing(id);

    setForm({
      ...empty,
      ...data,
      costoPcc: numberValue(
        product.costoPcc,
      ),
      porcentajeLogistica:
        numberValue(
          product.porcentajeLogistica,
        ),
      porcentajeTransporte:
        numberValue(
          product.porcentajeTransporte,
        ),
      precioSugerido:
        numberValue(
          product.precioSugerido,
        ),
      precioVenta:
        numberValue(
          product.precioVenta,
        ),
      componentes:
        product.componentes ?? [],
      IdProductor:
        product.IdProductor || "",
    });

    setIsCanasta(productIsCanasta);

    if (productIsCanasta) {
      setCanastaPresentation(
        parsed.presentacion ||
          "Grande",
      );

      setCanastaComponents(
        product.componentes ?? [],
      );

      setCantidad("1");
      setPresentacion(
        parsed.presentacion ||
          "Grande",
      );
    } else {
      setCantidad(parsed.cantidad);
      setPresentacion(
        parsed.presentacion,
      );
      setCanastaComponents([]);
    }

    setImageFile(null);

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
        `¿Eliminar "${product.nombre}"?\n\nEl producto será eliminado del catálogo.`,
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

      if (editing === product.id) {
        resetForm();
      }

      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(product.id);
        return next;
      });

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
  EDICIÓN GRUPAL
  ======================================================= */

  const openBulkEditor = () => {
    if (selectedIds.size === 0) {
      setError(
        "Selecciona al menos un producto.",
      );
      return;
    }

    setBulkChanges({
      ...emptyBulkChanges,
    });

    setBulkOpen(true);
    setError(null);
  };

  const executeBulkEdit = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    const changes: Record<
      string,
      unknown
    > = {};

    try {
      /* STOCK */
      if (bulkChanges.stock.trim()) {
        const stock = Number(
          bulkChanges.stock,
        );

        if (
          !Number.isInteger(stock) ||
          stock < 0
        ) {
          throw new Error(
            "El stock grupal debe ser un número entero mayor o igual a cero.",
          );
        }

        changes.stock = stock;
      }

      /* ESTADO */
      if (bulkChanges.activo !== "") {
        changes.activo =
          bulkChanges.activo === "true";
      }

      /* CATEGORÍA */
      if (bulkChanges.categoria.trim()) {
        changes.categoria =
          bulkChanges.categoria.trim();
      }

      /* UNIDAD */
      if (
        bulkChanges.cantidad.trim() ||
        bulkChanges.presentacion.trim()
      ) {
        changes.unidad =
          `${bulkChanges.cantidad.trim() || "1"} x ${
            bulkChanges.presentacion.trim() ||
            "Unidad"
          }`;
      }

      /* PRODUCTOR */
      if (bulkChanges.IdProductor) {
        changes.IdProductor =
          bulkChanges.IdProductor;
      }

      /* MUNICIPALIDAD */
      if (bulkChanges.IdMunicipalidad) {
        changes.IdMunicipalidad =
          bulkChanges.IdMunicipalidad;
      }

      /* PRECIO BASE */
      if (bulkChanges.precio.trim()) {
        const value = Number(
          bulkChanges.precio,
        );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          throw new Error(
            "El precio base no es válido.",
          );
        }

        changes.precio = value;
      }

      /* COSTO PCC */
      if (bulkChanges.costoPcc.trim()) {
        const value = Number(
          bulkChanges.costoPcc,
        );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          throw new Error(
            "El Costo PCC no es válido.",
          );
        }

        changes.costoPcc = value;
      }

      /* PRECIO SUGERIDO */
      if (
        bulkChanges.precioSugerido.trim()
      ) {
        const value = Number(
          bulkChanges.precioSugerido,
        );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          throw new Error(
            "El precio sugerido no es válido.",
          );
        }

        changes.precioSugerido = value;
      }

      /* PRECIO VENTA */
      if (bulkChanges.precioVenta.trim()) {
        const value = Number(
          bulkChanges.precioVenta,
        );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          throw new Error(
            "El precio de venta no es válido.",
          );
        }

        changes.precioVenta = value;
      }

      /*
       * LOGÍSTICA
       *
       * Modo porcentaje:
       * 10 o 10% -> 10%
       *
       * Modo fijo:
       * 5000 -> se convierte a:
       * (5000 / costoPcc) * 100
       */
      if (
        bulkChanges.porcentajeLogistica.trim()
      ) {
        const parsed =
          parseBulkCostValue(
            bulkChanges.porcentajeLogistica,
          );

        if (!parsed) {
          throw new Error(
            "El valor de logística no es válido.",
          );
        }

        if (
          bulkChanges.logisticaModo ===
          "porcentaje"
        ) {
          changes.porcentajeLogistica =
            percentageValue(
              parsed.value,
              "El porcentaje de logística",
            );
        } else {
          const selected =
            Array.from(selectedIds)
              .map((id) =>
                products.find(
                  (product) =>
                    product.id === id,
                ),
              )
              .filter(
                (
                  product,
                ): product is Product =>
                  Boolean(product),
              );

          const fixedValues =
            new Map<string, number>();

          for (const product of selected) {
            const percentage =
              fixedCostToPercentage(
                parsed.value,
                product.costoPcc,
                "El costo fijo de logística",
              );

            fixedValues.set(
              product.id,
              percentage,
            );
          }

          changes.__bulkLogisticaFija =
            Object.fromEntries(
              fixedValues,
            );
        }
      }

      /*
       * TRANSPORTE
       *
       * Igual que logística:
       * porcentaje o costo fijo COP.
       */
      if (
        bulkChanges.porcentajeTransporte.trim()
      ) {
        const parsed =
          parseBulkCostValue(
            bulkChanges.porcentajeTransporte,
          );

        if (!parsed) {
          throw new Error(
            "El valor de transporte no es válido.",
          );
        }

        if (
          bulkChanges.transporteModo ===
          "porcentaje"
        ) {
          changes.porcentajeTransporte =
            percentageValue(
              parsed.value,
              "El porcentaje de transporte",
            );
        } else {
          const selected =
            Array.from(selectedIds)
              .map((id) =>
                products.find(
                  (product) =>
                    product.id === id,
                ),
              )
              .filter(
                (
                  product,
                ): product is Product =>
                  Boolean(product),
              );

          const fixedValues =
            new Map<string, number>();

          for (const product of selected) {
            const percentage =
              fixedCostToPercentage(
                parsed.value,
                product.costoPcc,
                "El costo fijo de transporte",
              );

            fixedValues.set(
              product.id,
              percentage,
            );
          }

          changes.__bulkTransporteFijo =
            Object.fromEntries(
              fixedValues,
            );
        }
      }

      /*
       * No hay cambios simples.
       */
      const hasSpecialBulkChanges =
        "__bulkLogisticaFija" in changes ||
        "__bulkTransporteFijo" in changes;

      const normalChanges = {
        ...changes,
      };

      delete normalChanges.__bulkLogisticaFija;
      delete normalChanges.__bulkTransporteFijo;

      if (
        Object.keys(normalChanges).length ===
          0 &&
        !hasSpecialBulkChanges
      ) {
        throw new Error(
          "No hay cambios para aplicar. Completa al menos un campo.",
        );
      }

      setBusy(true);
      setError(null);
      setNotice(null);

      const ids =
        Array.from(selectedIds);

      /*
       * Aplicamos individualmente porque
       * los costos fijos dependen del Costo PCC
       * de cada producto.
       */
      for (const id of ids) {
        const individualChanges: Record<
          string,
          unknown
        > = {
          ...normalChanges,
        };

        if (
          changes.__bulkLogisticaFija
        ) {
          const values =
            changes.__bulkLogisticaFija as Record<
              string,
              number
            >;

          if (id in values) {
            individualChanges.porcentajeLogistica =
              values[id];
          }
        }

        if (
          changes.__bulkTransporteFijo
        ) {
          const values =
            changes.__bulkTransporteFijo as Record<
              string,
              number
            >;

          if (id in values) {
            individualChanges.porcentajeTransporte =
              values[id];
          }
        }

        await api(
          `/api/productos/${id}`,
          "PUT",
          individualChanges,
        );
      }

      setBulkConfirmOpen(false);
      setBulkOpen(false);

      setNotice(
        `${ids.length} producto${
          ids.length === 1 ? "" : "s"
        } actualizado${
          ids.length === 1 ? "" : "s"
        } correctamente.`,
      );

      await loadProducts();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible aplicar la edición grupal.",
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
        code: product.code,
        nombre: product.nombre,
        descripcion:
          product.descripcion,
        precio: product.precio,
        costoPcc:
          product.costoPcc,
        porcentajeLogistica:
          product.porcentajeLogistica,
        porcentajeTransporte:
          product.porcentajeTransporte,
        precioSugerido:
          product.precioSugerido,
        precioVenta:
          product.precioVenta,
        stock: product.stock,
        categoria:
          product.categoria,
        unidad: product.unidad,
        imgPath:
          product.imgPath,
        imageName:
          product.imageName,
        activo:
          product.activo,
        IdProductor:
          product.IdProductor,
        IdMunicipalidad:
          product.IdMunicipalidad,
        componentes:
          product.componentes
            ? JSON.stringify(
                product.componentes,
              )
            : "",
      }),
    );

    if (rows.length === 0) {
      rows.push({
        id: "",
        accion: "CREAR",
        ...empty,
        componentes: "",
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
          "accion: CREAR, ACTUALIZAR o ELIMINAR.",
        ],
        [
          "Para ACTUALIZAR o ELIMINAR conserva el id.",
        ],
        [
          "Código, nombre, precio y stock son obligatorios.",
        ],
        [
          "Todos los valores monetarios se manejan en COP.",
        ],
        [
          "costoPcc, precioSugerido y precioVenta son valores en COP.",
        ],
        [
          "porcentajeLogistica y porcentajeTransporte son porcentajes de 0 a 100.",
        ],
        [
          "activo puede ser TRUE o FALSE.",
        ],
        [
          "unidad utiliza el formato: 2 x Kg, 3 x Paquete, etc.",
        ],
        [
          "Una Canasta debe utilizar categoria = Canasta.",
        ],
        [
          "Una Canasta debe tener componentes en formato JSON.",
        ],
        [
          'Ejemplo componentes: [{"productoId":"ID_PRODUCTO","cantidad":2}]',
        ],
        [
          "Las presentaciones de Canasta son Grande, Mediana o Pequeña.",
        ],
        [
          "La unidad de una Canasta es 1 x Grande, 1 x Mediana o 1 x Pequeña.",
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

    if (!file) return;

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
          {
            rows,
          },
        );

      const data =
        result &&
        typeof result === "object" &&
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
  ACCESO
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
          Solo los administradores pueden
          gestionar el catálogo.
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
            Administra productos, costos,
            precios, inventario y canastas.
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
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-lg font-bold">
              {editing
                ? isCanasta
                  ? "Editar canasta"
                  : "Editar producto"
                : isCanasta
                  ? "Crear canasta"
                  : "Agregar producto"}
            </h2>

            <p className="mt-1 text-sm text-[var(--foreground)]/60">
              Los campos marcados con *
              son obligatorios.
            </p>
          </div>

          {!editing && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={isCanasta}
                onChange={(event) => {
                  const value =
                    event.target.checked;

                  setIsCanasta(value);

                  if (value) {
                    setForm((current) => ({
                      ...current,
                      categoria:
                        CANASTA_CATEGORY,
                      componentes: [],
                    }));

                    setCantidad("1");
                    setCanastaPresentation(
                      "Grande",
                    );
                    setPresentacion("Grande");
                  } else {
                    setForm((current) => ({
                      ...current,
                      categoria: "",
                      componentes: [],
                    }));

                    setCanastaComponents([]);
                    setCantidad("");
                    setPresentacion("");
                  }
                }}
              />

              Crear como Canasta
            </label>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Código *
            </label>

            <input
              required
              value={form.code}
              onChange={(event) =>
                set(
                  "code",
                  event.target.value,
                )
              }
              placeholder="Ej. AS0001"
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Nombre *
            </label>

            <input
              required
              value={form.nombre}
              onChange={(event) =>
                set(
                  "nombre",
                  event.target.value,
                )
              }
              placeholder={
                isCanasta
                  ? "Ej. Canasta Familiar"
                  : "Ej. Tomate Chonto"
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Precio base (COP)
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={form.precio}
              onChange={(event) =>
                set(
                  "precio",
                  Number(event.target.value),
                )
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Stock disponible *
            </label>

            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(event) =>
                set(
                  "stock",
                  Number(event.target.value),
                )
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Costo PCC (COP)
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={form.costoPcc}
              onChange={(event) =>
                set(
                  "costoPcc",
                  Number(event.target.value),
                )
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Logística (%)
            </label>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={
                form.porcentajeLogistica
              }
              onChange={(event) =>
                set(
                  "porcentajeLogistica",
                  Number(event.target.value),
                )
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Transporte (%)
            </label>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={
                form.porcentajeTransporte
              }
              onChange={(event) =>
                set(
                  "porcentajeTransporte",
                  Number(event.target.value),
                )
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Precio sugerido (COP)
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={
                form.precioSugerido
              }
              onChange={(event) =>
                set(
                  "precioSugerido",
                  Number(event.target.value),
                )
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Precio de venta (COP)
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={form.precioVenta}
              onChange={(event) =>
                set(
                  "precioVenta",
                  Number(event.target.value),
                )
              }
              className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

          {isCanasta ? (
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Categoría
              </label>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-sm font-semibold text-[var(--primary)]">
                Canasta
              </div>
            </div>
          ) : (
            <CatalogCombobox
              label="Categoría"
              value={form.categoria}
              options={categories}
              loading={loadingCatalogs}
              required
              placeholder="Buscar categoría..."
              onChange={(value) =>
                set("categoria", value)
              }
            />
          )}

          {isCanasta ? (
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Unidad
              </label>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-sm font-semibold">
                1
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Cantidad *
              </label>

              <input
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
                className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
              />
            </div>
          )}

          {isCanasta ? (
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Presentación *
              </label>

              <select
                required
                value={canastaPresentation}
                onChange={(event) =>
                  setCanastaPresentation(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm"
              >
                {CANASTA_PRESENTATIONS.map(
                  (option) => (
                    <option
                      key={option.id}
                      value={option.id}
                    >
                      {option.nombre}
                    </option>
                  ),
                )}
              </select>
            </div>
          ) : (
            <CatalogCombobox
              label="Presentación"
              value={presentacion}
              options={presentations}
              loading={loadingCatalogs}
              required
              placeholder="Buscar presentación..."
              onChange={(value) =>
                setPresentacion(value)
              }
            />
          )}

          <CatalogCombobox
            label="Productor"
            value={form.IdProductor}
            options={producers}
            loading={loadingCatalogs}
            required
            requireSelection
            placeholder="Buscar productor..."
            onChange={(value) =>
              set("IdProductor", value)
            }
          />

          <CatalogCombobox
            label="Municipalidad"
            value={form.IdMunicipalidad}
            options={municipalities}
            loading={loadingCatalogs}
            required
            requireSelection
            placeholder="Buscar municipio..."
            onChange={(value) =>
              set(
                "IdMunicipalidad",
                value,
              )
            }
          />

          {isCanasta && (
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold">
                  Productos de la canasta
                </h3>

                <p className="mt-1 text-xs text-[var(--foreground)]/60">
                  Selecciona productos
                  existentes y define sus
                  cantidades.
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--border)]">
                {products.filter(
                  (product) =>
                    product.id !== editing,
                ).length === 0 ? (
                  <div className="p-5 text-center text-sm text-[var(--foreground)]/60">
                    No hay productos disponibles.
                  </div>
                ) : (
                  products
                    .filter(
                      (product) =>
                        product.id !== editing,
                    )
                    .map((product) => {
                      const component =
                        canastaComponents.find(
                          (item) =>
                            item.productoId ===
                            product.id,
                        );

                      return (
                        <div
                          key={product.id}
                          className="flex flex-col gap-3 border-b border-[var(--border)] p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(
                                component,
                              )}
                              onChange={() =>
                                toggleCanastaComponent(
                                  product.id,
                                )
                              }
                            />

                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">
                                {product.nombre}
                              </span>

                              <span className="block text-xs text-[var(--foreground)]/55">
                                {product.code} ·{" "}
                                {formatPrice(
                                  product.precioVenta ||
                                    product.precio,
                                )}
                              </span>
                            </span>
                          </label>

                          {component && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-semibold">
                                Cantidad
                              </label>

                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={
                                  component.cantidad
                                }
                                onChange={(event) =>
                                  setCanastaQuantity(
                                    product.id,
                                    Number(
                                      event.target.value,
                                    ),
                                  )
                                }
                                className="w-24 rounded-lg border border-[var(--border)] p-2 text-sm"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1.5 block text-sm font-semibold">
              Imagen del producto
            </label>

            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt={
                      form.nombre
                        ? `Imagen de ${form.nombre}`
                        : "Vista previa"
                    }
                    className="h-full max-h-[220px] w-full object-contain p-3"
                    onError={() => {
                      setImagePreviewUrl(null);
                      setError(
                        "No fue posible cargar la imagen del producto.",
                      );
                    }}
                  />
                ) : (
                  <div className="text-center text-sm text-[var(--foreground)]/50">
                    Sin imagen
                  </div>
                )}

                {imageFile && (
                  <div className="absolute left-2 top-2 rounded-full bg-[var(--primary)] px-2.5 py-1 text-[10px] font-bold text-white shadow">
                    NUEVA IMAGEN
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="product-image"
                  className="flex min-h-[90px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[var(--primary)] bg-[var(--secondary)]/40 px-4 text-center"
                >
                  <div>
                    <div className="text-sm font-bold text-[var(--primary)]">
                      {imageFile
                        ? "Cambiar imagen"
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
                  className="mb-1.5 mt-4 block text-xs font-semibold"
                >
                  Nombre del archivo
                </label>

                <input
                  id="image-name"
                  type="text"
                  value={form.imageName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      imageName:
                        event.target.value,
                    }))
                  }
                  placeholder="Ej. tomate-chonto"
                  disabled={busy}
                  className="w-full rounded-xl border border-[var(--border)] p-3 text-sm"
                />

                {imageFile && (
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
                )}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1.5 block text-sm font-semibold">
              Descripción
            </label>

            <textarea
              rows={4}
              value={form.descripcion}
              onChange={(event) =>
                set(
                  "descripcion",
                  event.target.value,
                )
              }
              placeholder="Describe brevemente el producto..."
              className="w-full resize-y rounded-lg border border-[var(--border)] p-2.5 text-sm"
            />
          </div>

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
              Producto activo y visible en
              la tienda
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "Guardando..."
              : editing
                ? "Guardar cambios"
                : isCanasta
                  ? "Crear canasta"
                  : "Crear producto"}
          </button>

          {editing && (
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium"
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      {/* ===================================================
          FILTROS
      =================================================== */}

      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold">
              Catálogo
            </h2>

            <p className="text-sm text-[var(--foreground)]/60">
              {filteredProducts.length} resultado
              {filteredProducts.length === 1
                ? ""
                : "s"} visibles.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar por código, producto, productor..."
              className="rounded-lg border border-[var(--border)] p-2.5 text-sm lg:col-span-2"
            />

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value,
                )
              }
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm"
            >
              <option value="">
                Todas las categorías
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.nombre}
                </option>
              ))}
            </select>

            <select
              value={producerFilter}
              onChange={(event) =>
                setProducerFilter(
                  event.target.value,
                )
              }
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm"
            >
              <option value="">
                Todos los productores
              </option>

              {producers.map((producer) => (
                <option
                  key={producer.id}
                  value={producer.id}
                >
                  {producer.nombre}
                </option>
              ))}
            </select>

            <select
              value={municipalityFilter}
              onChange={(event) =>
                setMunicipalityFilter(
                  event.target.value,
                )
              }
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm"
            >
              <option value="">
                Todas las municipalidades
              </option>

              {municipalities.map(
                (municipality) => (
                  <option
                    key={municipality.id}
                    value={municipality.id}
                  >
                    {municipality.nombre}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | ""
                    | "active"
                    | "inactive",
                )
              }
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="">
                Todos los estados
              </option>

              <option value="active">
                Activos
              </option>

              <option value="inactive">
                Inactivos
              </option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
            >
              Limpiar filtros
            </button>

            <button
              type="button"
              onClick={selectVisible}
              disabled={
                filteredProducts.length === 0
              }
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Seleccionar visibles
            </button>

            <button
              type="button"
              onClick={clearSelection}
              disabled={
                selectedIds.size === 0
              }
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
            >
              Limpiar selección
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedOnly(
                  (current) => !current,
                )
              }
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                selectedOnly
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)]"
              }`}
            >
              {selectedOnly
                ? "Mostrar todos"
                : "Solo seleccionados"}
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--primary)]/20 bg-[var(--secondary)] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--primary)]">
                  {selectedIds.size} producto
                  {selectedIds.size === 1
                    ? ""
                    : "s"} seleccionado
                  {selectedIds.size === 1
                    ? ""
                    : "s"}
                </p>

                <p className="text-xs text-[var(--foreground)]/60">
                  La selección se conserva
                  aunque cambies los filtros.
                </p>
              </div>

              <button
                type="button"
                onClick={openBulkEditor}
                disabled={busy}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Edición grupal
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================
          TABLA
      =================================================== */}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full min-w-[1250px] text-left text-sm">
          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="w-12 px-3 py-3">
                <input
                  type="checkbox"
                  checked={
                    filteredProducts.length > 0 &&
                    filteredProducts.every(
                      (product) =>
                        selectedIds.has(
                          product.id,
                        ),
                    )
                  }
                  onChange={(event) => {
                    if (
                      event.target.checked
                    ) {
                      selectVisible();
                    } else {
                      setSelectedIds(
                        (current) => {
                          const next =
                            new Set(
                              current,
                            );

                          filteredProducts.forEach(
                            (product) => {
                              next.delete(
                                product.id,
                              );
                            },
                          );

                          return next;
                        },
                      );
                    }
                  }}
                  aria-label="Seleccionar visibles"
                />
              </th>

              <th className="px-3 py-3">
                Código
              </th>

              <th className="px-3 py-3">
                Producto
              </th>

              <th className="px-3 py-3">
                Costo PCC
              </th>

              <th className="px-3 py-3">
                Precio sugerido
              </th>

              <th className="px-3 py-3">
                Precio venta
              </th>

              <th className="px-3 py-3">
                Stock
              </th>

              <th className="px-3 py-3">
                Estado
              </th>

              <th className="px-3 py-3">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {loadingProducts ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-[var(--foreground)]/60"
                >
                  Cargando productos...
                </td>
              </tr>
            ) : filteredProducts.length ===
              0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-[var(--foreground)]/60"
                >
                  No hay productos que
                  coincidan con los filtros.
                </td>
              </tr>
            ) : (
              filteredProducts.map(
                (product) => {
                  const producer =
                    producers.find(
                      (item) =>
                        item.id ===
                        product.IdProductor,
                    );

                  const municipality =
                    municipalities.find(
                      (item) =>
                        item.id ===
                        product.IdMunicipalidad,
                    );

                  const isSelected =
                    selectedIds.has(
                      product.id,
                    );

                  const isProductCanasta =
                    product.categoria
                      .trim()
                      .toLowerCase() ===
                    CANASTA_CATEGORY.toLowerCase();

                  return (
                    <tr
                      key={product.id}
                      className={`border-t border-[var(--border)] ${
                        isSelected
                          ? "bg-[var(--secondary)]/30"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            isSelected
                          }
                          onChange={() =>
                            toggleSelected(
                              product.id,
                            )
                          }
                        />
                      </td>

                      <td className="px-3 py-3 font-medium">
                        {product.code}
                      </td>

                      <td className="px-3 py-3">
                        <p className="font-semibold">
                          {product.nombre}
                        </p>

                        <p className="text-xs text-[var(--foreground)]/60">
                          {isProductCanasta
                            ? "Canasta"
                            : product.categoria ||
                              "Sin categoría"}
                        </p>

                        <p className="text-xs text-[var(--foreground)]/50">
                          {product.unidad}
                        </p>

                        <p className="text-xs text-[var(--foreground)]/50">
                          Productor:{" "}
                          {producer
                            ? producer.nombre
                            : "No asignado"}
                        </p>

                        <p className="text-xs text-[var(--foreground)]/50">
                          Municipio:{" "}
                          {municipality
                            ? municipality.nombre
                            : "No asignado"}
                        </p>

                        {isProductCanasta &&
                          product.componentes
                            ?.length > 0 && (
                            <p className="mt-1 text-xs font-semibold text-[var(--primary)]">
                              {
                                product
                                  .componentes
                                  .length
                              }{" "}
                              producto
                              {product
                                .componentes
                                .length === 1
                                ? ""
                                : "s"}{" "}
                              incluidos
                            </p>
                          )}
                      </td>

                      <td className="px-3 py-3">
                        {formatPrice(
                          product.costoPcc,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {formatPrice(
                          product.precioSugerido,
                        )}
                      </td>

                      <td className="px-3 py-3 font-semibold">
                        {formatPrice(
                          product.precioVenta ||
                            product.precio,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {product.stock}
                      </td>

                      <td className="px-3 py-3">
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

                      <td className="px-3 py-3">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              edit(product)
                            }
                            className="font-semibold text-[var(--primary)]"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              remove(product)
                            }
                            className="font-semibold text-red-600"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                },
              )
            )}
          </tbody>
        </table>
      </div>

      {/* ===================================================
          MODAL EDICIÓN GRUPAL
      =================================================== */}

      {bulkOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Edición grupal
                </h2>

                <p className="mt-1 text-sm text-[var(--foreground)]/60">
                  Modificarás{" "}
                  <strong>
                    {selectedIds.size}
                  </strong>{" "}
                  producto
                  {selectedIds.size === 1
                    ? ""
                    : "s"}.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setBulkOpen(false)
                }
                className="text-xl text-[var(--foreground)]/50"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Los campos vacíos no modifican
              los productos seleccionados.
              Los valores monetarios están en
              COP.
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {/* STOCK */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    bulkChanges.stock
                  }
                  onChange={(event) =>
                    setBulkChanges(
                      (current) => ({
                        ...current,
                        stock:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Sin cambio"
                  className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
                />
              </div>

              {/* ESTADO */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Estado
                </label>

                <select
                  value={
                    bulkChanges.activo
                  }
                  onChange={(event) =>
                    setBulkChanges(
                      (current) => ({
                        ...current,
                        activo:
                          event.target.value as
                            | ""
                            | "true"
                            | "false",
                      }),
                    )
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm"
                >
                  <option value="">
                    Sin cambio
                  </option>

                  <option value="true">
                    Activo
                  </option>

                  <option value="false">
                    Inactivo
                  </option>
                </select>
              </div>

              {/* PRECIO BASE */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Precio base (COP)
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    bulkChanges.precio
                  }
                  onChange={(event) =>
                    setBulkChanges(
                      (current) => ({
                        ...current,
                        precio:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Sin cambio"
                  className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
                />
              </div>

              {/* COSTO PCC */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Costo PCC (COP)
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    bulkChanges.costoPcc
                  }
                  onChange={(event) =>
                    setBulkChanges(
                      (current) => ({
                        ...current,
                        costoPcc:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Sin cambio"
                  className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
                />
              </div>

              {/* LOGÍSTICA */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Logística
                </label>

                <div className="flex gap-2">
                  <select
                    value={
                      bulkChanges.logisticaModo
                    }
                    onChange={(event) =>
                      setBulkChanges(
                        (current) => ({
                          ...current,
                          logisticaModo:
                            event.target.value as
                              | "porcentaje"
                              | "fijo",
                        }),
                      )
                    }
                    className="w-32 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm"
                  >
                    <option value="porcentaje">
                      %
                    </option>

                    <option value="fijo">
                      COP
                    </option>
                  </select>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      bulkChanges.porcentajeLogistica
                    }
                    onChange={(event) =>
                      setBulkChanges(
                        (current) => ({
                          ...current,
                          porcentajeLogistica:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder={
                      bulkChanges.logisticaModo ===
                      "fijo"
                        ? "Ej. 5000"
                        : "Ej. 10"
                    }
                    className="min-w-0 flex-1 rounded-lg border border-[var(--border)] p-2.5 text-sm"
                  />
                </div>

                <p className="mt-1 text-[11px] text-[var(--foreground)]/55">
                  {bulkChanges.logisticaModo ===
                  "fijo"
                    ? "El costo fijo se convierte a porcentaje según el Costo PCC de cada producto."
                    : "Acepta 10 o 10%."}
                </p>
              </div>

              {/* TRANSPORTE */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Transporte
                </label>

                <div className="flex gap-2">
                  <select
                    value={
                      bulkChanges.transporteModo
                    }
                    onChange={(event) =>
                      setBulkChanges(
                        (current) => ({
                          ...current,
                          transporteModo:
                            event.target.value as
                              | "porcentaje"
                              | "fijo",
                        }),
                      )
                    }
                    className="w-32 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-sm"
                  >
                    <option value="porcentaje">
                      %
                    </option>

                    <option value="fijo">
                      COP
                    </option>
                  </select>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      bulkChanges.porcentajeTransporte
                    }
                    onChange={(event) =>
                      setBulkChanges(
                        (current) => ({
                          ...current,
                          porcentajeTransporte:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder={
                      bulkChanges.transporteModo ===
                      "fijo"
                        ? "Ej. 3000"
                        : "Ej. 5"
                    }
                    className="min-w-0 flex-1 rounded-lg border border-[var(--border)] p-2.5 text-sm"
                  />
                </div>

                <p className="mt-1 text-[11px] text-[var(--foreground)]/55">
                  {bulkChanges.transporteModo ===
                  "fijo"
                    ? "El costo fijo se convierte a porcentaje según el Costo PCC de cada producto."
                    : "Acepta 5 o 5%."}
                </p>
              </div>

              {/* PRECIO SUGERIDO */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Precio sugerido (COP)
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    bulkChanges.precioSugerido
                  }
                  onChange={(event) =>
                    setBulkChanges(
                      (current) => ({
                        ...current,
                        precioSugerido:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Sin cambio"
                  className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
                />
              </div>

              {/* PRECIO VENTA */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Precio de venta (COP)
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    bulkChanges.precioVenta
                  }
                  onChange={(event) =>
                    setBulkChanges(
                      (current) => ({
                        ...current,
                        precioVenta:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Sin cambio"
                  className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
                />
              </div>

              {/* CATEGORÍA */}
              <CatalogCombobox
                label="Categoría"
                value={
                  bulkChanges.categoria
                }
                options={categories}
                loading={loadingCatalogs}
                placeholder="Sin cambio"
                onChange={(value) =>
                  setBulkChanges(
                    (current) => ({
                      ...current,
                      categoria: value,
                    }),
                  )
                }
              />

              {/* CANTIDAD */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Cantidad de unidad
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    bulkChanges.cantidad
                  }
                  onChange={(event) =>
                    setBulkChanges(
                      (current) => ({
                        ...current,
                        cantidad:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Sin cambio"
                  className="w-full rounded-lg border border-[var(--border)] p-2.5 text-sm"
                />
              </div>

              {/* PRESENTACIÓN */}
              <CatalogCombobox
                label="Presentación"
                value={
                  bulkChanges.presentacion
                }
                options={presentations}
                loading={loadingCatalogs}
                placeholder="Sin cambio"
                onChange={(value) =>
                  setBulkChanges(
                    (current) => ({
                      ...current,
                      presentacion: value,
                    }),
                  )
                }
              />

              {/* PRODUCTOR */}
              <CatalogCombobox
                label="Productor"
                value={
                  bulkChanges.IdProductor
                }
                options={producers}
                loading={loadingCatalogs}
                requireSelection
                placeholder="Sin cambio"
                onChange={(value) =>
                  setBulkChanges(
                    (current) => ({
                      ...current,
                      IdProductor: value,
                    }),
                  )
                }
              />

              {/* MUNICIPALIDAD */}
              <CatalogCombobox
                label="Municipalidad"
                value={
                  bulkChanges.IdMunicipalidad
                }
                options={municipalities}
                loading={loadingCatalogs}
                requireSelection
                placeholder="Sin cambio"
                onChange={(value) =>
                  setBulkChanges(
                    (current) => ({
                      ...current,
                      IdMunicipalidad:
                        value,
                    }),
                  )
                }
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setBulkOpen(false)
                }
                disabled={busy}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  setBulkConfirmOpen(true)
                }
                disabled={busy}
                className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          CONFIRMACIÓN
      =================================================== */}

      {bulkConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
            <h2 className="text-xl font-bold">
              Confirmar cambios
            </h2>

            <p className="mt-3 text-sm text-[var(--foreground)]/70">
              Estás a punto de modificar{" "}
              <strong>
                {selectedIds.size}
              </strong>{" "}
              producto
              {selectedIds.size === 1
                ? ""
                : "s"}.
            </p>

            <p className="mt-2 text-sm text-[var(--foreground)]/70">
              Los campos vacíos se
              conservarán sin cambios.
            </p>

            <p className="mt-3 rounded-lg bg-[var(--surface)] p-3 text-xs text-[var(--foreground)]/70">
              Si Logística o Transporte
              están en modo COP, el valor
              fijo será convertido a
              porcentaje usando el Costo PCC
              individual de cada producto.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setBulkConfirmOpen(
                    false,
                  )
                }
                disabled={busy}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={executeBulkEdit}
                disabled={busy}
                className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? "Aplicando..."
                  : "Confirmar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}