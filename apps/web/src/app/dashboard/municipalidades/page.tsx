"use client";

import {
FormEvent,
useCallback,
useEffect,
useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";

interface Municipality {
id: string;
nombre: string;
activo: boolean;
fechaCreacion?: unknown;
ultimaActualizacion?: unknown;
clausura?: unknown;
}

interface ApiResponse {
success?: boolean;
message?: string;
data?: Municipality | Municipality[];
}

export default function DashboardMunicipalidadesPage() {
const {
user,
loading: authLoading,
role,
} = useAuth();

const [municipalities, setMunicipalities] =
useState<Municipality[]>([]);

const [loading, setLoading] =
useState(true);

const [saving, setSaving] =
useState(false);

const [actionId, setActionId] =
useState<string | null>(null);

const [error, setError] =
useState<string | null>(null);

const [success, setSuccess] =
useState<string | null>(null);

const [nombre, setNombre] =
useState("");

const [editingId, setEditingId] =
useState<string | null>(null);

const [editingNombre, setEditingNombre] =
useState("");

/* =======================================================
REQUEST
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

  const response = await fetch(
    url,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":
          "application/json",
        ...(options.headers ?? {}),
      },
    },
  );

  const result: unknown =
    await response.json();

  if (
    !response.ok ||
    !result ||
    typeof result !== "object"
  ) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "No fue posible completar la operación.";

    throw new Error(message);
  }

  return result as ApiResponse;
},
[user],
  

);

/* =======================================================
CARGAR
======================================================= */

const loadMunicipalities =
useCallback(async () => {
try {
setLoading(true);
setError(null);

  
    const result =
      await request(
        "/api/municipalidades",
      );

    setMunicipalities(
      Array.isArray(result.data)
        ? result.data
        : [],
    );
  } catch (caught) {
    setError(
      caught instanceof Error
        ? caught.message
        : "No fue posible cargar las municipalidades.",
    );
  } finally {
    setLoading(false);
  }
}, [request]);
  

useEffect(() => {
if (
user &&
role === "admin"
) {
void loadMunicipalities();
}
}, [
user,
role,
loadMunicipalities,
]);

/* =======================================================
CREAR
======================================================= */

const createMunicipality =
async (
event?: FormEvent,
) => {
event?.preventDefault();

  
  const value =
    nombre.trim();

  if (!value) {
    setError(
      "El nombre de la municipalidad es obligatorio.",
    );
    return;
  }

  try {
    setSaving(true);
    setError(null);
    setSuccess(null);

    await request(
      "/api/municipalidades",
      {
        method: "POST",
        body: JSON.stringify({
          nombre: value,
        }),
      },
    );

    setNombre("");

    setSuccess(
      "Municipalidad creada correctamente.",
    );

    await loadMunicipalities();
  } catch (caught) {
    setError(
      caught instanceof Error
        ? caught.message
        : "No fue posible crear la municipalidad.",
    );
  } finally {
    setSaving(false);
  }
};
  

/* =======================================================
EDITAR
======================================================= */

const startEditing = (
municipality: Municipality,
) => {
setEditingId(
municipality.id,
);

  
setEditingNombre(
  municipality.nombre,
);

setError(null);
setSuccess(null);
  

};

const cancelEditing = () => {
setEditingId(null);
setEditingNombre("");
};

const saveEditing =
async () => {
if (!editingId) {
return;
}

  
  const value =
    editingNombre.trim();

  if (!value) {
    setError(
      "El nombre de la municipalidad es obligatorio.",
    );
    return;
  }

  try {
    setSaving(true);
    setError(null);
    setSuccess(null);

    await request(
      `/api/municipalidades/${editingId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          nombre: value,
        }),
      },
    );

    cancelEditing();

    setSuccess(
      "Municipalidad actualizada correctamente.",
    );

    await loadMunicipalities();
  } catch (caught) {
    setError(
      caught instanceof Error
        ? caught.message
        : "No fue posible actualizar la municipalidad.",
    );
  } finally {
    setSaving(false);
  }
};
  

/* =======================================================
ACTIVAR / DESACTIVAR
======================================================= */

const toggleMunicipality =
async (
municipality: Municipality,
) => {
const activar =
!municipality.activo;

  
  const confirmed =
    window.confirm(
      activar
        ? `¿Deseas activar nuevamente "${municipality.nombre}"?`
        : `¿Deseas desactivar "${municipality.nombre}"?`,
    );

  if (!confirmed) {
    return;
  }

  try {
    setActionId(
      municipality.id,
    );

    setError(null);
    setSuccess(null);

    await request(
      `/api/municipalidades/${municipality.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          activo: activar,
        }),
      },
    );

    setSuccess(
      activar
        ? "Municipalidad activada correctamente."
        : "Municipalidad desactivada correctamente.",
    );

    await loadMunicipalities();
  } catch (caught) {
    setError(
      caught instanceof Error
        ? caught.message
        : "No fue posible cambiar el estado de la municipalidad.",
    );
  } finally {
    setActionId(null);
  }
};
  

/* =======================================================
ELIMINAR DEFINITIVAMENTE
======================================================= */

const deleteMunicipality =
async (
municipality: Municipality,
) => {
if (municipality.activo) {
setError(
"Solo se pueden eliminar municipalidades desactivadas.",
);
return;
}

  
  const confirmed =
    window.confirm(
      `¿Deseas eliminar definitivamente "${municipality.nombre}"?\n\nEsta acción no se puede deshacer.`,
    );

  if (!confirmed) {
    return;
  }

  try {
    setActionId(
      municipality.id,
    );

    setError(null);
    setSuccess(null);

    await request(
      `/api/municipalidades/${municipality.id}`,
      {
        method: "DELETE",
      },
    );

    if (
      editingId ===
      municipality.id
    ) {
      cancelEditing();
    }

    setSuccess(
      "Municipalidad eliminada definitivamente.",
    );

    await loadMunicipalities();
  } catch (caught) {
    setError(
      caught instanceof Error
        ? caught.message
        : "No fue posible eliminar la municipalidad.",
    );
  } finally {
    setActionId(null);
  }
};
  

/* =======================================================
ACCESO
======================================================= */

if (authLoading) {
return ( <main className="flex min-h-[50vh] items-center justify-center"> <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" /> </main>
);
}

if (
!user ||
role !== "admin"
) {
return ( <main className="mx-auto max-w-3xl px-4 py-12"> <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center"> <h1 className="text-2xl font-bold">
Acceso restringido </h1>

  
      <p className="mt-2 text-sm text-[var(--muted)]">
        Solo los administradores pueden
        gestionar municipalidades.
      </p>
    </div>
  </main>
);
  

}

/* =======================================================
RENDER
======================================================= */

return ( <main>
{/* ENCABEZADO */}

  
  <div>
    <h1 className="text-2xl font-bold text-[var(--foreground)]">
      Municipalidades
    </h1>

    <p className="mt-2 text-sm text-[var(--muted)]">
      Administra las municipalidades
      disponibles para los productos y
      pedidos.
    </p>
  </div>

  {/* MENSAJES */}

  {error && (
    <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <span>{error}</span>

      <button
        type="button"
        onClick={() =>
          setError(null)
        }
        className="font-bold"
      >
        ×
      </button>
    </div>
  )}

  {success && (
    <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
      <span>{success}</span>

      <button
        type="button"
        onClick={() =>
          setSuccess(null)
        }
        className="font-bold"
      >
        ×
      </button>
    </div>
  )}

  {/* ===================================================
      CREAR
  =================================================== */}

  <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
    <h2 className="text-lg font-semibold">
      Nueva municipalidad
    </h2>

    <form
      onSubmit={(event) =>
        void createMunicipality(
          event,
        )
      }
      className="mt-4 flex flex-col gap-3 sm:flex-row"
    >
      <input
        type="text"
        value={nombre}
        onChange={(event) =>
          setNombre(
            event.target.value,
          )
        }
        placeholder="Nombre de la municipalidad"
        maxLength={150}
        disabled={saving}
        className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)] disabled:opacity-50"
      />

      <button
        type="submit"
        disabled={
          saving ||
          !nombre.trim()
        }
        className="h-11 rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Guardando..."
          : "Crear"}
      </button>
    </form>
  </section>

  {/* ===================================================
      LISTA
  =================================================== */}

  <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)]">
    <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <h2 className="font-semibold">
        Municipalidades registradas
      </h2>
    </div>

    {loading ? (
      <div className="p-8 text-center text-sm text-[var(--muted)]">
        Cargando municipalidades...
      </div>
    ) : municipalities.length ===
      0 ? (
      <div className="p-8 text-center text-sm text-[var(--muted)]">
        No hay municipalidades
        registradas.
      </div>
    ) : (
      <div className="divide-y divide-[var(--border)]">
        {municipalities.map(
          (municipality) => {
            const busy =
              actionId ===
              municipality.id;

            return (
              <div
                key={
                  municipality.id
                }
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* INFORMACIÓN / EDICIÓN */}

                {editingId ===
                municipality.id ? (
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={
                        editingNombre
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditingNombre(
                          event
                            .target
                            .value,
                        )
                      }
                      maxLength={150}
                      disabled={
                        saving
                      }
                      className="h-10 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)] disabled:opacity-50"
                    />

                    <button
                      type="button"
                      disabled={
                        saving ||
                        !editingNombre.trim()
                      }
                      onClick={() =>
                        void saveEditing()
                      }
                      className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? "Guardando..."
                        : "Guardar"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={
                        cancelEditing
                      }
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-[var(--foreground)]">
                          {
                            municipality.nombre
                          }
                        </p>

                        <span
                          className={
                            municipality.activo
                              ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                              : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                          }
                        >
                          {municipality.activo
                            ? "Activa"
                            : "Inactiva"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        ID:{" "}
                        {
                          municipality.id
                        }
                      </p>
                    </div>

                    {/* =================================================
                        BOTONES CRUD
                    ================================================= */}

                    <div className="flex flex-wrap gap-2">
                      {/* EDITAR */}

                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          startEditing(
                            municipality,
                          )
                        }
                        className="rounded-lg border border-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Editar
                      </button>

                      {/* ACTIVAR / DESACTIVAR */}

                      {municipality.activo ? (
                        <button
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            void toggleMunicipality(
                              municipality,
                            )
                          }
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy
                            ? "Procesando..."
                            : "Desactivar"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            void toggleMunicipality(
                              municipality,
                            )
                          }
                          className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy
                            ? "Procesando..."
                            : "Activar"}
                        </button>
                      )}

                      {/* ELIMINAR */}

                      {!municipality.activo && (
                        <button
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            void deleteMunicipality(
                              municipality,
                            )
                          }
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy
                            ? "Eliminando..."
                            : "Eliminar"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          },
        )}
      </div>
    )}
  </section>
</main>
);
}
