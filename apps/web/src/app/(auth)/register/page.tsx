import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[var(--surface)]">
      <div className="absolute inset-0 bg-[url('/images/backgrounds/auth.webp')] bg-cover bg-center" />

      <div className="absolute inset-0 bg-[rgb(23_53_31_/_72%)]" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="w-full max-w-lg rounded-[var(--radius-xl)] border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <div className="text-center">
            <Link
              href="/"
              className="inline-block text-2xl font-bold text-[var(--primary)]"
            >
              Canastas <span className="text-[var(--foreground)]">Verdes</span>
            </Link>

            <h1 className="mt-6 text-2xl font-bold text-[var(--foreground)]">
              Crear cuenta
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Regístrate para comenzar a utilizar Canastas Verdes.
            </p>
          </div>

          <form className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                >
                  Nombre
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  placeholder="Tu nombre"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                >
                  Apellido
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  placeholder="Tu apellido"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
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
                autoComplete="email"
                required
                placeholder="correo@ejemplo.com"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Repite tu contraseña"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                name="terms"
                required
                className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
              />

              <span>
                Acepto los términos y condiciones de uso de Canastas Verdes.
              </span>
            </label>

            <button
              type="submit"
              className="w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#18572f] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
            >
              Crear cuenta
            </button>
          </form>

          <div className="mt-8 border-t border-[var(--border)] pt-6 text-center">
            <p className="text-sm text-[var(--muted)]">
              ¿Ya tienes una cuenta?{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Iniciar sesión
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}