"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";

import {
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from "@/lib/notifications";

export default function NotificationSettings() {
  const [user, setUser] = useState(false);

  const [enabled, setEnabled] =
    useState(false);

  const [supported, setSupported] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!currentUser) {
            setUser(false);
            setEnabled(false);
            setLoading(false);
            return;
          }

          setUser(true);

          const browserSupportsNotifications =
            "Notification" in window &&
            "serviceWorker" in navigator &&
            "PushManager" in window;

          if (!browserSupportsNotifications) {
            setSupported(false);
            setLoading(false);
            return;
          }

          try {
            const registration =
              await navigator.serviceWorker.getRegistration(
                "/notifications-sw.js"
              );

            if (!registration) {
              setEnabled(false);
              return;
            }

            const subscription =
              await registration.pushManager.getSubscription();

            setEnabled(
              !!subscription &&
                Notification.permission ===
                  "granted"
            );
          } catch (error) {
            console.error(
              "[NotificationSettings]",
              error
            );

            setEnabled(false);
          } finally {
            setLoading(false);
          }
        }
      );

    return () => unsubscribeAuth();
  }, []);

  const enableNotifications =
    async () => {
      if (!auth.currentUser) {
        setMessage(
          "Debes iniciar sesión."
        );
        return;
      }

      setSaving(true);
      setMessage("");

      try {
        await subscribeToNotifications();

        setEnabled(true);

        setMessage(
          "Las notificaciones fueron activadas correctamente."
        );
      } catch (error) {
        console.error(
          "[NotificationSettings]",
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron activar las notificaciones."
        );
      } finally {
        setSaving(false);
      }
    };

  const disableNotifications =
    async () => {
      setSaving(true);
      setMessage("");

      try {
        await unsubscribeFromNotifications();

        setEnabled(false);

        setMessage(
          "Las notificaciones fueron desactivadas."
        );
      } catch (error) {
        console.error(
          "[NotificationSettings]",
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudieron desactivar las notificaciones."
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-white p-5">
        <p className="text-sm text-[var(--muted)]">
          Comprobando notificaciones...
        </p>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  if (!supported) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-white p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Notificaciones
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Este navegador no soporta las
            notificaciones web necesarias para
            Canastas Verdes.
          </p>
        </div>
      </section>
    );
  }

  const permissionDenied =
    Notification.permission ===
    "denied";

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Notificaciones
        </h2>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Recibe avisos sobre tus pedidos y
          novedades de Canastas Verdes.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-[var(--foreground)]">
            Notificaciones del navegador
          </p>

          <p className="mt-1 text-sm text-[var(--muted)]">
            {enabled
              ? "Las notificaciones están activadas."
              : "Las notificaciones están desactivadas."}
          </p>
        </div>

        <button
          type="button"
          disabled={
            saving || permissionDenied
          }
          onClick={
            enabled
              ? disableNotifications
              : enableNotifications
          }
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Guardando..."
            : enabled
              ? "Desactivar"
              : "Activar"}
        </button>
      </div>

      {message && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          {message}
        </p>
      )}

      {permissionDenied && (
        <p className="mt-4 rounded-lg bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">
          Las notificaciones están bloqueadas
          desde la configuración del navegador.
          Debes permitirlas manualmente para
          volver a activarlas.
        </p>
      )}
    </section>
  );
}

