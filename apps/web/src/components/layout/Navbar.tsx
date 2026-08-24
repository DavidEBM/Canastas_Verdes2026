"use client";

import Link from "next/link";
import { useState } from "react";

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

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/50 bg-green/50 backdrop-blur">
      <nav
        className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMenu}
          className="flex shrink-0 items-center"
          aria-label="Canastas Verdes - Inicio"
        >
          <span className="text-xl font-bold tracking-tight sm:text-2xl">
            Canastas Verdes
          </span>
        </Link>

        {/* Navegación escritorio */}
        <div className="hidden items-center gap-6 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-black"
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/login"
            className="rounded-lg border border-gray-900 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-900 hover:text-white"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* Botón móvil */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black-200 text-gray-900 transition-colors hover:bg-gray-100 md:hidden"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span className="sr-only">
            {isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          </span>

          <span className="relative block h-5 w-5">
            <span
              className={`absolute left-0 top-1/2 block h-0.5 w-5 bg-current transition-transform ${
                isMenuOpen ? "rotate-45" : "-translate-y-1.5"
              }`}
            />

            <span
              className={`absolute left-0 top-1/2 block h-0.5 w-5 bg-current transition-opacity ${
                isMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />

            <span
              className={`absolute left-0 top-1/2 block h-0.5 w-5 bg-current transition-transform ${
                isMenuOpen ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Menú móvil */}
      {isMenuOpen && (
        <div className="border-t border-black-20 bg-white/50  md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="border-b border-gray-100 py-3 text-sm font-medium text-gray-700 last:border-b-0 hover:text-black"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/login"
              onClick={closeMenu}
              className="mt-3 rounded-lg rounded-md border-2 border-black/50 bg-green-800/80 px-4 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90 bg-green/40 hover:bg-green/70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}