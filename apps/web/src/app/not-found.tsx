import StatusPage from "@/components/feedback/StatusPage";

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="No encontramos esta página"
      description="La dirección puede estar escrita de forma incorrecta, haber cambiado o ya no estar disponible."
    />
  );
}
