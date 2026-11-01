"use client";

import { useEffect } from "react";

import StatusPage from "@/components/feedback/StatusPage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error inesperado en la aplicación:", error);
  }, [error]);

  return (
    <StatusPage
      code="500"
      title="Algo no salió como esperábamos"
      description="Ocurrió un error inesperado al cargar esta sección. Puedes volver atrás, regresar al inicio o intentar cargarla de nuevo."
      reset={reset}
    />
  );
}
