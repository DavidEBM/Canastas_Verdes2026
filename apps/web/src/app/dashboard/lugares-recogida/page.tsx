"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";

interface PuntoRecogida {
  id: string;
  nombre: string;
  direccion: string;
  municipio: string;
  IdMunicipalidad: string;
  horaInicio: string;
  horaFin: string;
  horario: string;
  telefono: string;
  activo: boolean;
  googleMapsUrl: string;
}

interface Municipalidad {
  id: string;
  nombre: string;
  activo: boolean;
}

interface FormData {
  nombre: string;
  direccion: string;
  IdMunicipalidad: string;
  horaInicio: string;
  horaFin: string;
  telefono: string;
}

const emptyForm: FormData = {
  nombre: "",
  direccion: "",
  IdMunicipalidad: "",
  horaInicio: "08:00",
  horaFin: "17:00",
  telefono: "",
};

export default function LugaresRecogidaPage() {
  const {
    loading: authLoading,
    user,
    role,
  } = useAuth();

  const [puntos, setPuntos] = useState<
    PuntoRecogida[]
  >([]);

  const [municipalidades, setMunicipalidades] =
    useState<Municipalidad[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    municipalidadFilter,
    setMunicipalidadFilter,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("todos");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<FormData>(emptyForm);

  async function getToken() {
    if (!user) {
      throw new Error(
        "No hay sesión activa."
      );
    }

    return user.getIdToken();
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const [
        pointsResponse,
        municipalitiesResponse,
      ] = await Promise.all([
        fetch(
          "/api/puntos-recogida?admin=1",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),

        fetch("/api/municipalidades", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const pointsJson =
        await pointsResponse.json();

      const municipalitiesJson =
        await municipalitiesResponse.json();

      if (
        !pointsResponse.ok ||
        !pointsJson.success
      ) {
        throw new Error(
          pointsJson.message ||
            "No fue posible cargar los puntos de recogida."
        );
      }

      if (
        !municipalitiesResponse.ok ||
        !municipalitiesJson.success
      ) {
        throw new Error(
          municipalitiesJson.message ||
            "No fue posible cargar las municipalidades."
        );
      }

      setPuntos(
        pointsJson.data ?? []
      );

      const municipalitiesData =
        municipalitiesJson.data ??
        municipalitiesJson.municipalidades ??
        [];

      setMunicipalidades(
        municipalitiesData.map(
          (item: any) => ({
            id:
              item.id ??
              item.IdMunicipalidad ??
              "",

            nombre:
              item.nombre ??
              item.Nombre ??
              "",

            activo:
              item.activo !== undefined
                ? item.activo
                : item.Activo !== false,
          })
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar la información."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      !authLoading &&
      user &&
      role === "admin"
    ) {
      loadData();
    }
  }, [
    authLoading,
    user,
    role,
  ]);

  const filteredPoints = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return puntos.filter((point) => {
      const matchesSearch =
        !query ||
        point.nombre
          .toLowerCase()
          .includes(query) ||
        point.direccion
          .toLowerCase()
          .includes(query) ||
        point.municipio
          .toLowerCase()
          .includes(query);

      const matchesMunicipality =
        !municipalidadFilter ||
        point.IdMunicipalidad ===
          municipalidadFilter;

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "activos" &&
          point.activo) ||
        (statusFilter === "inactivos" &&
          !point.activo);

      return (
        matchesSearch &&
        matchesMunicipality &&
        matchesStatus
      );
    });
  }, [
    puntos,
    search,
    municipalidadFilter,
    statusFilter,
  ]);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEdit(
    point: PuntoRecogida
  ) {
    setEditingId(point.id);

    setForm({
      nombre: point.nombre,
      direccion: point.direccion,
      IdMunicipalidad:
        point.IdMunicipalidad,
      horaInicio:
        point.horaInicio || "",
      horaFin:
        point.horaFin || "",
      telefono:
        point.telefono || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm({
      ...emptyForm,
    });
  }

  function updateField(
    field: keyof FormData,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (
        (form.horaInicio &&
          !form.horaFin) ||
        (!form.horaInicio &&
          form.horaFin)
      ) {
        throw new Error(
          "Selecciona la hora de apertura y la hora de cierre."
        );
      }

      if (
        form.horaInicio &&
        form.horaFin &&
        form.horaInicio >=
          form.horaFin
      ) {
        throw new Error(
          "La hora de cierre debe ser posterior a la hora de apertura."
        );
      }

      const token =
        await getToken();

      const response =
        await fetch(
          editingId
            ? `/api/puntos-recogida/${editingId}`
            : "/api/puntos-recogida",
          {
            method: editingId
              ? "PATCH"
              : "POST",

            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify(form),
          }
        );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.message ||
            "No fue posible guardar el punto de recogida."
        );
      }

      setSuccess(
        editingId
          ? "Punto de recogida actualizado correctamente."
          : "Punto de recogida creado correctamente."
      );

      setShowForm(false);
      setEditingId(null);
      setForm({
        ...emptyForm,
      });

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar el punto."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePoint(
    point: PuntoRecogida
  ) {
    try {
      setError("");
      setSuccess("");

      const token =
        await getToken();

      const response =
        await fetch(
          `/api/puntos-recogida/${point.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              activo:
                !point.activo,
            }),
          }
        );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.message ||
            "No fue posible cambiar el estado."
        );
      }

      setSuccess(
        point.activo
          ? "Punto de recogida desactivado."
          : "Punto de recogida activado."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cambiar el estado."
      );
    }
  }

  async function deletePoint(
    point: PuntoRecogida
  ) {
    const confirmed =
      window.confirm(
        `¿Deseas desactivar "${point.nombre}"?`
      );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const token =
        await getToken();

      const response =
        await fetch(
          `/api/puntos-recogida/${point.id}`,
          {
            method: "DELETE",

            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.message ||
            "No fue posible desactivar el punto."
        );
      }

      setSuccess(
        "Punto de recogida desactivado correctamente."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible desactivar el punto."
      );
    }
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--foreground)]/70">
          Cargando lugares de recogida...
        </p>
      </main>
    );
  }

  if (
    !user ||
    role !== "admin"
  ) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Acceso restringido
          </h1>

          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            Esta sección está disponible únicamente para administradores.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section>
        <p className="text-sm font-medium text-[var(--primary)]">
          Panel administrativo
        </p>

        <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Lugares de recogida
            </h1>

            <p className="mt-2 text-sm text-[var(--foreground)]/70">
              Administra los puntos donde los consumidores pueden recoger sus pedidos.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            + Nuevo lugar
          </button>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                {editingId
                  ? "Editar lugar de recogida"
                  : "Nuevo lugar de recogida"}
              </h2>

              <p className="mt-1 text-sm text-[var(--foreground)]/60">
                Registra los datos básicos del punto.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="text-sm font-semibold text-[var(--foreground)]/60 hover:text-[var(--foreground)] disabled:opacity-50"
            >
              Cerrar
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-5 md:grid-cols-2"
          >
            <div>
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Nombre del lugar *
              </label>

              <input
                value={form.nombre}
                onChange={(event) =>
                  updateField(
                    "nombre",
                    event.target.value
                  )
                }
                required
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--primary)]"
                placeholder="Ej. Plaza de Nariño"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Municipalidad *
              </label>

              <select
                value={
                  form.IdMunicipalidad
                }
                onChange={(event) =>
                  updateField(
                    "IdMunicipalidad",
                    event.target.value
                  )
                }
                required
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--primary)]"
              >
                <option value="">
                  Seleccionar municipalidad
                </option>

                {municipalidades
                  .filter(
                    (municipio) =>
                      municipio.activo
                  )
                  .map(
                    (municipio) => (
                      <option
                        key={
                          municipio.id
                        }
                        value={
                          municipio.id
                        }
                      >
                        {
                          municipio.nombre
                        }
                      </option>
                    )
                  )}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Dirección *
              </label>

              <input
                value={form.direccion}
                onChange={(event) =>
                  updateField(
                    "direccion",
                    event.target.value
                  )
                }
                required
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--primary)]"
                placeholder="Ej. Carrera 25 #18-01"
              />

              <p className="mt-1.5 text-xs text-[var(--foreground)]/60">
                Esta dirección se utilizará automáticamente para generar la ubicación en Google Maps.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Hora de apertura
              </label>

              <input
                type="time"
                value={
                  form.horaInicio
                }
                onChange={(event) =>
                  updateField(
                    "horaInicio",
                    event.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Hora de cierre
              </label>

              <input
                type="time"
                value={
                  form.horaFin
                }
                onChange={(event) =>
                  updateField(
                    "horaFin",
                    event.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="md:col-span-2">
              <p className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-xs text-[var(--foreground)]/65">
                Selecciona ambas horas si el lugar tiene un horario de atención. El sistema guardará automáticamente el horario y generará el enlace de Google Maps.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Teléfono
              </label>

              <input
                type="tel"
                value={
                  form.telefono
                }
                onChange={(event) =>
                  updateField(
                    "telefono",
                    event.target.value
                  )
                }
                inputMode="tel"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--primary)]"
                placeholder="Ej. 300 123 4567"
              />
            </div>

            <div className="flex items-end justify-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Crear lugar"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar lugar, dirección o municipio..."
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
          />

          <select
            value={
              municipalidadFilter
            }
            onChange={(event) =>
              setMunicipalidadFilter(
                event.target.value
              )
            }
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="">
              Todas las municipalidades
            </option>

            {municipalidades.map(
              (municipio) => (
                <option
                  key={municipio.id}
                  value={municipio.id}
                >
                  {municipio.nombre}
                </option>
              )
            )}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="todos">
              Todos los estados
            </option>
            <option value="activos">
              Activos
            </option>
            <option value="inactivos">
              Inactivos
            </option>
          </select>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-[var(--border)] bg-[var(--surface)]">
              <tr>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                  Lugar
                </th>

                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                  Municipalidad
                </th>

                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                  Horario
                </th>

                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                  Teléfono
                </th>

                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                  Estado
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border)]">
              {filteredPoints.map(
                (point) => (
                  <tr
                    key={point.id}
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[var(--foreground)]">
                        {
                          point.nombre
                        }
                      </p>

                      <p className="mt-1 text-sm text-[var(--foreground)]/60">
                        {
                          point.direccion
                        }
                      </p>

                      {point.googleMapsUrl && (
                        <a
                          href={
                            point.googleMapsUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex text-xs font-semibold text-[var(--primary)] hover:underline"
                        >
                          Ver en Google Maps
                        </a>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--foreground)]">
                      {
                        point.municipio ||
                        "—"
                      }
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--foreground)]/70">
                      {
                        point.horario ||
                        "—"
                      }
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--foreground)]/70">
                      {
                        point.telefono ||
                        "—"
                      }
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          point.activo
                            ? "bg-[var(--secondary)] text-[var(--primary)]"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {point.activo
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              point
                            )
                          }
                          className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface)]"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            togglePoint(
                              point
                            )
                          }
                          className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
                        >
                          {point.activo
                            ? "Desactivar"
                            : "Activar"}
                        </button>

                        {point.activo && (
                          <button
                            type="button"
                            onClick={() =>
                              deletePoint(
                                point
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}

              {filteredPoints.length ===
                0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[var(--foreground)]/60"
                  >
                    No se encontraron lugares de recogida.
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