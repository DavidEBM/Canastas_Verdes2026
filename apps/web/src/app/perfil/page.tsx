"use client";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";

interface Profile {
  Nombres: string;
  Apellidos: string;
  Correo: string;
  Telefono: string;
  Direccion: string;
  Rol: string;
}

/*
 * Firebase puede tener "_" representando espacios
 * en algunos datos existentes.
 *
 * Ejemplo:
 * "Canastas_Verdes" → "Canastas Verdes"
 */
function displayText(value: string) {
  return value.replace(/_/g, " ");
}

/*
 * Convierte los espacios nuevamente a "_"
 * antes de guardar los datos.
 *
 * Esto mantiene el formato existente de la base
 * de datos.
 */
function storageText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_");
}

function roleLabel(role: string) {
  switch (role.toLowerCase()) {
    case "admin":
      return "Administrador";

    case "repartidor":
      return "Repartidor";

    case "consumidor":
      return "Consumidor";

    default:
      return "Consumidor";
  }
}

export default function PerfilPage() {
  const {
    user,
    loading,
  } = useAuth();

  const [profile, setProfile] =
    useState<Profile>({
      Nombres: "",
      Apellidos: "",
      Correo: "",
      Telefono: "",
      Direccion: "",
      Rol: "",
    });

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [passwordModalOpen, setPasswordModalOpen] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [passwordConfirmation, setPasswordConfirmation] =
    useState("");

  const [passwordConfirmed, setPasswordConfirmed] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  const [passwordError, setPasswordError] =
    useState<string | null>(null);

  const request = useCallback(
    async (
      method: "GET" | "PUT",
      body?: unknown,
    ) => {
      if (!user) {
        throw new Error(
          "Debes iniciar sesión.",
        );
      }

      const token =
        await user.getIdToken();

      const response = await fetch(
        "/api/usuarios/perfil",
        {
          method,
          headers: {
            Authorization:
              `Bearer ${token}`,

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
            : "No fue posible realizar la operación.";

        throw new Error(message);
      }

      return result;
    },
    [user],
  );

  const loadProfile =
    useCallback(async () => {
      try {
        setLoadingProfile(true);
        setError(null);

        const result =
          await request("GET");

        if (
          !result ||
          typeof result !== "object" ||
          !("data" in result) ||
          !result.data ||
          typeof result.data !== "object"
        ) {
          throw new Error(
            "La respuesta del perfil no tiene un formato válido.",
          );
        }

        const data =
          result.data as Partial<Profile>;

        setProfile({
          /*
           * El reemplazo "_" → " " solamente
           * afecta la presentación en pantalla.
           */
          Nombres:
            typeof data.Nombres === "string"
              ? displayText(data.Nombres)
              : "",

          Apellidos:
            typeof data.Apellidos === "string"
              ? displayText(data.Apellidos)
              : "",

          Correo:
            typeof data.Correo === "string"
              ? displayText(data.Correo)
              : "",

          Telefono:
            typeof data.Telefono === "string"
              ? displayText(data.Telefono)
              : "",

          Direccion:
            typeof data.Direccion === "string"
              ? displayText(data.Direccion)
              : "",

          Rol:
            typeof data.Rol === "string"
              ? data.Rol.trim().toLowerCase()
              : "consumidor",
        });
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No fue posible cargar el perfil.",
        );
      } finally {
        setLoadingProfile(false);
      }
    }, [request]);

  useEffect(() => {
    if (user) {
      void loadProfile();
    } else if (!loading) {
      setLoadingProfile(false);
    }
  }, [
    user,
    loading,
    loadProfile,
  ]);

  const updateField = (
    field:
      | "Nombres"
      | "Apellidos"
      | "Telefono"
      | "Direccion",
    value: string,
  ) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setError(null);
    setNotice(null);
  };

  const saveProfile = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setNotice(null);

      await request("PUT", {
        /*
         * Guardamos manteniendo el formato de
         * Firebase: espacios → "_".
         */
        Nombres: storageText(
          profile.Nombres,
        ),

        Apellidos: storageText(
          profile.Apellidos,
        ),

        Telefono:
          profile.Telefono.trim(),

        Direccion: storageText(
          profile.Direccion,
        ),
      });

      /*
       * Mostramos inmediatamente los datos
       * en formato legible.
       */
      setProfile((current) => ({
        ...current,

        Nombres: displayText(
          storageText(
            profile.Nombres,
          ),
        ),

        Apellidos: displayText(
          storageText(
            profile.Apellidos,
          ),
        ),

        Telefono:
          profile.Telefono.trim(),

        Direccion: displayText(
          storageText(
            profile.Direccion,
          ),
        ),
      }));

      setNotice(
        "Perfil actualizado correctamente.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible actualizar el perfil.",
      );
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    if (!user) {
      return;
    }

    try {
      setLoggingOut(true);
      setError(null);

      const { signOut } =
        await import("firebase/auth");

      const { auth } =
        await import("@/lib/firebase");

      await signOut(auth);

      window.location.href = "/";
    } catch (caught) {
      setLoggingOut(false);

      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cerrar la sesión.",
      );
    }
  };

  const changePassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!user?.email) {
      setPasswordError("No fue posible identificar tu correo.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== passwordConfirmation) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    if (!passwordConfirmed) {
      setPasswordError("Confirma que deseas cambiar tu contraseña.");
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordError(null);
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
      setPasswordConfirmed(false);
      setNotice("Contraseña actualizada correctamente.");
    } catch (caught) {
      const code =
        caught &&
        typeof caught === "object" &&
        "code" in caught &&
        typeof caught.code === "string"
          ? caught.code
          : "";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password"
      ) {
        setPasswordError("La contraseña actual no es correcta.");
      } else if (code === "auth/requires-recent-login") {
        setPasswordError("Tu sesión expiró. Cierra sesión e inicia nuevamente para cambiar la contraseña.");
      } else if (code === "auth/weak-password") {
        setPasswordError("La nueva contraseña no cumple los requisitos de seguridad.");
      } else {
        setPasswordError("No fue posible cambiar la contraseña. Intenta nuevamente.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || loadingProfile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-[var(--muted)]">
          Cargando perfil…
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">
          Mi perfil
        </h1>

        <p className="mt-2 text-[var(--muted)]">
          Debes iniciar sesión para acceder
          a tu perfil.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Mi perfil
        </h1>

        <p className="mt-2 text-sm text-[var(--muted)]">
          Consulta y administra tus datos
          personales.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Éxito */}
      {notice && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </div>
      )}

      <form
        onSubmit={saveProfile}
        className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Nombres */}
          <div>
            <label
              htmlFor="Nombres"
              className="mb-1 block text-sm font-semibold"
            >
              Nombres
            </label>

            <input
              id="Nombres"
              type="text"
              value={profile.Nombres}
              onChange={(event) =>
                updateField(
                  "Nombres",
                  event.target.value,
                )
              }
              required
              maxLength={100}
              autoComplete="given-name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Apellidos */}
          <div>
            <label
              htmlFor="Apellidos"
              className="mb-1 block text-sm font-semibold"
            >
              Apellidos
            </label>

            <input
              id="Apellidos"
              type="text"
              value={profile.Apellidos}
              onChange={(event) =>
                updateField(
                  "Apellidos",
                  event.target.value,
                )
              }
              maxLength={100}
              autoComplete="family-name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Correo */}
          <div className="sm:col-span-2">
            <label
              htmlFor="Correo"
              className="mb-1 block text-sm font-semibold"
            >
              Correo electrónico
            </label>

            <input
              id="Correo"
              type="email"
              value={profile.Correo}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--muted)]"
            />

            <p className="mt-1 text-xs text-[var(--muted)]">
              El correo electrónico no puede
              modificarse desde este panel.
            </p>
          </div>

          {/* Teléfono */}
          <div>
            <label
              htmlFor="Telefono"
              className="mb-1 block text-sm font-semibold"
            >
              Teléfono
            </label>

            <input
              id="Telefono"
              type="tel"
              value={profile.Telefono}
              onChange={(event) =>
                updateField(
                  "Telefono",
                  event.target.value,
                )
              }
              maxLength={30}
              autoComplete="tel"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Rol */}
          <div>
            <label
              htmlFor="Rol"
              className="mb-1 block text-sm font-semibold"
            >
              Tipo de cuenta
            </label>

            <input
              id="Rol"
              type="text"
              value={roleLabel(profile.Rol)}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--muted)]"
            />

            <p className="mt-1 text-xs text-[var(--muted)]">
              El tipo de cuenta es administrado
              por el sistema.
            </p>
          </div>

          {/* Dirección */}
          <div className="sm:col-span-2">
            <label
              htmlFor="Direccion"
              className="mb-1 block text-sm font-semibold"
            >
              Dirección
            </label>

            <textarea
              id="Direccion"
              value={profile.Direccion}
              onChange={(event) =>
                updateField(
                  "Direccion",
                  event.target.value,
                )
              }
              maxLength={250}
              rows={3}
              autoComplete="street-address"
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => void logout()}
            disabled={
              saving || loggingOut
            }
            className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut
              ? "Cerrando sesión…"
              : "Cerrar sesión"}
          </button>

          <button
            type="submit"
            disabled={
              saving || loggingOut
            }
            className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Guardando…"
              : "Guardar cambios"}
          </button>
        </div>
      </form>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
        <h2 className="text-lg font-bold">Seguridad</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Actualiza la contraseña de acceso a tu cuenta.
        </p>
        <button
          type="button"
          onClick={() => {
            setPasswordError(null);
            setPasswordModalOpen(true);
          }}
          className="mt-4 rounded-lg border border-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
        >
          Cambiar contraseña
        </button>
      </section>

      {passwordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--background)] p-6 shadow-2xl">
            <h2 id="change-password-title" className="text-xl font-bold">
              Cambiar contraseña
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Ingresa tu contraseña actual y confirma la nueva para continuar.
            </p>

            {passwordError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {passwordError}
              </div>
            )}

            <form onSubmit={changePassword} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold">
                Contraseña actual
                <input
                  type="password"
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  disabled={changingPassword}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-normal outline-none focus:border-[var(--primary)]"
                />
              </label>
              <label className="block text-sm font-semibold">
                Nueva contraseña
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={changingPassword}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-normal outline-none focus:border-[var(--primary)]"
                />
              </label>
              <label className="block text-sm font-semibold">
                Confirmar nueva contraseña
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  disabled={changingPassword}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-normal outline-none focus:border-[var(--primary)]"
                />
              </label>
              <label className="flex items-start gap-2 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={passwordConfirmed}
                  onChange={(event) => setPasswordConfirmed(event.target.checked)}
                  disabled={changingPassword}
                  className="mt-1"
                />
                <span>Confirmo que deseo cambiar la contraseña de mi cuenta.</span>
              </label>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  disabled={changingPassword}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {changingPassword ? "Actualizando…" : "Confirmar cambio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}