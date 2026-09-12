"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";

interface Productor {
  id: string;
  nombre: string;
  descripcion: string;
  telefono: string;
  correo: string;
  direccion: string;
  activo: boolean;
  fechaCreacion: string | null;
  fechaActualizacion: string | null;
}

interface ProductorForm {
  nombre: string;
  descripcion: string;
  telefono: string;
  correo: string;
  direccion: string;
  activo: boolean;
}

const EMPTY_FORM: ProductorForm = {
  nombre: "",
  descripcion: "",
  telefono: "",
  correo: "",
  direccion: "",
  activo: true,
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeProductor(data: Partial<Productor> & { id: string }): Productor {
  return {
    id: data.id,
    nombre: data.nombre ?? "",
    descripcion: data.descripcion ?? "",
    telefono: data.telefono ?? "",
    correo: data.correo ?? "",
    direccion: data.direccion ?? "",
    activo: data.activo !== false,
    fechaCreacion: data.fechaCreacion ?? null,
    fechaActualizacion: data.fechaActualizacion ?? null,
  };
}

export default function ProductoresPage() {
  const { user, loading: authLoading, role } = useAuth();

  const [productores, setProductores] = useState<Productor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<ProductorForm>(EMPTY_FORM);

  const getToken = useCallback(async () => {
    if (!user) {
      throw new Error("No hay una sesión activa.");
    }

    return user.getIdToken();
  }, [user]);

  const loadProductores = useCallback(async () => {
    if (!user || role !== "admin") {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const response = await fetch("/api/productores", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ?? "No fue posible cargar los productores.",
        );
      }

      const list = Array.isArray(data?.productores)
        ? data.productores
        : Array.isArray(data)
          ? data
          : [];

      setProductores(
        list.map((item: Partial<Productor> & { id: string }) =>
          normalizeProductor(item),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los productores.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, role, user]);

  useEffect(() => {
    if (!authLoading && user && role === "admin") {
      void loadProductores();
    }
  }, [authLoading, loadProductores, role, user]);

  const filteredProductores = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return productores;
    }

    return productores.filter((productor) => {
      return (
        productor.nombre.toLowerCase().includes(value) ||
        productor.correo.toLowerCase().includes(value) ||
        productor.telefono.toLowerCase().includes(value) ||
        productor.direccion.toLowerCase().includes(value)
      );
    });
  }, [productores, search]);

  const activeCount = useMemo(
    () => productores.filter((productor) => productor.activo).length,
    [productores],
  );

  const inactiveCount = productores.length - activeCount;

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function startCreate() {
    setError("");
    setSuccess("");
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(productor: Productor) {
    setError("");
    setSuccess("");

    setForm({
      nombre: productor.nombre,
      descripcion: productor.descripcion,
      telefono: productor.telefono,
      correo: productor.correo,
      direccion: productor.direccion,
      activo: productor.activo,
    });

    setEditingId(productor.id);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleFormChange(
    field: keyof ProductorForm,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const nombre = form.nombre.trim();

    if (!nombre) {
      setError("El nombre del productor es obligatorio.");
      return;
    }

    if (form.correo.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(form.correo.trim())) {
        setError("El correo electrónico no tiene un formato válido.");
        return;
      }
    }

    setSaving(true);

    try {
      const token = await getToken();

      const payload = {
        nombre,
        descripcion: form.descripcion.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim(),
        direccion: form.direccion.trim(),
        activo: form.activo,
      };

      const url = editingId
        ? `/api/productores/${encodeURIComponent(editingId)}`
        : "/api/productores";

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ??
            (editingId
              ? "No fue posible actualizar el productor."
              : "No fue posible crear el productor."),
        );
      }

      await loadProductores();

      setSuccess(
        editingId
          ? "Productor actualizado correctamente."
          : "Productor creado correctamente.",
      );

      resetForm();

      setTimeout(() => {
        setSuccess("");
      }, 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar el productor.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(productor: Productor) {
    setError("");
    setSuccess("");

    try {
      const token = await getToken();

      const response = await fetch(
        `/api/productores/${encodeURIComponent(productor.id)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: productor.nombre,
            descripcion: productor.descripcion,
            telefono: productor.telefono,
            correo: productor.correo,
            direccion: productor.direccion,
            activo: !productor.activo,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ?? "No fue posible cambiar el estado del productor.",
        );
      }

      await loadProductores();

      setSuccess(
        productor.activo
          ? "Productor desactivado correctamente."
          : "Productor activado correctamente.",
      );

      setTimeout(() => {
        setSuccess("");
      }, 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cambiar el estado del productor.",
      );
    }
  }

  async function handleDelete(productor: Productor) {
    const confirmed = window.confirm(
      `¿Deseas eliminar permanentemente al productor "${productor.nombre}"?\n\nEsta acción no debería utilizarse si el productor tiene productos u otros registros relacionados.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const token = await getToken();

      const response = await fetch(
        `/api/productores/${encodeURIComponent(productor.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ?? "No fue posible eliminar el productor.",
        );
      }

      setProductores((current) =>
        current.filter((item) => item.id !== productor.id),
      );

      if (editingId === productor.id) {
        resetForm();
      }

      setSuccess("Productor eliminado correctamente.");

      setTimeout(() => {
        setSuccess("");
      }, 4000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar el productor.",
      );
    }
  }

  /*
   * ================================================
   * Estados de autenticación
   * ================================================
   */

  if (authLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
          aria-label="Cargando"
        />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Acceso restringido
          </h1>

          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            Debes iniciar sesión para administrar los productores.
          </p>
        </div>
      </main>
    );
  }

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Sin permisos
          </h1>

          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            Solo los administradores pueden administrar los productores.
          </p>
        </div>
      </main>
    );
  }

  /*
   * ================================================
   * Dashboard de Productores
   * ================================================
   */

  return (
    <section className="space-y-6">
      {/* Encabezado */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--primary)]">
            Administración
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[var(--foreground)]">
            Productores
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-[var(--foreground)]/70">
            Administra los productores registrados en Canastas Verdes.
          </p>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          + Nuevo productor
        </button>
      </div>

      {/* Mensajes */}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-4 py-3 text-sm font-medium text-[var(--primary)]"
        >
          {success}
        </div>
      )}

      {/* Indicadores */}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--foreground)]/65">
            Total productores
          </p>

          <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
            {productores.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--foreground)]/65">
            Productores activos
          </p>

          <p className="mt-2 text-3xl font-bold text-[var(--primary)]">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--foreground)]/65">
            Productores inactivos
          </p>

          <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Formulario */}

      {showForm && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                {editingId ? "Editar productor" : "Nuevo productor"}
              </h2>

              <p className="mt-1 text-sm text-[var(--foreground)]/65">
                {editingId
                  ? "Actualiza la información del productor."
                  : "Registra un nuevo productor."}
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="text-sm font-medium text-[var(--foreground)]/65 hover:text-[var(--primary)] disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-5 md:grid-cols-2"
          >
            {/* Nombre */}

            <div>
              <label
                htmlFor="productor-nombre"
                className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
              >
                Nombre del productor *
              </label>

              <input
                id="productor-nombre"
                type="text"
                value={form.nombre}
                onChange={(event) =>
                  handleFormChange("nombre", event.target.value)
                }
                placeholder="Ej. Asociación Agropecuaria La Esperanza"
                maxLength={150}
                required
                disabled={saving}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Teléfono */}

            <div>
              <label
                htmlFor="productor-telefono"
                className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
              >
                Teléfono
              </label>

              <input
                id="productor-telefono"
                type="tel"
                value={form.telefono}
                onChange={(event) =>
                  handleFormChange("telefono", event.target.value)
                }
                placeholder="Ej. 3001234567"
                maxLength={30}
                disabled={saving}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Correo */}

            <div>
              <label
                htmlFor="productor-correo"
                className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
              >
                Correo electrónico
              </label>

              <input
                id="productor-correo"
                type="email"
                value={form.correo}
                onChange={(event) =>
                  handleFormChange("correo", event.target.value)
                }
                placeholder="Ej. contacto@productor.com"
                maxLength={150}
                disabled={saving}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Dirección */}

            <div>
              <label
                htmlFor="productor-direccion"
                className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
              >
                Dirección
              </label>

              <input
                id="productor-direccion"
                type="text"
                value={form.direccion}
                onChange={(event) =>
                  handleFormChange("direccion", event.target.value)
                }
                placeholder="Dirección o ubicación"
                maxLength={250}
                disabled={saving}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Descripción */}

            <div className="md:col-span-2">
              <label
                htmlFor="productor-descripcion"
                className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]"
              >
                Descripción
              </label>

              <textarea
                id="productor-descripcion"
                value={form.descripcion}
                onChange={(event) =>
                  handleFormChange("descripcion", event.target.value)
                }
                placeholder="Información adicional sobre el productor..."
                maxLength={500}
                rows={4}
                disabled={saving}
                className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Estado */}

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(event) =>
                    handleFormChange("activo", event.target.checked)
                  }
                  disabled={saving}
                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                />

                <span>
                  <span className="block text-sm font-semibold text-[var(--foreground)]">
                    Productor activo
                  </span>

                  <span className="mt-1 block text-xs text-[var(--foreground)]/65">
                    Los productores inactivos podrán conservarse como
                    referencia histórica sin estar disponibles para nuevos
                    procesos.
                  </span>
                </span>
              </label>
            </div>

            {/* Acciones */}

            <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end md:col-span-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Crear productor"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listado */}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                Productores registrados
              </h2>

              <p className="mt-1 text-sm text-[var(--foreground)]/65">
                {filteredProductores.length}{" "}
                {filteredProductores.length === 1
                  ? "resultado"
                  : "resultados"}
              </p>
            </div>

            <div className="w-full lg:max-w-sm">
              <label htmlFor="productores-search" className="sr-only">
                Buscar productores
              </label>

              <input
                id="productores-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar productor..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center p-6">
            <div className="text-center">
              <div
                className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
                aria-label="Cargando productores"
              />

              <p className="mt-3 text-sm text-[var(--foreground)]/65">
                Cargando productores...
              </p>
            </div>
          </div>
        ) : filteredProductores.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--secondary)] text-2xl text-[var(--primary)]">
              P
            </div>

            <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
              {search.trim()
                ? "No se encontraron productores"
                : "Aún no hay productores"}
            </h3>

            <p className="mx-auto max-w-md py-2 text-center text-sm text-[var(--foreground)]/65">
            {search.trim()
            ? "Prueba con otro nombre, correo, teléfono o dirección."
            : "Crea el primer productor para comenzar a administrar este módulo."}
            </p>

            {!search.trim() && (
              <button
                type="button"
                onClick={startCreate}
                className="mt-5 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
              >
                Crear primer productor
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Vista escritorio */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                      Productor
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                      Contacto
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                      Ubicación
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                      Estado
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                      Actualización
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProductores.map((productor) => (
                    <tr
                      key={productor.id}
                      className="border-b border-[var(--border)] last:border-b-0"
                    >
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[var(--foreground)]">
                          {productor.nombre}
                        </p>

                        {productor.descripcion && (
                          <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--foreground)]/60">
                            {productor.descripcion}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1 text-sm text-[var(--foreground)]/75">
                          {productor.telefono ? (
                            <p>{productor.telefono}</p>
                          ) : (
                            <p className="text-[var(--foreground)]/40">
                              Sin teléfono
                            </p>
                          )}

                          {productor.correo ? (
                            <p className="max-w-xs break-all text-xs">
                              {productor.correo}
                            </p>
                          ) : (
                            <p className="text-xs text-[var(--foreground)]/40">
                              Sin correo
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <p className="max-w-xs text-sm text-[var(--foreground)]/75">
                          {productor.direccion || (
                            <span className="text-[var(--foreground)]/40">
                              Sin dirección
                            </span>
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            productor.activo
                              ? "bg-[var(--secondary)] text-[var(--primary)]"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {productor.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top text-xs text-[var(--foreground)]/60">
                        {formatDate(
                          productor.fechaActualizacion ??
                            productor.fechaCreacion,
                        )}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(productor)}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleActive(productor)}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
                          >
                            {productor.activo ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(productor)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista móvil */}

            <div className="divide-y divide-[var(--border)] md:hidden">
              {filteredProductores.map((productor) => (
                <article key={productor.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-[var(--foreground)]">
                        {productor.nombre}
                      </h3>

                      {productor.descripcion && (
                        <p className="mt-1 text-xs leading-5 text-[var(--foreground)]/60">
                          {productor.descripcion}
                        </p>
                      )}
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        productor.activo
                          ? "bg-[var(--secondary)] text-[var(--primary)]"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {productor.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div>
                      <span className="font-semibold text-[var(--foreground)]">
                        Teléfono:
                      </span>{" "}
                      <span className="text-[var(--foreground)]/70">
                        {productor.telefono || "No registrado"}
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-[var(--foreground)]">
                        Correo:
                      </span>{" "}
                      <span className="break-all text-[var(--foreground)]/70">
                        {productor.correo || "No registrado"}
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-[var(--foreground)]">
                        Dirección:
                      </span>{" "}
                      <span className="text-[var(--foreground)]/70">
                        {productor.direccion || "No registrada"}
                      </span>
                    </div>

                    <div className="pt-1 text-xs text-[var(--foreground)]/50">
                      Actualizado:{" "}
                      {formatDate(
                        productor.fechaActualizacion ??
                          productor.fechaCreacion,
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(productor)}
                      className="rounded-lg border border-[var(--border)] px-2 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleActive(productor)}
                      className="rounded-lg border border-[var(--border)] px-2 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]"
                    >
                      {productor.activo ? "Desactivar" : "Activar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(productor)}
                      className="rounded-lg border border-red-200 px-2 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}