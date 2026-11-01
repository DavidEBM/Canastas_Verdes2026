"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface StatusPageProps {
  code: string;
  title: string;
  description: string;
  icon?: ReactNode;
  reset?: () => void;
  retryLabel?: string;
}

export default function StatusPage({
  code,
  title,
  description,
  icon,
  reset,
  retryLabel = "Intentar de nuevo",
}: StatusPageProps) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <section
        className="w-full max-w-2xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-soft)] sm:p-10"
        aria-labelledby="status-title"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--primary)]">
          {icon ?? (
            <span className="text-2xl font-bold" aria-hidden="true">
              !
            </span>
          )}
        </div>

        <p className="mt-6 text-sm font-bold uppercase tracking-[0.24em] text-[var(--primary)]">
          Error {code}
        </p>
        <h1
          id="status-title"
          className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl"
        >
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
          {description}
        </p>

        <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--secondary)]"
          >
            Volver atrás
          </button>

          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            Volver al Inicio
          </Link>
        </div>

        {reset && (
          <button
            type="button"
            onClick={reset}
            className="mt-5 text-sm font-semibold text-[var(--muted)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:text-[var(--primary)]"
          >
            {retryLabel}
          </button>
        )}
      </section>
    </main>
  );
}
