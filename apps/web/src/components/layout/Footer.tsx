import Link from "next/link";

const navigation = [
  {
    title: "Explorar",
    links: [
      { label: "Inicio", href: "/" },
      { label: "Tienda", href: "/tienda" },
      { label: "Nosotros", href: "/aboutUs" },
      { label: "Ubicaciones", href: "/ubicaciones" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Contacto", href: "/contacto" },
      { label: "Iniciar sesión", href: "/login" },
      { label: "Registrarse", href: "/register" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--primary)]/20 bg-[var(--foreground)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">

          {/* Identidad */}
          <div>
            <Link
              href="/"
              className="inline-block text-2xl font-bold tracking-tight"
            >
              <span className="text-white">
                Canastas
              </span>{" "}
              <span className="text-[var(--secondary)]">
                Verdes
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Productos frescos del campo, conectando
              productores, familias y comunidades a
              través de una plataforma sencilla y
              accesible.
            </p>
          </div>

          {/* Navegación */}
          {navigation.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--secondary)]">
                {section.title}
              </h2>

              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 transition-colors hover:text-white hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Separador */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-3 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Canastas
              Verdes. Todos los derechos reservados.
            </p>

            <p>
              Productos del campo directamente
              para nuestra comunidad.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}