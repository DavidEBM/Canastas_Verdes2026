import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)]">
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <Image
          src="/images/backgrounds/Main.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[rgb(23_40_31/_37%)]" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-[var(--secondary)] px-3 py-1 text-sm font-medium text-[var(--secondary-foreground)]">
              Canastas Verdes
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Productos frescos para tu día a día.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
              Descubre nuestros productos pensados para acompañar una alimentación fresca, práctica y saludable.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tienda"
                className="inline-flex min-h-11 items-center justify-center rounded-md border-2 border-white/50 bg-[var(--primary)]/70 px-6 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--primary)]"
              >
                Ver Productos
              </Link>
              <Link
                href="/aboutUs"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/70 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              >
                Conócenos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Una experiencia sencilla
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              Diseñamos la plataforma para que puedas encontrar tus productos, realizar tus pedidos y consultar su estado de forma sencilla.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
              <h3 className="text-lg font-semibold">Productos frescos</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Consulta productos cosechados el mismo día de la entrega, con frescura y sabor en cada compra.
              </p>
            </article>
            <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
              <h3 className="text-lg font-semibold">Realiza tu pedido</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Selecciona tus productos y gestiona tu pedido desde la plataforma, apoyando a agricultores locales.
              </p>
            </article>
            <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
              <h3 className="text-lg font-semibold">Calidad garantizada</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Haz seguimiento de tus pedidos desde tu cuenta y recibe productos seleccionados con cuidado.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
          <div className="overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/images/backgrounds/Tractor.webp"
              alt="Paisaje del campo colombiano"
              width={960}
              height={640}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-80 w-full object-cover sm:h-96"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Conectando el campo
              <br />
              con tu hogar
            </h2>
            <p className="mt-6 text-base leading-7 text-[var(--muted)]">
              Canastas Verdes nació con una misión clara: acercar los productos del campo colombiano a las mesas de las familias urbanas. Creemos que todos merecen acceso a alimentos frescos, sanos y de calidad.
            </p>
            <p className="mt-5 text-base leading-7 text-[var(--muted)]">
              Trabajamos con más de 20 fincas certificadas, garantizando trazabilidad, buenas prácticas agrícolas y comercio justo para los agricultores.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <h2 className="mx-auto text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Listo para comenzar?
          </h2>
          <p className="mx-auto mt-4 w-full max-w-2xl text-center leading-7 text-[var(--muted)]">
            Únete a cientos de familias que ya disfrutan de productos frescos y orgánicos directo del campo.
          </p>
          <Link
            href="/tienda"
            className="mx-auto mt-8 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--primary)] px-6 text-center text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            Explorar Productos
          </Link>
        </div>
      </section>
    </main>
  );
}
