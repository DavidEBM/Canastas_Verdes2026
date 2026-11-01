import StatusPage from "@/components/feedback/StatusPage";

export default function Unauthorized() {
  return (
    <StatusPage
      code="401"
      title="Necesitas iniciar sesión"
      description="Tu sesión no está disponible o ha expirado. Inicia sesión para continuar con esta operación."
    />
  );
}
