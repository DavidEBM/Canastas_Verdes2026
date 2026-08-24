
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
            <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--secondary)] text-sm font-bold">
                01
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Explora
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Consulta los productos disponibles en nuestra tienda.
              </p>
            </article>

            <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--secondary)] text-sm font-bold">
                02
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Realiza tu pedido
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Selecciona tus productos y gestiona tu pedido desde la
                plataforma.
              </p>
            </article>

            <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--secondary)] text-sm font-bold">
                03
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Consulta el estado
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Haz seguimiento de tus pedidos desde tu cuenta.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Listo para comenzar?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-15 text-[var(--muted)]">
            Explora nuestra tienda y descubre lo que Canastas Verdes tiene
            para ofrecerte.
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

