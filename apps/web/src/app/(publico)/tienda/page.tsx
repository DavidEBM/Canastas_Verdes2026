import Image from "next/image";
import Link from "next/link";
import ProductGrid from "@/components/tienda/ProductGrid";
import type { Product } from "@/components/tienda/ProductGrid";

const categories = [
  {
    name: "Frutas",
    icon: "🍎",
  },
  {
    name: "Verduras",
    icon: "🥦",
  },
  {
    name: "Tubérculos",
    icon: "🥔",
  },
  {
    name: "Hierbas",
    icon: "🌿",
  },
  {
    name: "Granos",
    icon: "🌾",
  },
  {
    name: "Productos del campo",
    icon: "🌱",
  },
  {
    name: "Comidas del campo",
    icon: "🍲",
  },
];

const products: Product[] = [
  {
    name: "Limón Tahití",
    location: "Valle del Cauca",
    price: 3500,
    unit: "por kg",
    category: "Frutas",
    image: "/images/products/limon-tahiti.webp",
  },
  {
    name: "Aguacate",
    location: "Antioquia",
    price: 6200,
    unit: "por kg",
    category: "Frutas",
    image: "/images/products/aguacate.webp",
  },
  {
    name: "Tomate Chonto",
    location: "Cundinamarca",
    price: 3800,
    unit: "por kg",
    category: "Verduras",
    image: "/images/products/tomate-chonto.webp",
  },
  {
    name: "Zanahoria",
    location: "Boyacá",
    price: 2500,
    unit: "por kg",
    category: "Verduras",
    image: "/images/products/zanahoria.webp",
  },
  {
    name: "Papa Criolla",
    location: "Nariño",
    price: 2900,
    unit: "por kg",
    category: "Tubérculos",
    image: "/images/products/papa-criolla.jpg",
  },
  {
    name: "Huevos Campesinos",
    location: "Finca local",
    price: 11000,
    unit: "por docena",
    category: "Productos del campo",
    image: "/images/products/huevos-campesinos.webp",
  },
];
export default function TiendaPage() {
  return (
    <main className="bg-white">
      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative min-h-[620px] overflow-hidden">
        <Image
          src="/images/backgrounds/hero-tienda.webp"
          alt="Productos frescos del campo"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-[rgb(23_53_31_/_72%)]" />

        <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <span className="inline-flex items-center rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-bold uppercase tracking-wider">
              🌿 Tienda Canastas Verdes
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Productos del campo,
              <br />
              <span className="text-[var(--secondary)]">
                frescos para ti
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
              Encuentra frutas, verduras y alimentos del campo seleccionados
              especialmente para tu hogar.
            </p>

            <Link
              href="#productos"
              className="mt-8 inline-flex rounded-[var(--radius-md)] bg-[var(--primary)] border-2 border-white/50 px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#18572f]"
            >
              🌿 Ver productos
            </Link>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl backdrop-blur">
                  🌿
                </div>

                <div>
                  <p className="font-bold">100% Frescos</p>
                  <p className="text-xs text-white/70">
                    Productos seleccionados.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl backdrop-blur">
                  🚚
                </div>

                <div>
                  <p className="font-bold">Entrega rápida</p>
                  <p className="text-xs text-white/70">
                    Hasta tu hogar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl backdrop-blur">
                  🛡️
                </div>

                <div>
                  <p className="font-bold">Pago seguro</p>
                  <p className="text-xs text-white/70">
                    Métodos confiables.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BUSCADOR Y FILTROS
      ========================================================= */}
      <section className="bg-[var(--surface)] py-14 sm:py-16">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-[var(--foreground)]">
        Encuentra lo que necesitas
      </h2>

      <div className="mx-auto mt-4 flex items-center justify-center gap-3">
        <span className="h-px w-8 bg-[var(--primary)]/30" />
        <span className="text-lg text-[var(--primary)]">🌿</span>
        <span className="h-px w-8 bg-[var(--primary)]/30" />
      </div>
    </div>

    <div className="mt-10">
      <ProductGrid products={products} />
    </div>
  </div>
</section>

      {/* =========================================================
          PRODUCTOS
      ========================================================= */}
      <section id="productos" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">
              Nuestra selección
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
              Productos destacados
            </h2>

            <div className="mx-auto mt-4 flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-[var(--primary)]/30" />
              <span className="text-lg text-[var(--primary)]">🌿</span>
              <span className="h-px w-8 bg-[var(--primary)]/30" />
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {products.map((product) => (
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
                  <h3 className="font-bold text-[var(--foreground)]">
                    {product.name}
                  </h3>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {product.location}
                  </p>

                  <div className="mt-4">
                    <p className="text-lg font-bold text-[var(--foreground)]">
                      {product.price}
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
        </div>
      </section>

      {/* =========================================================
          BANNER CAMPO
      ========================================================= */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[var(--radius-xl)]">
          <Image
            src="/images/backgrounds/banner-campo.webp"
            alt="Productos del campo"
            fill
            className="object-cover"
          />

          <div className="absolute inset-0 bg-[rgb(23_53_31_/_78%)]" />

          <div className="relative flex flex-col gap-6 px-7 py-12 text-white sm:flex-row sm:items-center sm:justify-between sm:px-12">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Apoyamos al campo y a nuestras comunidades
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
                Al comprar en Canastas Verdes ayudas a productores locales y
                recibes lo mejor del campo en tu hogar.
              </p>
            </div>

            <Link
              href="/aboutUs"
              className="shrink-0 rounded-[var(--radius-md)] bg-green-200/50 px-6 py-3 text-center text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--secondary)]"
            >
              Conoce más
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          BENEFICIOS
      ========================================================= */}
      <section className="bg-[var(--surface)] py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="text-2xl">🌱</p>
            <h3 className="mt-3 font-bold text-[var(--foreground)]">
              Directo del productor
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Sin intermediarios innecesarios.
            </p>
          </div>

          <div>
            <p className="text-2xl">☀️</p>
            <h3 className="mt-3 font-bold text-[var(--foreground)]">
              Productos de temporada
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Siempre frescos y seleccionados.
            </p>
          </div>

          <div>
            <p className="text-2xl">✓</p>
            <h3 className="mt-3 font-bold text-[var(--foreground)]">
              Calidad garantizada
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Seleccionados con cuidado.
            </p>
          </div>

          <div>
            <p className="text-2xl">♻️</p>
            <h3 className="mt-3 font-bold text-[var(--foreground)]">
              Compromiso sostenible
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cuidamos nuestros recursos.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}