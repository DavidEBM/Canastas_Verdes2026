"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const adminSections = [
  {
    href: "/dashboard/productos",
    title: "Productos",
    description:
      "Crear, editar, eliminar e importar el catálogo mediante Excel.",
  },
  {
    href: "/dashboard/usuarios",
    title: "Usuarios y roles",
    description:
      "Gestionar usuarios y asignar roles.",
  },
  {
    href: "/dashboard/pedidos",
    title: "Pedidos",
    description:
      "Gestionar el ciclo de vida de los pedidos.",
  },
  {
    href: "/dashboard/repartos",
    title: "Repartos",
    description:
      "Gestionar asignaciones y estados de entrega.",
  },
  {
    href: "/dashboard/lugares-recogida",
    title: "Lugares de recogida",
    description:
      "Crear, editar, activar y administrar los puntos disponibles para recogida.",
  },
  {
    href: "/dashboard/estadisticas",
    title: "Estadísticas",
    description:
      "Consultar métricas operativas de la tienda.",
  },
];

export default function DashboardPage() {
  const {
    loading,
    user,
    role,
  } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <div className="text-sm text-[var(--foreground)]/70">
          Cargando dashboard...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Acceso restringido
        </h1>

        <p className="mt-2 text-sm text-[var(--foreground)]/70">
          Debes iniciar sesión para acceder al dashboard.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          Iniciar sesión
        </Link>
      </main>
    );
  }

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Acceso restringido
          </h1>

          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            Esta área está disponible únicamente para
            administradores.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg border border-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Encabezado */}
      <section>
        <p className="text-sm font-medium text-[var(--primary)]">
          Panel administrativo
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-[var(--foreground)]/70">
          Administra el catálogo, usuarios y operación
          de Canastas Verdes desde un solo lugar.
        </p>
      </section>

      {/* Información del administrador */}
      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/60">
          Sesión actual
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {user.email ?? "Administrador"}
          </span>

          <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold capitalize text-[var(--primary)]">
            {role}
          </span>
        </div>
      </section>

      {/* Secciones */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          Administración
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-sm"
            >
              <h3 className="font-bold text-[var(--primary)]">
                {section.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/70">
                {section.description}
              </p>

              <span className="mt-4 inline-block text-sm font-semibold text-[var(--primary)] transition-transform group-hover:translate-x-1">
                Administrar →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}