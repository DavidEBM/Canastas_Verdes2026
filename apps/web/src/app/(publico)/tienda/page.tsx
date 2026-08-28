"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import ProductGrid from "@/components/tienda/ProductGrid";
import type { Product } from "@/services/productos.service";
import {
  useCart,
  type CartProduct,
} from "@/hooks/useCart";

/* =========================================================
   Tipos
========================================================= */

interface Category {
  id: string;
  nombre: string;
}

interface Municipality {
  id: string;
  nombre: string;
}

/* =========================================================
   Conversión Product → CartProduct
========================================================= */

function productToCartProduct(
  product: Product,
): CartProduct {
  return {
    id: product.id,
    code: product.code,
    nombre: product.nombre,
    descripcion: product.descripcion,
    precio: product.precio,
    stock: product.stock,
    categoria: product.categoria,
    unidad: product.unidad,
    imgPath: product.imgPath,
    imageName: product.imageName,
    activo: product.activo,
    IdGranja: product.IdGranja,
    IdMunicipalidad:
      product.IdMunicipalidad,
    fechaCreacion:
      product.fechaCreacion,
    ultimaActualizacion:
      product.ultimaActualizacion,
    fechaCierre:
      product.fechaCierre,
  };
}

/* =========================================================
   Página Tienda
========================================================= */

export default function TiendaPage() {
  /* =======================================================
     Estado
  ======================================================= */

  const [products, setProducts] =
    useState<CartProduct[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("all");

  const [municipality, setMunicipality] =
    useState("all");

  const [stockFilter, setStockFilter] =
    useState<
      "all" | "available" | "no-stock"
    >("all");

  /* =======================================================
     Carrito
  ======================================================= */

  const { openCart } =
    useCart();

  /* =======================================================
     Cargar productos
  ======================================================= */

  const loadProducts =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "/api/productos",
        );

        const result: unknown =
          await response.json();

        if (
          !response.ok ||
          !result ||
          typeof result !== "object" ||
          !("data" in result) ||
          !Array.isArray(result.data)
        ) {
          throw new Error(
            "No fue posible obtener los productos.",
          );
        }

        const data = result.data as Product[];

        const cartProducts =
          data.map(
            productToCartProduct,
          );

        setProducts(
          cartProducts,
        );
      } catch (err) {
        console.error(
          "Error cargando productos:",
          err,
        );

        setError(
          "No fue posible cargar los productos. Intenta nuevamente.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /* =======================================================
     Cargar al entrar
  ======================================================= */

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  /* =======================================================
     Actualizar cuando vuelve a la pestaña
  ======================================================= */

  useEffect(() => {
    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadProducts();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [loadProducts]);

  /* =======================================================
     Categorías

     Actualmente se obtienen de los productos.
     Posteriormente se reemplazará por la colección
     "categorias" de Firebase.
  ======================================================= */

  const categories =
    useMemo(() => {
      const values =
        new Set<string>();

      products.forEach(
        (product) => {
          if (
            product.categoria
          ) {
            values.add(
              product.categoria,
            );
          }
        },
      );

      return Array.from(
        values,
      ).sort((a, b) =>
        a.localeCompare(b),
      );
    }, [products]);

  /* =======================================================
     Municipalidades

     Actualmente se obtienen de los productos.
     Posteriormente se reemplazará por la colección
     "municipalidades" de Firebase.
  ======================================================= */

  const municipalities =
    useMemo(() => {
      const values =
        new Set<string>();

      products.forEach(
        (product) => {
          if (
            product.IdMunicipalidad
          ) {
            values.add(
              product.IdMunicipalidad,
            );
          }
        },
      );

      return Array.from(
        values,
      ).sort((a, b) =>
        a.localeCompare(b),
      );
    }, [products]);

  /* =======================================================
     Filtrar productos
  ======================================================= */

  const filteredProducts =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return products.filter(
        (product) => {
          /* ==============================================
             Búsqueda
          ============================================== */

          if (
            normalizedSearch
          ) {
            /*
             * Declaramos explícitamente que todos
             * estos valores son strings.
             *
             * Esto evita:
             *
             * "value is possibly undefined"
             */

            const searchableFields: string[] =
              [
                product.nombre,
                product.descripcion,
                product.code,
                product.categoria,
                product.unidad,
              ];

            const matchesSearch =
              searchableFields.some(
                (value) =>
                  value
                    .toLowerCase()
                    .includes(
                      normalizedSearch,
                    ),
              );

            if (
              !matchesSearch
            ) {
              return false;
            }
          }

          /* ==============================================
             Categoría
          ============================================== */

          if (
            category !==
              "all" &&
            product.categoria !==
              category
          ) {
            return false;
          }

          /* ==============================================
             Municipalidad
          ============================================== */

          if (
            municipality !==
              "all" &&
            product.IdMunicipalidad !==
              municipality
          ) {
            return false;
          }

          /* ==============================================
             Stock disponible
          ============================================== */

          if (
            stockFilter ===
              "available" &&
            product.stock <= 0
          ) {
            return false;
          }

          /* ==============================================
             Sin stock
          ============================================== */

          if (
            stockFilter ===
              "no-stock" &&
            product.stock > 0
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      products,
      search,
      category,
      municipality,
      stockFilter,
    ]);

  /* =======================================================
     Limpiar filtros
  ======================================================= */

  const clearFilters =
    () => {
      setSearch("");
      setCategory("all");
      setMunicipality("all");
      setStockFilter("all");
    };

  /* =======================================================
     Comprobar filtros activos
  ======================================================= */

  const hasFilters =
    search.trim() !== "" ||
    category !== "all" ||
    municipality !== "all" ||
    stockFilter !== "all";

  /* =======================================================
     Render
  ======================================================= */

  return (
    <main className="min-h-dvh bg-[var(--background)]">
      {/* ==================================================
          HERO
      ================================================== */}

      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 bg-[var(--surface)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
              Productos del campo
            </span>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
              Compra productos
              <span className="text-[var(--primary)]">
                {" "}
                frescos
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              Encuentra frutas,
              verduras y productos
              provenientes del campo
              directamente en nuestra
              tienda.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================
          CONTENIDO TIENDA
      ================================================== */}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =================================================
            BUSCADOR
        ================================================= */}

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
              />

              <path d="m21 21-4.3-4.3" />
            </svg>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar productos, categorías o código..."
              className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />
          </div>

          {/* =================================================
              CESTA
          ================================================= */}

          <button
            type="button"
            onClick={openCart}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
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
              aria-hidden="true"
            >
              <circle
                cx="9"
                cy="20"
                r="1"
              />

              <circle
                cx="19"
                cy="20"
                r="1"
              />

              <path d="M3 4h2l2.4 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
            </svg>

            Ver mi cesta
          </button>
        </div>

        {/* =================================================
            FILTROS
        ================================================= */}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Categoría */}

          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value,
              )
            }
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          >
            <option value="all">
              Todas las categorías
            </option>

            {categories.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ),
            )}
          </select>

          {/* Municipalidad */}

          <select
            value={municipality}
            onChange={(event) =>
              setMunicipality(
                event.target.value,
              )
            }
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          >
            <option value="all">
              Todas las ubicaciones
            </option>

            {municipalities.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ),
            )}
          </select>

          {/* Stock */}

          <select
            value={stockFilter}
            onChange={(event) =>
              setStockFilter(
                event.target
                  .value as
                  | "all"
                  | "available"
                  | "no-stock",
              )
            }
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          >
            <option value="all">
              Todos
            </option>

            <option value="available">
              Disponibles
            </option>

            <option value="no-stock">
              Sin stock
            </option>
          </select>

          {/* Limpiar */}

          <button
            type="button"
            disabled={!hasFilters}
            onClick={clearFilters}
            className="h-11 rounded-lg border border-[var(--border)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpiar filtros
          </button>
        </div>

        {/* =================================================
            INFORMACIÓN DE RESULTADOS
        ================================================= */}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Productos
            </h2>

            {!loading && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {filteredProducts.length}{" "}
                {filteredProducts.length ===
                1
                  ? "producto encontrado"
                  : "productos encontrados"}
              </p>
            )}
          </div>

          {/* Actualizar */}

          <button
            type="button"
            onClick={() =>
              void loadProducts()
            }
            disabled={loading}
            className="self-start rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50 sm:self-auto"
          >
            {loading
              ? "Actualizando..."
              : "Actualizar productos"}
          </button>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{error}</p>

              <button
                type="button"
                onClick={() =>
                  void loadProducts()
                }
                className="self-start rounded-md bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm sm:self-auto"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* =================================================
            PRODUCTOS
        ================================================= */}

        <div className="mt-6">
          <ProductGrid
            products={
              filteredProducts
            }
            loading={loading}
            emptyMessage={
              hasFilters
                ? "No encontramos productos que coincidan con los filtros seleccionados."
                : "Actualmente no hay productos disponibles en la tienda."
            }
          />
        </div>
      </section>
    </main>
  );
}
