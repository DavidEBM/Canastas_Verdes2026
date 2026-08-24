"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export interface Product {
  name: string;
  location: string;
  price: number;
  unit: string;
  category: string;
  image: string;
}

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [priceRange, setPriceRange] = useState("todos");
  const [sort, setSort] = useState("default");

  const categories = useMemo(() => {
    return [
      "Todas",
      ...Array.from(new Set(products.map((product) => product.category))),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        searchValue === "" ||
        product.name.toLowerCase().includes(searchValue) ||
        product.location.toLowerCase().includes(searchValue) ||
        product.category.toLowerCase().includes(searchValue);

      const matchesCategory =
        category === "Todas" || product.category === category;

      let matchesPrice = true;

      if (priceRange === "under5000") {
        matchesPrice = product.price < 5000;
      }

      if (priceRange === "5000-10000") {
        matchesPrice = product.price >= 5000 && product.price <= 10000;
      }

      if (priceRange === "over10000") {
        matchesPrice = product.price > 10000;
      }

      return matchesSearch && matchesCategory && matchesPrice;
    });

    if (sort === "price-low") {
      result = [...result].sort((a, b) => a.price - b.price);
    }

    if (sort === "price-high") {
      result = [...result].sort((a, b) => b.price - a.price);
    }

    if (sort === "name") {
      result = [...result].sort((a, b) =>
        a.name.localeCompare(b.name, "es"),
      );
    }

    return result;
  }, [products, search, category, priceRange, sort]);

  const clearFilters = () => {
    setSearch("");
    setCategory("Todas");
    setPriceRange("todos");
    setSort("default");
  };

  return (
    <div>
      {/* FILTROS */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        {/* BUSQUEDA */}
        <div className="relative">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar productos..."
            className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 pr-12 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />

          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        {/* CATEGORIA */}
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-12 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item === "Todas" ? "Todas las categorías" : item}
            </option>
          ))}
        </select>

        {/* PRECIO */}
        <select
          value={priceRange}
          onChange={(event) => setPriceRange(event.target.value)}
          className="h-12 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
        >
          <option value="todos">Rango de precio</option>
          <option value="under5000">Menos de $5.000</option>
          <option value="5000-10000">$5.000 - $10.000</option>
          <option value="over10000">Más de $10.000</option>
        </select>

        {/* ORDEN */}
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="h-12 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
        >
          <option value="default">Ordenar por</option>
          <option value="price-low">Precio menor</option>
          <option value="price-high">Precio mayor</option>
          <option value="name">Nombre A-Z</option>
        </select>

        {/* LIMPIAR */}
        <button
          type="button"
          onClick={clearFilters}
          className="h-12 rounded-[var(--radius-md)] border border-[var(--primary)] px-5 text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white"
        >
          Limpiar
        </button>
      </div>

      {/* RESULTADOS */}
      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">
            {filteredProducts.length}
          </span>{" "}
          {filteredProducts.length === 1
            ? "producto encontrado"
            : "productos encontrados"}
        </p>

        {(search || category !== "Todas" || priceRange !== "todos") && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            Restablecer filtros
          </button>
        )}
      </div>

      {/* GRID */}
      {filteredProducts.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {filteredProducts.map((product) => (
            <article
              key={product.name}
              className="group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-square overflow-hidden bg-[var(--surface)]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              </div>

              <div className="p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                  {product.category}
                </span>

                <h3 className="mt-1 font-bold text-[var(--foreground)]">
                  {product.name}
                </h3>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {product.location}
                </p>

                <div className="mt-4">
                  <p className="text-lg font-bold text-[var(--foreground)]">
                    ${product.price.toLocaleString("es-CO")}
                  </p>

                  <p className="text-xs text-[var(--muted)]">
                    {product.unit}
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--primary)] px-3 py-2 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white"
                >
                  🛒 Agregar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
          <div className="text-4xl">🌱</div>

          <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
            No encontramos productos
          </h3>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Intenta cambiar los filtros o realizar una búsqueda diferente.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#18572f]"
          >
            Ver todos los productos
          </button>
        </div>
      )}
    </div>
  );
}