import Image from "next/image";

export default function ContactoPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative min-h-[40dvh] overflow-hidden">
        <Image
          src="/images/backgrounds/contacto.webp"
          alt="Contacto Canastas Verdes"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-[rgb(23_53_31_/_70%)]" />

        <div className="relative mx-auto flex min-h-[40dvh] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">
              Estamos para ayudarte
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Contáctanos
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
              ¿Tienes alguna pregunta, sugerencia o necesitas información?
              Escríbenos y estaremos encantados de ayudarte.
            </p>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section className="bg-[var(--surface)] py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          {/* Información */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">
              Información
            </p>

            <h2 className="mt-3 text-3xl font-bold text-[var(--foreground)]">
              Hablemos
            </h2>

            <p className="mt-4 leading-7 text-[var(--muted)]">
              Puedes comunicarte con nosotros utilizando cualquiera de los
              medios disponibles. También puedes utilizar el formulario y
              nuestro equipo se pondrá en contacto contigo.
            </p>

            <div className="mt-8 space-y-6">
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">
                  Correo electrónico
                </h3>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  contacto@canastasverdes.com
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[var(--foreground)]">
                  Teléfono
                </h3>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  +57 000 000 0000
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[var(--foreground)]">
                  Horario de atención
                </h3>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Lunes a viernes
                  <br />
                  8:00 a. m. — 5:00 p. m.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              Envíanos un mensaje
            </h2>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Completa el formulario y cuéntanos cómo podemos ayudarte.
            </p>

            <form className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Nombre
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Tu nombre"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Correo electrónico
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                >
                  Asunto
                </label>

                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  placeholder="¿En qué podemos ayudarte?"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                >
                  Mensaje
                </label>

                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  placeholder="Escribe tu mensaje..."
                  className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18572f] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
              >
                Enviar mensaje
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Ubicación / llamada final */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            También puedes visitarnos
          </h2>

          <p className="mt-4 text-[var(--muted)]">
            Consulta nuestras ubicaciones para encontrar el punto de atención
            más cercano.
          </p>

          <a
            href="/ubicaciones"
            className="mt-6 inline-flex rounded-[var(--radius-md)] bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#18572f]"
          >
            Ver ubicaciones
          </a>
        </div>
      </section>
    </main>
  );
}