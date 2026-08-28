"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

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
  const {
    user,
    loading: authLoading,
    role,
  } = useAuth();

  const { totalItems } = useCart();

  if (!isOpen) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      console.error(
        "Error al cerrar sesión:",
        error,
      );
    }
  };

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)] md:hidden">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">

        <div className="flex flex-col gap-1">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="rounded-md px-3 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
            >
              {item.label}
            </Link>
          ))}

          {!authLoading && user && (
            <Link
              href="/pedidos"
              onClick={onClose}
              className="rounded-md px-3 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
            >
              Mis pedidos
            </Link>
          )}

          {!authLoading && role === "admin" && (
            <Link
              href="/dashboard"
              onClick={onClose}
              className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              Dashboard
            </Link>
          )}

          {!authLoading && role === "repartidor" && (
            <Link
              href="/dashboard/repartos"
              onClick={onClose}
              className="rounded-md px-3 py-3 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              Repartos
            </Link>
          )}

          <Link
            href="/tienda"
            onClick={onClose}
            className="flex items-center justify-between rounded-md px-3 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
          >
            <span>Cesta</span>

            {totalItems > 0 && (
              <span className="min-w-6 rounded-full bg-[var(--primary)] px-2 py-0.5 text-center text-xs font-bold text-[var(--primary-foreground)]">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Link>
        </div>

        {!authLoading && (
          <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
            {user ? (
              <>
                <Link
                  href="/perfil"
                  onClick={onClose}
                  className="rounded-md px-3 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
                >
                  Mi cuenta
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md bg-[var(--primary)] px-4 py-3 text-center text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={onClose}
                  className="rounded-md px-3 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
