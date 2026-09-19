"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  label: string;
  href: string;
}

const adminNavigation: NavigationItem[] = [
  {
    label: "Resumen",
    href: "/dashboard",
  },
  {
    label: "Productos",
    href: "/dashboard/productos",
  },
  {
    label: "Productores",
    href: "/dashboard/productores",
  },
  {
    label: "Categorías",
    href: "/dashboard/categorias",
  },
  {
    label: "Presentaciones",
    href: "/dashboard/presentaciones",
  },
  {
    label: "Municipalidades",
    href: "/dashboard/municipalidades",
  },
  {
  label: "Lugares de recogida",
  href: "/dashboard/lugares-recogida",
  },
  {
    label: "Usuarios",
    href: "/dashboard/usuarios",
  },
  {
    label: "Pedidos",
    href: "/dashboard/pedidos",
  },
  {
    label: "Repartos",
    href: "/dashboard/repartos",
  },
  {
    label: "Estadísticas",
    href: "/dashboard/estadisticas",
  },
];

const deliveryNavigation: NavigationItem[] = [
  {
    label: "Mis repartos",
    href: "/dashboard/repartos",
  },
];

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname();

  const {
    user,
    loading,
    role,
  } = useAuth();

  /*
   * ================================================
   * Cargando autenticación
   * ================================================
   */

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
          aria-label="Cargando"
        />
      </main>
    );
  }

  /*
   * ================================================
   * Usuario no autenticado
   * ================================================
   */

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Acceso restringido
          </h1>

          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            Debes iniciar sesión para acceder a esta sección.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  /*
   * ================================================
   * Navegación según rol
   * ================================================
   */

  const navigation =
    role === "admin"
      ? adminNavigation
      : role === "repartidor"
        ? deliveryNavigation
        : [];

  /*
   * ================================================
   * Usuario sin permisos
   * ================================================
   */

  if (navigation.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Sin permisos
          </h1>

          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            Tu cuenta no tiene permisos para acceder al dashboard.
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

  /*
   * ================================================
   * Dashboard
   * ================================================
   */

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* ==========================================
            Sidebar escritorio
        ========================================== */}

        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">

            {/* Información del usuario */}

            <div className="border-b border-[var(--border)] px-3 pb-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/60">
                Panel administrativo
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-[var(--foreground)]">
                {user.email ?? "Usuario"}
              </p>

              <span className="mt-2 inline-flex rounded-full bg-[var(--secondary)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--primary)]">
                {role}
              </span>
            </div>

            {/* Navegación */}

            <nav
              className="mt-3 flex flex-col gap-1"
              aria-label="Navegación del dashboard"
            >
              {navigation.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Volver a la tienda */}

            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <Link
                href="/tienda"
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
              >
                Volver a la tienda
              </Link>
            </div>
          </div>
        </aside>

        {/* ==========================================
            Contenido
        ========================================== */}

        <main className="min-w-0 flex-1">

          {/* Navegación móvil */}

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <Link
              href="/tienda"
              className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)]"
            >
              Tienda
            </Link>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}