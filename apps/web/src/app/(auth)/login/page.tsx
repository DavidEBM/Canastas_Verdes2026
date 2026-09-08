"use client";

import Link from "next/link";
import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

type UserRole =
  | "usuario"
  | "repartidor"
  | "admin";

const ROLE_LOAD_RETRIES = 5;
const ROLE_LOAD_DELAY = 300;

function normalizeRole(
  value: unknown,
): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const role = value
    .trim()
    .toLowerCase();

  if (
    role === "usuario" ||
    role === "repartidor" ||
    role === "admin"
  ) {
    return role;
  }

  return null;
}

function delay(
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/*
 * ============================================================
 * OBTENER ROL
 * ============================================================
 *
 * Se utilizan reintentos porque Firebase Auth puede detectar
 * al usuario antes de que el documento de Firestore termine
 * de estar disponible.
 */
async function getUserRole(
  uid: string,
): Promise<UserRole | null> {
  const userRef = doc(
    db,
    "usuarios",
    uid,
  );

  for (
    let attempt = 1;
    attempt <= ROLE_LOAD_RETRIES;
    attempt++
  ) {
    try {
      const userSnapshot =
        await getDoc(userRef);

      if (userSnapshot.exists()) {
        const data =
          userSnapshot.data();

        return normalizeRole(
          data.Rol ?? data.role,
        );
      }

      if (
        attempt < ROLE_LOAD_RETRIES
      ) {
        await delay(
          ROLE_LOAD_DELAY,
        );
      }
    } catch (error) {
      console.error(
        "Error obteniendo el documento del usuario:",
        error,
      );

      return null;
    }
  }

  console.warn(
    "No existe el documento de usuario después de varios intentos:",
    uid,
  );

  return null;
}

/*
 * ============================================================
 * REDIRECCIÓN SEGÚN ROL
 * ============================================================
 */
function redirectByRole(
  router: ReturnType<typeof useRouter>,
  role: UserRole | null,
) {
  switch (role) {
    case "admin":
      router.push("/dashboard");
      break;

    case "repartidor":
      router.push(
        "/dashboard/repartos",
      );
      break;

    case "usuario":
    default:
      router.push("/");
      break;
  }

  router.refresh();
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  /*
   * ============================================================
   * LOGIN CON CORREO Y CONTRASEÑA
   * ============================================================
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      /*
       * ========================================================
       * 1. AUTENTICAR
       * ========================================================
       */
      console.log(
        "Iniciando sesión con correo...",
      );

      const credential =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );

      const currentUser =
        credential.user;

      console.log(
        "Usuario autenticado:",
        currentUser.uid,
      );

      /*
       * ========================================================
       * 2. OBTENER ROL
       * ========================================================
       */
      const role =
        await getUserRole(
          currentUser.uid,
        );

      console.log(
        "Rol obtenido:",
        role,
      );

      /*
       * ========================================================
       * 3. REDIRECCIÓN
       * ========================================================
       */
      redirectByRole(
        router,
        role,
      );
    } catch (error: unknown) {
      console.error(
        "Error al iniciar sesión:",
        error,
      );

      if (
        error instanceof Error &&
        "code" in error
      ) {
        const firebaseError =
          error as Error & {
            code: string;
          };

        switch (
          firebaseError.code
        ) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
            setError(
              "El correo electrónico o la contraseña no son correctos.",
            );
            break;

          case "auth/invalid-email":
            setError(
              "El correo electrónico no tiene un formato válido.",
            );
            break;

          case "auth/user-disabled":
            setError(
              "Esta cuenta ha sido deshabilitada.",
            );
            break;

          case "auth/too-many-requests":
            setError(
              "Se realizaron demasiados intentos. Intenta nuevamente más tarde.",
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

          case "auth/operation-not-allowed":
            setError(
              "El inicio de sesión con correo y contraseña no está habilitado en Firebase Authentication.",
            );
            break;

          default:
            setError(
              `No fue posible iniciar sesión. Código: ${firebaseError.code}`,
            );
        }

        return;
      }

      if (error instanceof Error) {
        setError(
          error.message,
        );
        return;
      }

      setError(
        "Ocurrió un error inesperado al iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * LOGIN CON GOOGLE
   * ============================================================
   */
  const handleGoogleLogin =
    async () => {
      setError("");

      try {
        setGoogleLoading(true);

        /*
         * ======================================================
         * 1. CONFIGURAR GOOGLE
         * ======================================================
         */
        const provider =
          new GoogleAuthProvider();

        provider.setCustomParameters(
          {
            prompt:
              "select_account",
          },
        );

        console.log(
          "Iniciando autenticación con Google...",
        );

        /*
         * ======================================================
         * 2. AUTENTICAR CON POPUP
         * ======================================================
         */
        const result =
          await signInWithPopup(
            auth,
            provider,
          );

        const currentUser =
          result.user;

        console.log(
          "Google autenticó correctamente al usuario:",
          currentUser.uid,
        );

        /*
         * ======================================================
         * 3. OBTENER ROL DESDE FIRESTORE
         * ======================================================
         *
         * No creamos el perfil aquí porque el registro ya se
         * encarga de crearlo. En login simplemente lo buscamos.
         */
        const role =
          await getUserRole(
            currentUser.uid,
          );

        console.log(
          "Rol del usuario de Google:",
          role,
        );

        /*
         * ======================================================
         * 4. REDIRECCIÓN
         * ======================================================
         */
        redirectByRole(
          router,
          role,
        );
      } catch (error: unknown) {
        console.error(
          "Error al iniciar sesión con Google:",
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

          switch (
            firebaseError.code
          ) {
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
                `No fue posible iniciar sesión con Google. Código: ${firebaseError.code}`,
              );
          }

          return;
        }

        if (
          error instanceof Error
        ) {
          setError(
            error.message,
          );
          return;
        }

        setError(
          "Ocurrió un error inesperado durante el inicio de sesión con Google.",
        );
      } finally {
        setGoogleLoading(false);
      }
    };

  const isLoading =
    loading ||
    googleLoading;

  return (
    <main className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[var(--surface)]">
      <div className="absolute inset-0 bg-[url('/images/backgrounds/auth.webp')] bg-cover bg-center" />

      <div className="absolute inset-0 bg-[rgb(23_53_31_/_72%)]" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="w-full max-w-md rounded-[var(--radius-xl)] border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          {/* ==================================================
              ENCABEZADO
          ================================================== */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-block text-2xl font-bold text-[var(--primary)]"
            >
              Canastas{" "}
              <span className="text-[var(--foreground)]">
                Verdes
              </span>
            </Link>

            <h1 className="mt-6 text-2xl font-bold text-[var(--foreground)]">
              Bienvenido
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Inicia sesión para
              continuar.
            </p>
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* ==================================================
              FORMULARIO
          ================================================== */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            {/* CORREO */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="correo@ejemplo.com"
                disabled={isLoading}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {/* CONTRASEÑA */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            {/* ==================================================
                BOTÓN CORREO
            ================================================== */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#18572f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Iniciando sesión..."
                : "Iniciar sesión"}
            </button>
          </form>

          {/* ==================================================
              SEPARADOR
          ================================================== */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border)]" />

            <span className="text-xs text-[var(--muted)]">
              O continúa con
            </span>

            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          {/* ==================================================
              BOTÓN GOOGLE
          ================================================== */}
          <button
            type="button"
            onClick={
              handleGoogleLogin
            }
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
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
                  Continuar con Google
                </span>
              </>
            )}
          </button>

          {/* ==================================================
              REGISTRO
          ================================================== */}
          <div className="mt-8 border-t border-[var(--border)] pt-6 text-center">
            <p className="text-sm text-[var(--muted)]">
              ¿No tienes una cuenta?{" "}

              <Link
                href="/register"
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Crear cuenta
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}