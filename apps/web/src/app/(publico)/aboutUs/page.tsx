import Image from "next/image";

const values = [
  {
    title: "Calidad",
    description:
      "Seleccionamos nuestros productos pensando en ofrecer una experiencia confiable y de calidad.",
  },
  {
    title: "Sostenibilidad",
    description:
      "Promovemos alternativas responsables y una relación más consciente con nuestros productos y recursos.",
  },
  {
    title: "Comunidad",
    description:
      "Creemos en el trabajo conjunto y en generar valor para las personas que hacen parte de Canastas Verdes.",
  },
];

export default function AboutUsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative min-h-[55dvh] overflow-hidden">
        <Image
          src="/images/backgrounds/about-us.webp"
          alt="Canastas Verdes"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-[rgb(23_53_31_/_68%)]" />

        <div className="relative mx-auto flex min-h-[55dvh] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">
              Sobre nosotros
            </p>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Conoce Canastas Verdes
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
              Trabajamos para acercar productos y soluciones a nuestra
              comunidad mediante una plataforma sencilla, accesible y pensada
              para las necesidades de nuestros clientes.
            </p>
          </div>
        </div>
      </section>

      {/* Introducción */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">
              Nuestra historia
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Una forma diferente de conectar productos y personas
            </h2>

            <p className="mt-6 leading-7 text-[var(--muted)]">
              Canastas Verdes nace con la intención de facilitar el acceso a
              productos mediante una experiencia digital clara y sencilla.
            </p>

            <p className="mt-4 leading-7 text-[var(--muted)]">
              Nuestra plataforma permite conocer nuestros productos, realizar
              pedidos y consultar información de manera rápida desde cualquier
              dispositivo.
            </p>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)]">
            <Image
              src="/images/backgrounds/content.webp"
              alt="Productos de Canastas Verdes"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="bg-[var(--surface)] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">
              Lo que nos representa
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Nuestros valores
            </h2>

            <p className="mt-4 text-[var(--muted)]">
              Principios que orientan nuestra forma de trabajar y relacionarnos
              con nuestra comunidad.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {values.map((value) => (
              <article
                key={value.title}
                className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary)] text-lg font-bold text-[var(--primary)]">
                  ✓
                </div>

                <h3 className="mt-5 text-xl font-bold text-[var(--foreground)]">
                  {value.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Cierre */}
      <section className="bg-[var(--primary)] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Crecemos junto a nuestra comunidad
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-white/80">
            Queremos seguir construyendo una experiencia cada vez mejor para
            nuestros clientes, colaboradores y aliados.
          </p>
        </div>
      </section>
    </main>
  );
}