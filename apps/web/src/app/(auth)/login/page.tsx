"use client";

import Link from "next/link";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      console.error(error);

      setError(
        "El correo electrónico o la contraseña no son correctos.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[var(--surface)]">
      <div className="absolute inset-0 bg-[url('/images/backgrounds/auth.webp')] bg-cover bg-center" />

      <div className="absolute inset-0 bg-[rgb(23_53_31_/_72%)]" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="w-full max-w-md rounded-[var(--radius-xl)] border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          
          <div className="text-center">
            <Link
              href="/"
              className="inline-block text-2xl font-bold text-[var(--primary)]"
            >
              Canastas{" "}
              <span className="text-[var(--foreground)]">
                Verdes
              </span>
            </Link>

            <h1 className="mt-6 text-2xl font-bold text-[var(--foreground)]">
              Bienvenido
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Inicia sesión para continuar.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
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
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#18572f] disabled:opacity-60"
            >
              {loading
                ? "Iniciando sesión..."
                : "Iniciar sesión"}
            </button>
          </form>

          <div className="mt-8 border-t border-[var(--border)] pt-6 text-center">
            <p className="text-sm text-[var(--muted)]">
              ¿No tienes una cuenta?{" "}

              <Link
                href="/register"
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Crear cuenta
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}