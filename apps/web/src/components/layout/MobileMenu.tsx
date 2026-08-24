"use client";

import Link from "next/link";

interface NavigationItem {
  label: string;
  href: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  navigation: NavigationItem[];
  onClose: () => void;
}

export default function MobileMenu({
  isOpen,
  navigation,
  onClose,
}: MobileMenuProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)] md:hidden">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-1">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="rounded-md px-3 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
          <Link
            href="/login"
            onClick={onClose}
            className="rounded-md px-3 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          >
            Iniciar sesión
          </Link>

          <Link
            href="/register"
            onClick={onClose}
            className="rounded-md bg-[var(--primary)] px-4 py-3 text-center text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </div>
  );
}