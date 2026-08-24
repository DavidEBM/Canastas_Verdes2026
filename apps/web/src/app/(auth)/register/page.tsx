"use client";

import { FormEvent, useState } from "react";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!termsAccepted) {
      setError("Debes aceptar los términos y condiciones de uso.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      await updateProfile(userCredential.user, {
        displayName: `${name} ${lastName}`.trim(),
      });

      router.push("/");
    } catch (error: unknown) {
      console.error("Error al registrar usuario:", error);

      if (
        error instanceof Error &&
        "code" in error
      ) {
        const firebaseError = error as Error & {
          code: string;
        };

        switch (firebaseError.code) {
          case "auth/email-already-in-use":
            setError("Este correo electrónico ya está registrado.");
            break;

          case "auth/invalid-email":
            setError("El correo electrónico no es válido.");
            break;

          case "auth/weak-password":
            setError("La contraseña es demasiado débil.");
            break;

          case "auth/network-request-failed":
            setError(
              "No se pudo conectar con Firebase. Comprueba tu conexión.",
            );
            break;

          default:
            setError(
              "No fue posible crear la cuenta. Inténtalo nuevamente.",
            );
        }
      } else {
        setError("Ocurrió un error inesperado.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");

    if (!termsAccepted) {
      setError("Debes aceptar los términos y condiciones de uso.");
      return;
    }

    try {
      setGoogleLoading(true);

      const provider = new GoogleAuthProvider();

      await signInWithPopup(auth, provider);

      router.push("/");
    } catch (error: unknown) {
  if (
    error instanceof Error &&
    "code" in error
  ) {
    const firebaseError = error as Error & {
      code: string;
    };

    if (firebaseError.code === "auth/popup-closed-by-user") {
      setError("El registro con Google fue cancelado.");
      return;
    }

    console.error("Error al registrarse con Google:", error);

    switch (firebaseError.code) {
      case "auth/popup-blocked":
        setError(
          "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para continuar.",
        );
        break;

      case "auth/account-exists-with-different-credential":
        setError(
          "Ya existe una cuenta con este correo usando otro método de acceso.",
        );
        break;

      case "auth/network-request-failed":
        setError(
          "No se pudo conectar con Firebase. Comprueba tu conexión.",
        );
        break;

      default:
        setError(
          "No fue posible registrarse con Google. Inténtalo nuevamente.",
        );
    }
  } else {
    console.error("Error inesperado:", error);
    setError("Ocurrió un error inesperado.");
  }
} finally {
  setGoogleLoading(false);
}
  };

  const isLoading = loading || googleLoading;

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md items-center justify-center">
        <section className="w-full rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          {/* Encabezado */}
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Crear cuenta
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Únete a Canastas Verdes
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleRegister}
            className="space-y-4"
          >
            {/* Nombre y apellido */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                >
                  Nombre
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  disabled={isLoading}
                  placeholder="Tu nombre"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                >
                  Apellido
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  disabled={isLoading}
                  placeholder="Tu apellido"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
                />
              </div>
            </div>

            {/* Correo */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
              >
                Correo electrónico
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                disabled={isLoading}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
              >
                Contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                disabled={isLoading}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
              />
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                disabled={isLoading}
                placeholder="Repite tu contraseña"
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
              />
            </div>

            {/* Términos */}
            <label className="flex items-start gap-3 pt-1 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                name="terms"
                required
                checked={termsAccepted}
                onChange={(event) =>
                  setTermsAccepted(event.target.checked)
                }
                disabled={isLoading}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)] accent-[var(--primary)]"
              />

              <span>
                Acepto los términos y condiciones de uso de
                Canastas Verdes
                <span className="ml-1 font-semibold text-red-600">
                  *
                </span>
              </span>
            </label>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.23c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
                />
                <path
                  fill="#34A853"
                  d="M12 21.95c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.95Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.53 14.04A5.85 5.85 0 0 1 6.23 12c0-.71.12-1.4.3-2.04V7.43H3.28A9.95 9.95 0 0 0 2.25 12c0 1.6.38 3.11 1.03 4.57l3.25-2.53Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.93c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.02 14.63 2.05 12 2.05a9.74 9.74 0 0 0-8.72 5.38l3.25 2.53C7.3 7.65 9.46 5.93 12 5.93Z"
                />
              </svg>

              {googleLoading
                ? "Conectando con Google..."
                : "Continuar con Google"}
            </button>

            {/* Crear cuenta */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#18572f] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creando cuenta..."
                : "Crear cuenta"}
            </button>
          </form>

          {/* Login */}
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            ¿Ya tienes una cuenta?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Inicia sesión
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}