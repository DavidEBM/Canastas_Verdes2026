import StatusPage from "@/components/feedback/StatusPage";

export default function Forbidden() {
  return (
    <StatusPage
      code="403"
      title="No tienes permiso para entrar"
      description="Tu cuenta no tiene autorización para consultar este contenido o realizar esta acción. Si necesitas acceso, contacta a un administrador."
    />
  );
}
