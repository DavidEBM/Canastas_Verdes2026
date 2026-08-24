export default function TiendaLoading() {
  return (
    <main
      className="flex min-h-dvh items-center justify-center px-6"
      aria-label="Cargando tienda"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900"
          aria-hidden="true"
        />

        <p className="text-sm text-gray-600">
          Cargando tienda...
        </p>
      </div>
    </main>
  );
}