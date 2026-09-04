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
  activo: boolean;
  fechaCreacion?: unknown;
  fechaActualizacion?: unknown;
  fechaClausura?: unknown;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: Categoria | Categoria[];
}

export default function DashboardCategoriasPage() {
  const {
    user,
    loading: authLoading,
    role,
  } = useAuth();

  const [categorias, setCategorias] =
    useState<Categoria[]>([]);

  const [nombre, setNombre] =
    useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editingNombre, setEditingNombre] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [changingStatus, setChangingStatus] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  /* =======================================================
     API
  ======================================================= */

  const request = useCallback(
    async (
      url: string,
      options: RequestInit = {},
    ): Promise<ApiResponse> => {
      if (!user) {
        throw new Error(
          "Debes iniciar sesión.",
        );
      }

      const token =
        await user.getIdToken(true);

      const response = await fetch(url, {
        ...options,

        headers: {
          Authorization: `Bearer ${token}`,

          ...(options.body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),

          ...(options.headers ?? {}),
        },
      });

      let result: unknown = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message ===
            "string"
            ? result.message
            : "No fue posible completar la operación.";

        throw new Error(message);
      }

      return result as ApiResponse;
    },
    [user],
  );

  /* =======================================================
     Cargar
  ======================================================= */

  const load = useCallback(
    async () => {
      if (
        !user ||
        role !== "admin"
      ) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result =
          await request(
            "/api/categorias",
          );

        if (
          Array.isArray(result.data)
        ) {
          setCategorias(
            result.data,
          );
        } else {
          setCategorias([]);
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar las categorías.",
        );
      } finally {
        setLoading(false);
      }
    },
    [request, role, user],
  );

  useEffect(() => {
    if (
      !authLoading &&
      user &&
      role === "admin"
    ) {
      void load();
    }
  }, [
    authLoading,
    user,
    role,
    load,
  ]);

  /* =======================================================
     Crear
  ======================================================= */

  const create = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const value =
      nombre.trim();

    if (!value) {
      setError(
        "El nombre de la categoría es obligatorio.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await request(
        "/api/categorias",
        {
          method: "POST",

          body: JSON.stringify({
            nombre: value,
          }),
        },
      );

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

  /* =======================================================
     Editar
  ======================================================= */

  const startEditing = (
    categoria: Categoria,
  ) => {
    setEditingId(categoria.id);
    setEditingNombre(
      categoria.nombre,
    );

    setError(null);
    setNotice(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingNombre("");
    setError(null);
  };

  const saveEditing = async () => {
    if (!editingId) {
      setError(
        "El identificador de la categoría es obligatorio.",
      );
      return;
    }

    const value =
      editingNombre.trim();

    if (!value) {
      setError(
        "El nombre de la categoría es obligatorio.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await request(
        `/api/categorias/${encodeURIComponent(
          editingId,
        )}`,
        {
          method: "PUT",

          body: JSON.stringify({
            nombre: value,
          }),
        },
      );

      setEditingId(null);
      setEditingNombre("");

      setNotice(
        "Categoría actualizada correctamente.",
      );

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible actualizar la categoría.",
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     Activar / Desactivar
  ======================================================= */

  const toggleStatus = async (
    categoria: Categoria,
  ) => {
    const nuevoEstado =
      !categoria.activo;

    const accion =
      nuevoEstado
        ? "activar"
        : "desactivar";

    const confirmed =
      window.confirm(
        `¿Deseas ${accion} la categoría "${categoria.nombre}"?`,
      );

    if (!confirmed) {
      return;
    }

    setChangingStatus(
      categoria.id,
    );

    setError(null);
    setNotice(null);

    try {
      await request(
        `/api/categorias/${encodeURIComponent(
          categoria.id,
        )}`,
        {
          method: "PATCH",

          body: JSON.stringify({
            activo: nuevoEstado,
          }),
        },
      );

      if (
        editingId === categoria.id
      ) {
        cancelEditing();
      }

      setNotice(
        nuevoEstado
          ? "Categoría activada correctamente."
          : "Categoría desactivada correctamente.",
      );

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cambiar el estado.",
      );
    } finally {
      setChangingStatus(null);
    }
  };

  /* =======================================================
     Acceso
  ======================================================= */

  if (authLoading) {
    return (
      <main className="px-4 py-12">
        Cargando…
      </main>
    );
  }

  if (
    !user ||
    role !== "admin"
  ) {
    return (
      <main className="px-4 py-12">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h1 className="text-2xl font-bold">
            Acceso restringido
          </h1>

          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            Solo los administradores
            pueden gestionar categorías.
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     Render
  ======================================================= */

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

      <h1 className="text-3xl font-bold text-[var(--foreground)]">
        Categorías
      </h1>

      <p className="mt-2 text-sm text-[var(--foreground)]/70">
        Administra las categorías utilizadas
        por los productos de la tienda.
      </p>

      {/* Mensajes */}

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      {/* Crear */}

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
              setNombre(
                event.target.value,
              )
            }
            maxLength={100}
            required
            disabled={busy}
            placeholder="Ej. Frutas"
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50"
          >
            {busy
              ? "Guardando..."
              : "Crear categoría"}
          </button>
        </div>
      </form>

      {/* Tabla */}

      <section className="mt-8">
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">

          <table className="w-full min-w-[750px] text-left text-sm">

            <thead className="bg-[var(--surface)]">
              <tr>
                <th className="px-4 py-3">
                  Nombre
                </th>

                <th className="px-4 py-3">
                  ID
                </th>

                <th className="px-4 py-3">
                  Estado
                </th>

                <th className="px-4 py-3">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center"
                  >
                    Cargando categorías...
                  </td>
                </tr>
              ) : categorias.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center"
                  >
                    No hay categorías registradas.
                  </td>
                </tr>
              ) : (
                categorias.map(
                  (categoria) => (
                    <tr
                      key={categoria.id}
                      className="border-t border-[var(--border)]"
                    >

                      {/* Nombre */}

                      <td className="px-4 py-3">
                        {editingId ===
                        categoria.id ? (
                          <input
                            type="text"
                            value={
                              editingNombre
                            }
                            onChange={(event) =>
                              setEditingNombre(
                                event.target.value,
                              )
                            }
                            maxLength={100}
                            autoFocus
                            disabled={busy}
                            className="w-full rounded-lg border border-[var(--primary)] bg-[var(--background)] px-3 py-2 outline-none"
                          />
                        ) : (
                          <span className="font-medium">
                            {
                              categoria.nombre
                            }
                          </span>
                        )}
                      </td>

                      {/* ID */}

                      <td className="px-4 py-3 font-mono text-xs">
                        {categoria.id}
                      </td>

                      {/* Estado */}

                      <td className="px-4 py-3">
                        <span
                          className={
                            categoria.activo
                              ? "inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                              : "inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                          }
                        >
                          {categoria.activo
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      {/* Acciones */}

                      <td className="px-4 py-3">

                        {editingId ===
                        categoria.id ? (

                          <div className="flex gap-2">

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void saveEditing()
                              }
                              className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-foreground)] disabled:opacity-50"
                            >
                              {busy
                                ? "Guardando..."
                                : "Guardar"}
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={
                                cancelEditing
                              }
                              className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs"
                            >
                              Cancelar
                            </button>

                          </div>

                        ) : (

                          <div className="flex flex-wrap gap-2">

                            <button
                              type="button"
                              disabled={
                                busy ||
                                changingStatus !==
                                  null
                              }
                              onClick={() =>
                                startEditing(
                                  categoria,
                                )
                              }
                              className="rounded-lg border border-[var(--primary)] px-3 py-2 text-xs font-medium text-[var(--primary)]"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              disabled={
                                busy ||
                                changingStatus !==
                                  null
                              }
                              onClick={() =>
                                void toggleStatus(
                                  categoria,
                                )
                              }
                              className={
                                categoria.activo
                                  ? "rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  : "rounded-lg border border-green-200 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                              }
                            >
                              {changingStatus ===
                              categoria.id
                                ? "Procesando..."
                                : categoria.activo
                                  ? "Desactivar"
                                  : "Activar"}
                            </button>

                          </div>
                        )}
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>

          </table>
        </div>
      </section>
    </main>
  );
}