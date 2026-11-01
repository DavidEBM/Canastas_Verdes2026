"use client";

import { useEffect } from "react";

import "./globals.css";
import StatusPage from "@/components/feedback/StatusPage";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error crítico global de la aplicación:", error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <StatusPage
          code="500"
          title="La aplicación necesita recargarse"
          description="Se produjo un error crítico al preparar la página. Puedes volver atrás, regresar al inicio o intentar cargarla de nuevo."
          reset={reset}
        />
      </body>
    </html>
  );
}
