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
data?: Presentation | Presentation[];
}

export default function DashboardPresentacionesPage() {
const { user, loading: authLoading } = useAuth();

const [presentaciones, setPresentaciones] = useState<
Presentation[]

> ([]);

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [actionId, setActionId] = useState<string | null>(null);

const [error, setError] = useState<string | null>(null);

const [nombre, setNombre] = useState("");
const [descripcion, setDescripcion] = useState("");

const [editingId, setEditingId] = useState<string | null>(null);

const request = useCallback(
async (
url: string,
options: RequestInit = {},
): Promise<ApiResponse> => {
if (!user) {
throw new Error("Debes iniciar sesión.");
}

 
  const token = await user.getIdToken(true);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = (await response.json()) as ApiResponse;

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

const loadPresentaciones = useCallback(async () => {
try {
setLoading(true);
setError(null);

 
  const result = await request("/api/presentaciones");

  setPresentaciones(
    Array.isArray(result.data) ? result.data : [],
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
}, [user, loadPresentaciones]);

const resetForm = () => {
setNombre("");
setDescripcion("");
setEditingId(null);
};

const handleSubmit = async (
event: FormEvent<HTMLFormElement>,
) => {
event.preventDefault();

 
const nombreLimpio = nombre.trim();

if (!nombreLimpio) {
  setError("El nombre es obligatorio.");
  return;
}

try {
  setSaving(true);
  setError(null);

  const url = editingId
    ? `/api/presentaciones/${editingId}`
    : "/api/presentaciones";

  const method = editingId ? "PUT" : "POST";

  await request(url, {
    method,
    body: JSON.stringify({
      nombre: nombreLimpio,
      descripcion: descripcion.trim(),
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
setDescripcion(presentation.descripcion);

 
window.scrollTo({
  top: 0,
  behavior: "smooth",
});
 

};

const togglePresentation = async (
presentation: Presentation,
) => {
const activar = !presentation.activo;

 
const confirmed = window.confirm(
  activar
    ? `¿Deseas activar nuevamente la presentación "${presentation.nombre}"?`
    : `¿Deseas desactivar la presentación "${presentation.nombre}"?`,
);

if (!confirmed) {
  return;
}

try {
  setActionId(presentation.id);
  setError(null);

  await request(
    `/api/presentaciones/${presentation.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        activo: activar,
      }),
    },
  );

  await loadPresentaciones();
} catch (caught) {
  setError(
    caught instanceof Error
      ? caught.message
      : activar
        ? "No fue posible activar la presentación."
        : "No fue posible desactivar la presentación.",
  );
} finally {
  setActionId(null);
}
 

};

const deletePresentation = async (
presentation: Presentation,
) => {
if (presentation.activo) {
setError(
"Solo se pueden eliminar presentaciones desactivadas.",
);
return;
}

 
const confirmed = window.confirm(
  `¿Deseas eliminar definitivamente la presentación "${presentation.nombre}"? Esta acción no se puede deshacer.`,
);

if (!confirmed) {
  return;
}

try {
  setActionId(presentation.id);
  setError(null);

  await request(
    `/api/presentaciones/${presentation.id}`,
    {
      method: "DELETE",
    },
  );

  if (editingId === presentation.id) {
    resetForm();
  }

  await loadPresentaciones();
} catch (caught) {
  setError(
    caught instanceof Error
      ? caught.message
      : "No fue posible eliminar la presentación.",
  );
} finally {
  setActionId(null);
}
 

};

if (authLoading) {
return ( <div className="p-6">
Cargando... </div>
);
}

if (!user) {
return ( <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
Debes iniciar sesión. </div>
);
}

return ( <div>
{/* Encabezado */}

 
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">
        Presentaciones
      </h1>

      <p className="mt-1 text-sm text-[var(--muted)]">
        Administra las unidades o formatos utilizados
        para vender los productos.
      </p>
    </div>
  </div>

  {/* Error */}

  {error && (
    <div className="mt-5 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <span>{error}</span>

      <button
        type="button"
        onClick={() => setError(null)}
        className="font-semibold text-red-700 hover:text-red-900"
        aria-label="Cerrar mensaje"
      >
        ×
      </button>
    </div>
  )}

  {/* Formulario */}

  <form
    onSubmit={handleSubmit}
    className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
  >
    <div>
      <h2 className="text-lg font-semibold text-[var(--foreground)]">
        {editingId
          ? "Editar presentación"
          : "Nueva presentación"}
      </h2>

      <p className="mt-1 text-sm text-[var(--muted)]">
        {editingId
          ? "Modifica los datos de la presentación seleccionada."
          : "Registra una nueva presentación para utilizarla en los productos."}
      </p>
    </div>

    <div className="mt-4 grid gap-4">
      {/* Nombre */}

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
            setNombre(event.target.value)
          }
          placeholder="Ej. Kilogramo"
          maxLength={100}
          required
          disabled={saving}
          className="h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {/* Descripción */}

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
            setDescripcion(event.target.value)
          }
          placeholder="Descripción opcional"
          maxLength={500}
          rows={3}
          disabled={saving}
          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </div>

    {/* Botones formulario */}

    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
          disabled={saving}
          className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
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
      <table className="w-full min-w-[760px] text-left text-sm">
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
            (presentation) => {
              const processing =
                actionId === presentation.id;

              return (
                <tr
                  key={presentation.id}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                    {presentation.nombre}
                  </td>

                  <td className="px-4 py-3 text-[var(--muted)]">
                    {presentation.descripcion ||
                      "Sin descripción"}
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
                    <div className="flex flex-wrap gap-2">
                      {/* Editar */}

                      <button
                        type="button"
                        onClick={() =>
                          editPresentation(
                            presentation,
                          )
                        }
                        disabled={processing}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Editar
                      </button>

                      {/* Activar / Desactivar */}

                      <button
                        type="button"
                        onClick={() =>
                          void togglePresentation(
                            presentation,
                          )
                        }
                        disabled={processing}
                        className={
                          presentation.activo
                            ? "rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            : "rounded-lg border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                        }
                      >
                        {processing
                          ? "Procesando..."
                          : presentation.activo
                            ? "Desactivar"
                            : "Activar"}
                      </button>

                      {/* Eliminar definitivamente */}

                      {!presentation.activo && (
                        <button
                          type="button"
                          onClick={() =>
                            void deletePresentation(
                              presentation,
                            )
                          }
                          disabled={processing}
                          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processing
                            ? "Eliminando..."
                            : "Eliminar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    )}

    {!loading &&
      presentaciones.length === 0 && (
        <div className="border-t border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
          No existen presentaciones registradas.
        </div>
      )}
  </div>
</div>
);
}
