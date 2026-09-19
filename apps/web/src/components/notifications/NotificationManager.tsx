"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import {
  registerNotificationServiceWorker,
  subscribeToNotifications,
} from "@/lib/notifications";

const NOTIFICATION_DISMISSED_KEY =
  "canastas-verdes-notification-dismissed";

const NOTIFICATION_ENABLED_KEY =
  "canastas-verdes-notification-enabled";

export default function NotificationManager() {
  const [user, setUser] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setSupported(false);
      return;
    }

    setPermission(Notification.permission);

    const wasDismissed =
      localStorage.getItem(
        NOTIFICATION_DISMISSED_KEY
      ) === "true";

    const wasEnabled =
      localStorage.getItem(
        NOTIFICATION_ENABLED_KEY
      ) === "true";

    if (wasDismissed || wasEnabled) {
      setDismissed(true);
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          setUser(false);
          setSubscribed(false);
          return;
        }

        setUser(true);

        try {
          const registration =
            await registerNotificationServiceWorker();

          console.log(
            "[NotificationManager] Service Worker registrado."
          );

          if (Notification.permission === "granted") {
            console.log(
              "[NotificationManager] Permiso ya concedido."
            );

            const existingSubscription =
              await registration.pushManager.getSubscription();

            if (existingSubscription) {
              setSubscribed(true);

              localStorage.setItem(
                NOTIFICATION_ENABLED_KEY,
                "true"
              );

              setDismissed(true);
            }
          }
        } catch (error) {
          console.error(
            "[NotificationManager] Error:",
            error
          );
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const closeNotice = () => {
    localStorage.setItem(
      NOTIFICATION_DISMISSED_KEY,
      "true"
    );

    setDismissed(true);
  };

  if (!supported || !user) {
    return null;
  }

  if (permission === "denied") {
    if (dismissed) {
      return null;
    }

    return (
      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 9999,
          background: "#ffffff",
          border: "1px solid #cfe3d2",
          borderRadius: 12,
          padding: 16,
          width: "min(350px, calc(100vw - 40px))",
          boxShadow: "0 10px 30px rgba(0,0,0,.15)",
        }}
      >
        <button
          type="button"
          onClick={closeNotice}
          aria-label="Cerrar aviso"
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            border: 0,
            background: "transparent",
            color: "#5f7465",
            fontSize: 20,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <strong
          style={{
            display: "block",
            paddingRight: 24,
            color: "#17351f",
          }}
        >
          Las notificaciones están bloqueadas
        </strong>

        <p
          style={{
            marginTop: 8,
            color: "#5f7465",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          Debes permitir las notificaciones desde
          la configuración del navegador.
        </p>
      </div>
    );
  }

  if (dismissed || subscribed) {
    return null;
  }

  const activate = async () => {
    try {
      setLoading(true);
      setMessage("");

      console.log(
        "[NotificationManager] Solicitando permiso..."
      );

      const result =
        await Notification.requestPermission();

      console.log(
        "[NotificationManager] Resultado:",
        result
      );

      setPermission(result);

      if (result !== "granted") {
        setMessage(
          "No se concedió el permiso."
        );
        return;
      }

      console.log(
        "[NotificationManager] Creando suscripción..."
      );

      await subscribeToNotifications();

      console.log(
        "[NotificationManager] Suscripción guardada."
      );

      localStorage.setItem(
        NOTIFICATION_ENABLED_KEY,
        "true"
      );

      localStorage.setItem(
        NOTIFICATION_DISMISSED_KEY,
        "true"
      );

      setSubscribed(true);
      setDismissed(true);

      setMessage(
        "Notificaciones activadas correctamente."
      );
    } catch (error) {
      console.error(
        "[NotificationManager] Error activando:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Error activando las notificaciones."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 9999,
        background: "#ffffff",
        border: "1px solid #cfe3d2",
        borderRadius: 16,
        padding: 20,
        width: "min(380px, calc(100vw - 40px))",
        boxShadow: "0 10px 30px rgba(0,0,0,.15)",
      }}
    >
      <button
        type="button"
        onClick={closeNotice}
        aria-label="Cerrar aviso"
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          border: 0,
          background: "transparent",
          color: "#5f7465",
          fontSize: 22,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ×
      </button>

      <strong
        style={{
          display: "block",
          paddingRight: 28,
          color: "#17351f",
          fontSize: 18,
        }}
      >
        Activa las notificaciones
      </strong>

      <p
        style={{
          color: "#5f7465",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        Recibe avisos sobre tus pedidos,
        compras y novedades de Canastas Verdes.
      </p>

      <button
        type="button"
        onClick={activate}
        disabled={loading}
        style={{
          width: "100%",
          padding: "11px 16px",
          border: 0,
          borderRadius: 10,
          background: "#1f6b3a",
          color: "#ffffff",
          cursor: loading
            ? "wait"
            : "pointer",
          fontWeight: 600,
        }}
      >
        {loading
          ? "Activando..."
          : "Activar notificaciones"}
      </button>

      {message && (
        <p
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "#1f6b3a",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

