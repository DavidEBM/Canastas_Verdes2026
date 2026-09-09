import Link from "next/link";
export default function HomePage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-[url('/images/backgrounds/Main.webp')] bg-cover bg-center"
          aria-hidden="true"
        />

        {/* Overlay para mejorar la legibilidad */}
        <div
          className="absolute inset-0 bg-[rgb(23_40_31_/_37%)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-[var(--secondary)] px-3 py-1 text-sm font-medium text-[var(--secondary-foreground)]">
              Canastas Verdes
            </span>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Productos frescos para tu día a día.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
              Descubre nuestra tienda y encuentra productos pensados para
              acompañar una alimentación fresca, práctica y saludable.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tienda"
                className="inline-flex min-h-11 items-center justify-center rounded-md border-2 border-white/50 bg-[var(--primary)]/70 px-6 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 bg-green/40 hover:bg-green/70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--primary)]"
              >
                Ver tienda
              </Link>

              <Link
                href="/aboutUs"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/70 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--primary)]"
              >
                Conócenos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Propuesta de valor */}
<section>
  <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
    <div className="max-w-2xl">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Una experiencia sencilla
      </h2>

      <p className="mt-4 text-base leading-7 text-[var(--muted)]">
        Diseñamos la plataforma para que puedas encontrar tus productos,
        realizar tus pedidos y consultar su estado de forma sencilla.
      </p>
    </div>

    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {/* 01 - Productos Frescos */}
      <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--secondary)]"
          aria-hidden="true"
        >
          <span
            className="h-7 w-7 bg-[var(--secondary-foreground)]"
            style={{
              maskImage: "url('/images/logos/leaf.svg')",
              WebkitMaskImage: "url('/images/logos/leaf.svg')",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              maskSize: "contain",
              WebkitMaskSize: "contain",
            }}
          />
        </div>

        <h3 className="mt-5 text-lg font-semibold">
          Productos Frescos
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Consulta los productos disponibles en nuestra tienda.
          Cosechados el mismo día de la entrega. Garantizamos la máxima
          frescura y sabor en cada uno de nuestros productos.
        </p>
      </article>

      {/* 02 - Realiza tu pedido */}
      <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--secondary)]"
          aria-hidden="true"
        >
          <span
            className="h-7 w-7 bg-[var(--secondary-foreground)]"
            style={{
              maskImage: "url('/images/logos/truck.svg')",
              WebkitMaskImage: "url('/images/logos/truck.svg')",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              maskSize: "contain",
              WebkitMaskSize: "contain",
            }}
          />
        </div>

        <h3 className="mt-5 text-lg font-semibold">
          Realiza tu pedido
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Selecciona tus productos y gestiona tu pedido desde la
          plataforma. Trabajamos directamente con agricultores locales de
          confianza, eliminando intermediarios y apoyando la economía
          campesina.
        </p>
      </article>

      {/* 03 - Calidad Garantizada */}
      <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--secondary)]"
          aria-hidden="true"
        >
          <span
            className="h-7 w-7 bg-[var(--secondary-foreground)]"
            style={{
              maskImage: "url('/images/logos/quality.svg')",
              WebkitMaskImage:
                "url('/images/logos/quality.svg')",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              maskSize: "contain",
              WebkitMaskSize: "contain",
            }}
          />
        </div>

        <h3 className="mt-5 text-lg font-semibold">
          Calidad Garantizada
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Haz seguimiento de tus pedidos desde tu cuenta. Cada producto
          pasa por un riguroso control de calidad. Si no estás satisfecho,
          te lo reemplazamos sin preguntas.
        </p>
      </article>
    </div>
  </div>
</section>

      {/* Información: conexión entre el campo y el hogar */}
      <section className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Imagen */}
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <img
                src="/images/backgrounds/Tractor.webp"
                alt="Paisaje del campo colombiano"
                className="h-80 w-full object-cover sm:h-96"
              />
            </div>

            {/* Texto */}
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Conectando el campo
                <br />
                con tu hogar
              </h2>

              <p className="mt-6 text-base leading-7 text-[var(--muted)]">
                Canastas Verdes nació con una misión clara: acercar los
                productos del campo colombiano a las mesas de las familias
                urbanas. Creemos que todos merecen acceso a alimentos frescos,
                sanos y de calidad.
              </p>

              <p className="mt-5 text-base leading-7 text-[var(--muted)]">
                Trabajamos de la mano con más de 20 fincas certificadas en
                diferentes municipios, garantizando trazabilidad, buenas
                prácticas agrícolas y comercio justo para los agricultores.
                Cada compra realizada apoya directamente a una familia
                campesina colombiana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Listo para comenzar?
          </h2>

          <p className="mx-auto mt-4 max-w-7xl text-center leading-10 text-[var(--muted)]">
            Únete a cientos de familias que ya disfrutan de productos frescos y orgánicos directo del campo.
          </p>

          <div className="mt-8">
            <Link
              href="/tienda"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
            >
              Explorar tienda
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}