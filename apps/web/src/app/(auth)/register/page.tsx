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

  const [showTerms, setShowTerms] =
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

          // Aceptación de términos
          AceptacionTerminos: {
            aceptado: true,
            version: "1.0",
            tipo: "terminos-condiciones",
          },
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
      setError(
        "Debes ingresar tu correo electrónico.",
      );
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

      const displayName =
        user.displayName?.trim() ?? "";

      const nameParts = displayName
        .split(/\s+/)
        .filter(Boolean);

      const nombres =
        nameParts.shift() ?? "Usuario";

      const apellidos =
        nameParts.join(" ");

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

          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-[var(--primary)]">
              Crear cuenta
            </h1>

            <p className="mt-2 text-sm text-[var(--foreground)]/70">
              Únete a Canastas Verdes
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleRegister}
            className="space-y-4"
          >
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

            {/* TÉRMINOS */}
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
                  Acepto los{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setShowTerms(true)
                    }
                    className="font-semibold text-[var(--primary)] underline underline-offset-2 transition hover:opacity-80"
                  >
                    términos y condiciones
                  </button>{" "}
                  de uso

                  <span className="ml-1 font-bold text-red-600">
                    *
                  </span>
                </span>
              </label>
            </div>

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

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />

            <span className="text-xs text-gray-500">
              O continúa con
            </span>

            <div className="h-px flex-1 bg-gray-200" />
          </div>

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

      {/* ========================================================
          POPUP — TÉRMINOS Y CONDICIONES
      ======================================================== */}
      {showTerms && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-title"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowTerms(false);
            }
          }}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="terms-title"
                  className="text-xl font-bold text-[var(--primary)]"
                >
                  Términos y condiciones
                </h2>

                <p className="mt-1 text-xs text-[var(--foreground)]/60">
                  Canastas Verdes
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowTerms(false)
                }
                aria-label="Cerrar términos y condiciones"
                className="rounded-lg px-3 py-2 text-2xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 text-sm leading-6 text-[var(--foreground)] sm:px-6">

              <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm">
                  <strong>Última actualización:</strong>{" "}
                  septiembre de 2026.
                </p>

                <p className="mt-2 text-sm text-[var(--foreground)]/75">
                  Estos términos establecen las condiciones
                  aplicables al uso de la plataforma Canastas
                  Verdes y al tratamiento de la información
                  proporcionada por sus usuarios.
                </p>
              </div>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  1. Aceptación de los términos
                </h3>

                <p>
                  Al registrarte, acceder o utilizar la
                  plataforma Canastas Verdes, aceptas estos
                  términos y condiciones de uso. Si no estás
                  de acuerdo con alguno de ellos, debes
                  abstenerte de utilizar los servicios de la
                  plataforma.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  2. Registro y cuenta de usuario
                </h3>

                <p>
                  Para utilizar determinadas funcionalidades
                  de Canastas Verdes es necesario crear una
                  cuenta. El usuario se compromete a
                  proporcionar información verdadera, completa
                  y actualizada.
                </p>

                <p className="mt-2">
                  El usuario es responsable de mantener la
                  confidencialidad de sus credenciales y de
                  las actividades realizadas desde su cuenta.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  3. Datos personales
                </h3>

                <p>
                  Canastas Verdes podrá recopilar y tratar
                  datos personales proporcionados directamente
                  por el usuario, incluyendo nombres, apellidos,
                  correo electrónico, teléfono, dirección y
                  demás información necesaria para prestar los
                  servicios ofrecidos por la plataforma.
                </p>

                <p className="mt-2">
                  El tratamiento de estos datos se realizará
                  de acuerdo con la legislación colombiana
                  aplicable en materia de protección de datos
                  personales y con las políticas de tratamiento
                  de información de Canastas Verdes.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  4. Datos sensibles
                </h3>

                <p>
                  Canastas Verdes no solicitará datos sensibles
                  salvo que sean necesarios para una finalidad
                  determinada y exista una base legal o
                  autorización válida para su tratamiento.
                </p>

                <p className="mt-2">
                  Cuando corresponda, el usuario será informado
                  sobre la finalidad del tratamiento y sobre
                  los derechos que le asisten como titular de
                  los datos.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  5. Almacenamiento y seguridad
                </h3>

                <p>
                  La información de las cuentas y los datos
                  necesarios para el funcionamiento de la
                  plataforma pueden ser almacenados y
                  procesados mediante servicios tecnológicos
                  de terceros utilizados por Canastas Verdes,
                  incluyendo servicios de autenticación,
                  almacenamiento y bases de datos.
                </p>

                <p className="mt-2">
                  Se aplicarán medidas técnicas y organizativas
                  razonables para proteger la información frente
                  a accesos no autorizados, pérdida, alteración
                  o divulgación indebida.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  6. Finalidad del tratamiento
                </h3>

                <p>
                  Los datos podrán utilizarse para crear y
                  administrar cuentas, procesar pedidos,
                  gestionar entregas, prestar atención al
                  usuario, responder solicitudes, mejorar la
                  plataforma, mantener la seguridad del servicio
                  y cumplir obligaciones legales.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  7. Pedidos, productos y precios
                </h3>

                <p>
                  La información sobre productos, precios,
                  existencias, presentaciones y disponibilidad
                  puede cambiar sin previo aviso.
                </p>

                <p className="mt-2">
                  La realización de un pedido estará sujeta a
                  la disponibilidad del producto y a las
                  condiciones mostradas durante el proceso de
                  compra.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  8. Cookies y tecnologías similares
                </h3>

                <p>
                  Canastas Verdes puede utilizar cookies y
                  tecnologías similares necesarias para el
                  funcionamiento de la plataforma y, cuando
                  corresponda, para mejorar la experiencia de
                  navegación.
                </p>

                <p className="mt-2">
                  El uso de cookies se encuentra desarrollado
                  con mayor detalle en la{" "}
                  <Link
                    href="/politica-cookies"
                    onClick={() =>
                      setShowTerms(false)
                    }
                    className="font-semibold text-[var(--primary)] underline underline-offset-2"
                  >
                    Política de Cookies
                  </Link>
                  .
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  9. Responsabilidades del usuario
                </h3>

                <p>
                  El usuario se compromete a utilizar la
                  plataforma de manera lícita, responsable y
                  conforme a estos términos.
                </p>

                <p className="mt-2">
                  No deberá intentar acceder sin autorización
                  a sistemas, cuentas, información o
                  funcionalidades restringidas.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  10. Limitación de responsabilidad
                </h3>

                <p>
                  Canastas Verdes procurará mantener la
                  disponibilidad y correcto funcionamiento de
                  la plataforma, pero no garantiza que el
                  servicio permanezca libre de interrupciones,
                  errores, fallos técnicos o situaciones
                  derivadas de servicios externos.
                </p>

                <p className="mt-2">
                  En la medida permitida por la legislación
                  aplicable, Canastas Verdes no será responsable
                  por daños derivados de hechos que se encuentren
                  fuera de su control razonable, incluyendo
                  fallos de conectividad, servicios tecnológicos
                  de terceros o actuaciones indebidas del
                  usuario.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  11. Servicios de terceros
                </h3>

                <p>
                  La plataforma puede utilizar servicios
                  tecnológicos proporcionados por terceros para
                  autenticación, almacenamiento, análisis,
                  infraestructura u otras funciones necesarias
                  para su operación.
                </p>

                <p className="mt-2">
                  La disponibilidad de dichos servicios puede
                  estar sujeta a sus propias condiciones,
                  políticas y limitaciones.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  12. Derechos sobre los datos personales
                </h3>

                <p>
                  El titular de los datos podrá ejercer los
                  derechos reconocidos por la legislación
                  aplicable, incluyendo conocer, actualizar,
                  rectificar y solicitar la eliminación de sus
                  datos cuando legalmente corresponda.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  13. Conservación de la información
                </h3>

                <p>
                  La información será conservada durante el
                  tiempo necesario para cumplir las finalidades
                  para las cuales fue recopilada, atender
                  obligaciones legales, contractuales,
                  administrativas o de seguridad y resolver
                  posibles controversias.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  14. Modificaciones
                </h3>

                <p>
                  Canastas Verdes podrá actualizar estos
                  términos cuando sea necesario por cambios
                  legales, técnicos, operativos o en los
                  servicios ofrecidos.
                </p>

                <p className="mt-2">
                  Las modificaciones serán publicadas en la
                  plataforma.
                </p>
              </section>

              <section className="mb-2">
                <h3 className="mb-2 text-base font-bold text-[var(--primary)]">
                  15. Aceptación
                </h3>

                <p>
                  Al marcar la casilla de aceptación y completar
                  el proceso de registro, el usuario declara
                  haber leído y comprendido estos términos y
                  condiciones y manifiesta su aceptación.
                </p>
              </section>
            </div>

            <div className="flex shrink-0 justify-end border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setShowTerms(false)
                }
                className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}