"use client";

import Link from "next/link";
import { useState } from "react";

import MobileMenu from "@/components/layout/MobileMenu";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const navigation = [
  {
    label: "Inicio",
    href: "/",
  },
  {
    label: "Tienda",
    href: "/tienda",
  },
  {
    label: "Nosotros",
    href: "/aboutUs",
  },
  {
    label: "Ubicaciones",
    href: "/ubicaciones",
  },
  {
    label: "Contacto",
    href: "/contacto",
  },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { totalItems, openCart } = useCart();

  const {
    user,
    loading: authLoading,
    role,
  } = useAuth();

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen((current) => !current);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <nav
        className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Navegación principal"
      >
        {/* Marca */}
        <Link
          href="/"
          onClick={closeMenu}
          className="flex min-w-0 shrink-0 items-center gap-2"
          aria-label="Canastas Verdes - Inicio"
        >
          {/* Logo único */}
          <span
            className="
              relative h-10 w-10 shrink-0 overflow-hidden rounded-full
              border border-[var(--border)] bg-[var(--surface)]
              md:static
              max-md:absolute max-md:left-1/2 max-md:top-1/2
              max-md:-translate-x-1/2 max-md:-translate-y-1/2
            "
          >
            <img
              src="/images/logo.webp"
              alt="Logo de Canastas Verdes"
              className="h-full w-full object-cover"
            />
          </span>

          {/* Nombre */}
          <span
            className="
              text-xl font-bold tracking-tight
              text-[var(--foreground)]
              sm:text-2xl
            "
          >
            Canastas{" "}
            <span className="text-[var(--primary)]">
              Verdes
            </span>
          </span>
        </Link>

        {/* Navegación escritorio */}
        <div className="hidden items-center gap-5 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
            >
              {item.label}
            </Link>
          ))}

          {/* Dashboard */}
          {!authLoading && role === "admin" && (
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-[var(--primary)] transition-colors hover:opacity-80"
            >
              Dashboard
            </Link>
          )}

          {/* Repartos */}
          {!authLoading && role === "repartidor" && (
            <Link
              href="/dashboard/repartos"
              className="text-sm font-semibold text-[var(--primary)] transition-colors hover:opacity-80"
            >
              Repartos
            </Link>
          )}

          {/* Pedidos */}
          {!authLoading && user && (
            <Link
              href="/pedidos"
              className="text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
            >
              Mis pedidos
            </Link>
          )}

          {/* Cesta */}
          <button
            type="button"
            onClick={openCart}
            className="relative inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
            aria-label={`Abrir cesta${
              totalItems > 0
                ? `, ${totalItems} productos`
                : ""
            }`}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="20" r="1" />
              <circle cx="20" cy="20" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>

            <span>Cesta</span>

            {totalItems > 0 && (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-xs font-bold text-[var(--primary-foreground)]">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>

          {/* Autenticación */}
          {!authLoading &&
            (user ? (
              <Link
                href="/perfil"
                className="rounded-lg border border-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
              >
                Mi cuenta
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
              >
                Iniciar sesión
              </Link>
            ))}
        </div>

        {/* Controles móviles */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          {/* Cesta */}
          <button
            type="button"
            onClick={openCart}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
            aria-label={`Abrir cesta${
              totalItems > 0
                ? `, ${totalItems} productos`
                : ""
            }`}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="20" r="1" />
              <circle cx="20" cy="20" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>

            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-[var(--primary-foreground)]">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>

          {/* Menú */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
            aria-label={
              isMenuOpen
                ? "Cerrar menú"
                : "Abrir menú"
            }
            aria-expanded={isMenuOpen}
            onClick={toggleMenu}
          >
            <span className="sr-only">
              {isMenuOpen
                ? "Cerrar menú"
                : "Abrir menú"}
            </span>

            <span className="relative block h-5 w-5">
              <span
                className={`absolute left-0 top-1/2 block h-0.5 w-5 bg-current transition-transform ${
                  isMenuOpen
                    ? "rotate-45"
                    : "-translate-y-1.5"
                }`}
              />

              <span
                className={`absolute left-0 top-1/2 block h-0.5 w-5 bg-current transition-opacity ${
                  isMenuOpen
                    ? "opacity-0"
                    : "opacity-100"
                }`}
              />

              <span
                className={`absolute left-0 top-1/2 block h-0.5 w-5 bg-current transition-transform ${
                  isMenuOpen
                    ? "-rotate-45"
                    : "translate-y-1.5"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      <MobileMenu
        isOpen={isMenuOpen}
        navigation={navigation}
        onClose={closeMenu}
      />
    </header>
  );
}

