"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";

interface Categoria {
  id: string;
  nombre: string;
  fechaCreacion: unknown;
  fechaActualizacion: unknown;
  fechaClausura: unknown;
}

export default function DashboardCategoriasPage() {
  const {
    user,
    loading,
  } = useAuth();

  const [categorias, setCategorias] =
    useState<Categoria[]>([]);

  const [nombre, setNombre] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const request = useCallback(
    async (
      method: "GET" | "POST",
      body?: unknown,
    ) => {
      if (!user) {
        throw new Error(
          "Debes iniciar sesión.",
        );
      }

      const token =
        await user.getIdToken(true);

      const response = await fetch(
        "/api/categorias",
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body
              ? {
                  "Content-Type":
                    "application/json",
                }
              : {}),
          },
          body: body
            ? JSON.stringify(body)
            : undefined,
        },
      );

      const result: unknown =
        await response.json();

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "No fue posible completar la operación.";

        throw new Error(message);
      }

      return result;
    },
    [user],
  );

  const load = useCallback(
    async () => {
      try {
        setError(null);

        const result =
          await request("GET");

        if (
          result &&
          typeof result === "object" &&
          "data" in result &&
          Array.isArray(result.data)
        ) {
          setCategorias(
            result.data as Categoria[],
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar las categorías.",
        );
      }
    },
    [request],
  );

  useEffect(() => {
    if (user) {
      void load();
    }
  }, [user, load]);

  const create = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const value = nombre.trim();

    if (!value) {
      setError(
        "El nombre es obligatorio.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await request("POST", {
        nombre: value,
      });

      setNombre("");

      setNotice(
        "Categoría creada correctamente.",
      );

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible crear la categoría.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="px-4 py-12">
        Cargando…
      </main>
    );
  }

  if (!user) {
    return (
      <main className="px-4 py-12">
        Debes iniciar sesión como administrador.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Categorías
        </h1>

        <p className="mt-2 text-sm text-[var(--foreground)]/70">
          Administra las categorías utilizadas
          por los productos de la tienda.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </p>
      )}

      <form
        onSubmit={create}
        className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <h2 className="text-lg font-bold">
          Nueva categoría
        </h2>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={nombre}
            onChange={(event) =>
              setNombre(event.target.value)
            }
            maxLength={100}
            required
            placeholder="Ej. Frutas"
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
          />

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Creando…"
              : "Crear categoría"}
          </button>
        </div>
      </form>

      <section className="mt-8">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface)]">
              <tr>
                <th className="px-4 py-3">
                  Nombre
                </th>

                <th className="hidden px-4 py-3 sm:table-cell">
                  ID
                </th>
              </tr>
            </thead>

            <tbody>
              {categorias.map(
                (categoria) => (
                  <tr
                    key={categoria.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3 font-medium">
                      {categoria.nombre}
                    </td>

                    <td className="hidden px-4 py-3 font-mono text-xs text-[var(--foreground)]/60 sm:table-cell">
                      {categoria.id}
                    </td>
                  </tr>
                ),
              )}

              {categorias.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-10 text-center text-[var(--foreground)]/60"
                  >
                    No hay categorías registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

