"use client";

import {
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";

import { auth, authPersistenceReady } from "@/lib/firebase";
import { getGoogleProfileName } from "@/lib/google-profile";

function isPasswordProviderLinked(user: User) {
  return user.providerData.some(
    (provider) => provider.providerId === "password",
  );
}

function isGoogleProviderLinked(user: User) {
  return user.providerData.some(
    (provider) => provider.providerId === "google.com",
  );
}

async function syncProfile(user: User) {
  const googleName = getGoogleProfileName(
    user.displayName,
    user.email,
  );
  const token = await user.getIdToken(true);
  const response = await fetch("/api/usuarios/perfil", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      Nombres: googleName.nombres,
      Apellidos: googleName.apellidos,
      NombreCompleto: googleName.nombreCompleto,
      Correo: user.email ?? "",
      Telefono: "",
      Direccion: "",
      Proveedor: "google",
      AceptacionTerminos: {
        aceptado: true,
        version: "1.0",
        tipo: "terminos-condiciones",
      },
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { message?: unknown }
      | null;
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "No fue posible sincronizar el perfil.",
    );
  }
}

export default function GooglePasswordGate() {
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    const subscribe = async () => {
      await authPersistenceReady;
      if (!active) return;

      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (active) {
          setPendingUser(
            user &&
              isGoogleProviderLinked(user) &&
              !isPasswordProviderLinked(user)
              ? user
              : null,
          );
        }
      });
    };

    void subscribe();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingUser?.email) return;

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await linkWithCredential(
        pendingUser,
        EmailAuthProvider.credential(pendingUser.email, password),
      );
      await syncProfile(pendingUser);
      setPendingUser(null);
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      const code =
        caught &&
        typeof caught === "object" &&
        "code" in caught
          ? String(caught.code)
          : "";
      setError(
        code === "auth/credential-already-in-use"
          ? "El correo ya está vinculado a otra cuenta."
          : code === "auth/provider-already-linked"
            ? "Esta cuenta ya tiene una contraseña configurada."
            : caught instanceof Error
              ? caught.message
              : "No fue posible guardar la contraseña.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!pendingUser) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-password-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-[var(--surface)] p-6 shadow-2xl sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            Seguridad de la cuenta
          </p>
          <h2
            id="google-password-title"
            className="mt-2 text-2xl font-bold text-[var(--foreground)]"
          >
            Crea una contraseña para tu cuenta
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Para continuar debes crear una contraseña. Después podrás entrar
            con Google o con tu correo y contraseña.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={savePassword} className="space-y-4">
          <label className="block text-sm font-semibold text-[var(--foreground)]">
            Nueva contraseña
            <input
              type="password"
              required
              minLength={6}
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-normal outline-none focus:border-[var(--primary)]"
            />
          </label>
          <label className="block text-sm font-semibold text-[var(--foreground)]">
            Confirmar contraseña
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-normal outline-none focus:border-[var(--primary)]"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando contraseña…" : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
