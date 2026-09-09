"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [error, setError] = useState("");

  /*
   * ============================================================
   * CREAR PERFIL EN FIRESTORE
   * ============================================================
   */
  const createUserProfile = async (
    nombres: string,
    apellidos: string,
    correo: string,
  ) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error(
        "No se encontró el usuario autenticado después del registro.",
      );
    }

    const idToken =
      await currentUser.getIdToken(true);

    if (!idToken) {
      throw new Error(
        "No fue posible obtener el token de autenticación.",
      );
    }

    console.log(
      "Creando perfil para UID:",
      currentUser.uid,
    );

    const response = await fetch(
      "/api/usuarios/perfil",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          Nombres: nombres.trim(),
          Apellidos: apellidos.trim(),
          Correo: correo.trim(),
          Telefono: "",
          Direccion: "",
        }),
      },
    );

    let data: {
      success?: boolean;
      message?: string;
      data?: unknown;
    } = {};

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `El servidor respondió con un formato inválido. Código HTTP: ${response.status}`,
      );
    }

    console.log(
      "Respuesta creación de perfil:",
      {
        status: response.status,
        data,
      },
    );

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          `No fue posible crear el perfil. Código HTTP: ${response.status}`,
      );
    }

    return data;
  };

  /*
   * ============================================================
   * REGISTRO CON CORREO Y CONTRASEÑA
   * ============================================================
   */
  const handleRegister = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (!termsAccepted) {
      setError(
        "Debes aceptar los términos y condiciones de uso.",
      );
      return;
    }

    if (!name.trim()) {
      setError("Debes ingresar tu nombre.");
      return;
    }

    if (!lastName.trim()) {
      setError("Debes ingresar tus apellidos.");
      return;
    }

    if (!email.trim()) {
      setError("Debes ingresar tu correo electrónico.");
      return;
    }

    if (password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);

      console.log(
        "Creando usuario con correo:",
        email.trim(),
      );

      const result =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );

      const user = result.user;

      console.log(
        "Usuario creado correctamente en Firebase Auth:",
        user.uid,
      );

      await updateProfile(user, {
        displayName: `${name.trim()} ${lastName.trim()}`,
      });

      console.log(
        "Perfil de Firebase Auth actualizado.",
      );

      await createUserProfile(
        name,
        lastName,
        email,
      );

      console.log(
        "Perfil de usuario creado correctamente:",
        user.uid,
      );

      router.push("/");
    } catch (error: unknown) {
      console.error(
        "Error al registrarse:",
        {
          error,
          code:
            error instanceof Error &&
            "code" in error
              ? (
                  error as Error & {
                    code: string;
                  }
                ).code
              : "sin código",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );

      if (
        error instanceof Error &&
        "code" in error
      ) {
        const firebaseError =
          error as Error & {
            code: string;
          };

        switch (firebaseError.code) {
          case "auth/email-already-in-use":
            setError(
              "Ya existe una cuenta registrada con este correo electrónico.",
            );
            break;

          case "auth/invalid-email":
            setError(
              "El correo electrónico no tiene un formato válido.",
            );
            break;

          case "auth/weak-password":
            setError(
              "La contraseña es demasiado débil. Usa al menos 6 caracteres.",
            );
            break;

          case "auth/network-request-failed":
            setError(
              "No se pudo conectar con Firebase. Comprueba tu conexión a Internet.",
            );
            break;

          case "auth/operation-not-allowed":
            setError(
              "El registro con correo y contraseña no está habilitado en Firebase Authentication.",
            );
            break;

          case "auth/invalid-api-key":
            setError(
              "La configuración de Firebase no es válida. Revisa las variables NEXT_PUBLIC_FIREBASE_*.",
            );
            break;

          default:
            setError(
              `No fue posible crear la cuenta. Código: ${firebaseError.code}`,
            );
        }

        return;
      }

      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError(
        "Ocurrió un error inesperado durante el registro.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * REGISTRO CON GOOGLE
   * ============================================================
   */
  const handleGoogleRegister = async () => {
    setError("");

    if (!termsAccepted) {
      setError(
        "Debes aceptar los términos y condiciones de uso.",
      );
      return;
    }

    try {
      setGoogleLoading(true);

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      console.log(
        "Iniciando autenticación con Google...",
      );

      const result = await signInWithPopup(
        auth,
        provider,
      );

      console.log(
        "Google autenticó correctamente al usuario:",
        result.user.uid,
      );

      const user = result.user;

      /*
       * Google normalmente proporciona el nombre
       * completo mediante displayName.
       */
      const displayName =
        user.displayName?.trim() ?? "";

      const nameParts = displayName
        .split(/\s+/)
        .filter(Boolean);

      const nombres =
        nameParts.shift() ?? "Usuario";

      const apellidos =
        nameParts.join(" ");

      /*
       * Si Google no proporciona apellidos,
       * dejamos el campo vacío.
       */
      await createUserProfile(
        nombres,
        apellidos,
        user.email ?? "",
      );

      console.log(
        "Perfil de usuario creado correctamente:",
        user.uid,
      );

      router.push("/");
    } catch (error: unknown) {
      console.error(
        "Error al registrarse con Google:",
        {
          error,
          code:
            error instanceof Error &&
            "code" in error
              ? (
                  error as Error & {
                    code: string;
                  }
                ).code
              : "sin código",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );

      if (
        error instanceof Error &&
        "code" in error
      ) {
        const firebaseError =
          error as Error & {
            code: string;
          };

        switch (firebaseError.code) {
          case "auth/popup-closed-by-user":
            setError(
              "La ventana de Google se cerró antes de completar la autenticación.",
            );
            break;

          case "auth/popup-blocked":
            setError(
              "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio.",
            );
            break;

          case "auth/unauthorized-domain":
            setError(
              "El dominio actual no está autorizado en Firebase Authentication.",
            );
            break;

          case "auth/operation-not-allowed":
            setError(
              "El inicio de sesión con Google no está habilitado en Firebase Authentication.",
            );
            break;

          case "auth/account-exists-with-different-credential":
            setError(
              "Ya existe una cuenta con este correo utilizando otro método de acceso.",
            );
            break;

          case "auth/network-request-failed":
            setError(
              "No se pudo conectar con Firebase. Comprueba tu conexión a Internet.",
            );
            break;

          case "auth/invalid-api-key":
            setError(
              "La configuración de Firebase no es válida. Revisa las variables NEXT_PUBLIC_FIREBASE_*.",
            );
            break;

          default:
            setError(
              `No fue posible registrarse con Google. Código: ${firebaseError.code}`,
            );
        }

        return;
      }

      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError(
        "Ocurrió un error inesperado durante el registro con Google.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-[var(--secondary)] bg-white p-6 shadow-lg sm:p-8">
          {/* ==================================================
              ENCABEZADO
          ================================================== */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-[var(--primary)]">
              Crear cuenta
            </h1>

            <p className="mt-2 text-sm text-[var(--foreground)]/70">
              Únete a Canastas Verdes
            </p>
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* ==================================================
              FORMULARIO
          ================================================== */}
          <form
            onSubmit={handleRegister}
            className="space-y-4"
          >
            {/* NOMBRE */}
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                Nombres
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Ingresa tus nombres"
                autoComplete="given-name"
                disabled={
                  loading || googleLoading
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--secondary)] disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {/* APELLIDOS */}
            <div>
              <label
                htmlFor="lastName"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                Apellidos
              </label>

              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(event) =>
                  setLastName(event.target.value)
                }
                placeholder="Ingresa tus apellidos"
                autoComplete="family-name"
                disabled={
                  loading || googleLoading
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--secondary)] disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {/* CORREO */}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                disabled={
                  loading || googleLoading
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--secondary)] disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {/* CONTRASEÑA */}
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={
                  loading || googleLoading
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--secondary)] disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {/* CONFIRMAR CONTRASEÑA */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
                }
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                disabled={
                  loading || googleLoading
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--secondary)] disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {/* ==================================================
                TÉRMINOS Y CONDICIONES
            ================================================== */}
            <div className="pt-1">
              <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--foreground)]/80">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) =>
                    setTermsAccepted(
                      event.target.checked,
                    )
                  }
                  disabled={
                    loading || googleLoading
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[var(--primary)]"
                />

                <span>
                  Acepto los términos y condiciones
                  de uso
                  <span className="ml-1 font-bold text-red-600">
                    *
                  </span>
                </span>
              </label>
            </div>

            {/* ==================================================
                BOTÓN CREAR CUENTA
            ================================================== */}
            <button
              type="submit"
              disabled={
                loading ||
                googleLoading ||
                !termsAccepted
              }
              className="w-full rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creando cuenta..."
                : "Crear cuenta"}
            </button>
          </form>

          {/* ==================================================
              SEPARADOR
          ================================================== */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />

            <span className="text-xs text-gray-500">
              O continúa con
            </span>

            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* ==================================================
              GOOGLE
          ================================================== */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={
              loading ||
              googleLoading ||
              !termsAccepted
            }
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="opacity-25"
                  />

                  <path
                    d="M21 12a9 9 0 0 1-9 9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>

                <span>
                  Conectando con Google...
                </span>
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M21.35 12.27c0-.71-.06-1.39-.18-2.04H12v3.86h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.21Z"
                  />

                  <path
                    fill="#34A853"
                    d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.75 9.75 0 0 0 12 21.75Z"
                  />

                  <path
                    fill="#FBBC05"
                    d="M6.54 13.83A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.83V7.65H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.35l3.24-2.52Z"
                  />

                  <path
                    fill="#EA4335"
                    d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.22 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.4l3.24 2.52C7.31 7.86 9.46 6.14 12 6.14Z"
                  />
                </svg>

                <span>
                  Registrarse con Google
                </span>
              </>
            )}
          </button>

          {/* ==================================================
              LOGIN
          ================================================== */}
          <p className="mt-6 text-center text-sm text-[var(--foreground)]/70">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}