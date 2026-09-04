"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";

interface Presentation {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: Presentation[];
}

export default function DashboardPresentacionesPage() {
  const { user, loading: authLoading } =
    useAuth();

  const [presentaciones, setPresentaciones] =
    useState<Presentation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [nombre, setNombre] =
    useState("");

  const [descripcion, setDescripcion] =
    useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const request = useCallback(
    async (
      url: string,
      options: RequestInit = {},
    ) => {
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
          "Content-Type":
            "application/json",
          ...options.headers,
        },
      });

      const result =
        (await response.json()) as {
          success?: boolean;
          message?: string;
          data?: Presentation[];
        };

      if (!response.ok) {
        throw new Error(
          result.message ??
            "No fue posible completar la operación.",
        );
      }

      return result;
    },
    [user],
  );

  const loadPresentaciones =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const result =
          await request(
            "/api/presentaciones",
          );

        setPresentaciones(
          Array.isArray(result.data)
            ? result.data
            : [],
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar las presentaciones.",
        );
      } finally {
        setLoading(false);
      }
    }, [request]);

  useEffect(() => {
    if (user) {
      void loadPresentaciones();
    }
  }, [
    user,
    loadPresentaciones,
  ]);

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setEditingId(null);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!nombre.trim()) {
      setError(
        "El nombre es obligatorio.",
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = editingId
        ? `/api/presentaciones/${editingId}`
        : "/api/presentaciones";

      const method = editingId
        ? "PUT"
        : "POST";

      await request(url, {
        method,
        body: JSON.stringify({
          nombre,
          descripcion,
        }),
      });

      resetForm();

      await loadPresentaciones();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la presentación.",
      );
    } finally {
      setSaving(false);
    }
  };

  const editPresentation = (
    presentation: Presentation,
  ) => {
    setEditingId(presentation.id);
    setNombre(presentation.nombre);
    setDescripcion(
      presentation.descripcion,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deletePresentation = async (
    id: string,
  ) => {
    const confirmed =
      window.confirm(
        "¿Deseas desactivar esta presentación?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);

      await request(
        `/api/presentaciones/${id}`,
        {
          method: "DELETE",
        },
      );

      await loadPresentaciones();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible desactivar la presentación.",
      );
    }
  };

  if (authLoading) {
    return (
      <div className="p-6">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        Debes iniciar sesión.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Presentaciones
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Administra las unidades o
            formatos utilizados para vender
            los productos.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Formulario */}

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <h2 className="text-lg font-semibold">
          {editingId
            ? "Editar presentación"
            : "Nueva presentación"}
        </h2>

        <div className="mt-4 grid gap-4">
          <div>
            <label
              htmlFor="nombre"
              className="mb-1 block text-sm font-medium"
            >
              Nombre
            </label>

            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(event) =>
                setNombre(
                  event.target.value,
                )
              }
              placeholder="Ej. Kilogramo"
              maxLength={100}
              required
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="descripcion"
              className="mb-1 block text-sm font-medium"
            >
              Descripción
            </label>

            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(event) =>
                setDescripcion(
                  event.target.value,
                )
              }
              placeholder="Descripción opcional"
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : editingId
                ? "Guardar cambios"
                : "Crear presentación"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Tabla */}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)]">
        {loading ? (
          <div className="p-6 text-sm text-[var(--muted)]">
            Cargando presentaciones...
          </div>
        ) : (
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-[var(--surface)]">
              <tr>
                <th className="px-4 py-3">
                  Nombre
                </th>

                <th className="px-4 py-3">
                  Descripción
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
              {presentaciones.map(
                (presentation) => (
                  <tr
                    key={
                      presentation.id
                    }
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3 font-medium">
                      {
                        presentation.nombre
                      }
                    </td>

                    <td className="px-4 py-3 text-[var(--muted)]">
                      {
                        presentation.descripcion ||
                        "Sin descripción"
                      }
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          presentation.activo
                            ? "rounded-full bg-[var(--secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]"
                            : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500"
                        }
                      >
                        {presentation.activo
                          ? "Activa"
                          : "Inactiva"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            editPresentation(
                              presentation,
                            )
                          }
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-hover)]"
                        >
                          Editar
                        </button>

                        {presentation.activo && (
                          <button
                            type="button"
                            onClick={() =>
                              void deletePresentation(
                                presentation.id,
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}

        {!loading &&
          presentaciones.length ===
            0 && (
            <div className="border-t border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
              No existen presentaciones
              registradas.
            </div>
          )}
      </div>
    </div>
  );
}