"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useAuth,
  type UserRole,
} from "@/hooks/useAuth";

interface ManagedUser {
  uid: string;
  email: string;
  displayName: string;
  disabled: boolean;
  role: UserRole;
}

const roles: UserRole[] = [
  "consumidor",
  "repartidor",
  "admin",
];

const roleLabels: Record<UserRole, string> = {
  consumidor: "Consumidor",
  repartidor: "Repartidor",
  admin: "Administrador",
};

function isUserRole(
  value: string,
): value is UserRole {
  return roles.includes(
    value as UserRole,
  );
}

export default function DashboardUsuariosPage() {
  const {
    user,
    loading,
    role: currentRole,
  } = useAuth();

  const [users, setUsers] = useState<
    ManagedUser[]
  >([]);

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState<string | null>(null);

  const [ready, setReady] =
    useState(false);

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
        "/api/usuarios/roles",
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

      let result: unknown = null;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "El servidor devolvió una respuesta inválida.",
        );
      }

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "No fue posible gestionar los roles.";

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
          setUsers(
            result.data as ManagedUser[],
          );
        } else {
          throw new Error(
            "La respuesta de usuarios no tiene un formato válido.",
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar los usuarios.",
        );
      } finally {
        setReady(true);
      }
    },
    [request],
  );

  useEffect(() => {
    if (
      user &&
      currentRole === "admin"
    ) {
      void load();
    } else if (!loading) {
      setReady(true);
    }
  }, [
    user,
    currentRole,
    loading,
    load,
  ]);

  const changeRole = async (
    uid: string,
    nextRole: UserRole,
  ) => {
    if (!user) {
      return;
    }

    /*
     * Evita que el administrador actual
     * se quite accidentalmente sus propios
     * permisos desde la interfaz.
     */
    if (uid === user.uid) {
      setError(
        "No puedes cambiar tu propio rol desde este panel.",
      );
      return;
    }

    const managedUser =
      users.find(
        (item) => item.uid === uid,
      );

    if (!managedUser) {
      setError(
        "El usuario seleccionado no existe.",
      );
      return;
    }

    if (managedUser.role === nextRole) {
      return;
    }

    const confirmed =
      window.confirm(
        `¿Cambiar el rol de ${
          managedUser.displayName ||
          managedUser.email ||
          "este usuario"
        } a "${roleLabels[nextRole]}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(uid);
      setError(null);
      setNotice(null);

      await request("POST", {
        usuarioId: uid,
        rol: nextRole,
      });

      setUsers(
        (current) =>
          current.map(
            (item) =>
              item.uid === uid
                ? {
                    ...item,
                    role: nextRole,
                  }
                : item,
          ),
      );

      setNotice(
        `Rol actualizado correctamente a ${roleLabels[nextRole]}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible actualizar el rol.",
      );
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-[var(--muted)]">
          Cargando autenticación…
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-bold">
          Gestión de usuarios
        </h1>

        <p className="mt-2 text-[var(--muted)]">
          Debes iniciar sesión para
          administrar los roles.
        </p>
      </main>
    );
  }

  if (currentRole !== "admin") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-bold">
          Acceso restringido
        </h1>

        <p className="mt-2 text-[var(--muted)]">
          Esta sección está disponible
          únicamente para administradores.
        </p>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-[var(--muted)]">
          Cargando usuarios…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Usuarios y roles
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Administra los permisos de los
            usuarios registrados en Canastas
            Verdes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={saving !== null}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {/* Información */}
      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-sm text-[var(--foreground)]">
          Entiendase por
          <strong> Consumidor </strong>
          a los clientes y usuarios de la web que pueden crear su perfil y realizar pedidos.<br />
          Entiendase por<strong> Repartidor </strong>
          a aquellos encargados de entregas para domicilios o encargados de los lugares de entregas presenciales en los almacenes de recogida.<br />
          Entiendase por<strong> Administrador </strong>
          a todos los encargados con permisos para crear, modificar, eliminar, asignar pedidos, gestionar roles, lugares, productos y etc.
        </p>
      </div>

      {/* Mensajes */}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </div>
      )}

      {/* Tabla */}
      <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-[var(--surface)]">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  Usuario
                </th>

                <th className="px-4 py-3 font-semibold">
                  Correo
                </th>

                <th className="px-4 py-3 font-semibold">
                  Estado
                </th>

                <th className="px-4 py-3 font-semibold">
                  Rol
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map(
                (managedUser) => {
                  const isCurrentUser =
                    managedUser.uid ===
                    user.uid;

                  const isSaving =
                    saving ===
                    managedUser.uid;

                  return (
                    <tr
                      key={managedUser.uid}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {managedUser.displayName ||
                            "Sin nombre"}
                        </p>

                        {isCurrentUser && (
                          <span className="text-xs text-[var(--primary)]">
                            Tu cuenta
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-[var(--muted)]">
                        {managedUser.email ||
                          "Sin correo"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={
                            managedUser.disabled
                              ? "text-red-700"
                              : "text-green-700"
                          }
                        >
                          {managedUser.disabled
                            ? "Deshabilitado"
                            : "Activo"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={
                            isUserRole(
                              managedUser.role,
                            )
                              ? managedUser.role
                              : "consumidor"
                          }
                          disabled={
                            isCurrentUser ||
                            isSaving
                          }
                          aria-label={`Rol de ${
                            managedUser.displayName ||
                            managedUser.email
                          }`}
                          onChange={(
                            event,
                          ) => {
                            const value =
                              event.target
                                .value;

                            if (
                              isUserRole(
                                value,
                              )
                            ) {
                              void changeRole(
                                managedUser.uid,
                                value,
                              );
                            }
                          }}
                          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {roles.map(
                            (role) => (
                              <option
                                key={role}
                                value={role}
                              >
                                {
                                  roleLabels[
                                    role
                                  ]
                                }
                              </option>
                            ),
                          )}
                        </select>

                        {isSaving && (
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            Guardando…
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                },
              )}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-[var(--muted)]"
                  >
                    No hay usuarios
                    registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-4 text-sm text-[var(--muted)]">
        Total de usuarios:{" "}
        <strong className="text-[var(--foreground)]">
          {users.length}
        </strong>
      </div>
    </main>
  );
}