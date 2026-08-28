export default function SkeletonDashboard() {
  return (
    <div
      className="animate-pulse space-y-6"
      aria-hidden="true"
    >
      {/* Encabezado */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-[var(--secondary)]" />
        <div className="h-4 w-72 rounded bg-[var(--secondary)]" />
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map(
          (_, index) => (
            <div
              key={index}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5"
            >
              <div className="h-4 w-24 rounded bg-[var(--secondary)]" />

              <div className="mt-4 h-8 w-20 rounded bg-[var(--secondary)]" />

              <div className="mt-3 h-3 w-32 rounded bg-[var(--secondary)]" />
            </div>
          ),
        )}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gráfico */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
          <div className="h-5 w-40 rounded bg-[var(--secondary)]" />

          <div className="mt-6 flex h-64 items-end gap-3">
            {Array.from({ length: 8 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-md bg-[var(--secondary)]"
                  style={{
                    height: `${35 + ((index * 17) % 55)}%`,
                  }}
                />
              ),
            )}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
          <div className="h-5 w-40 rounded bg-[var(--secondary)]" />

          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4 last:border-b-0"
                >
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-[var(--secondary)]" />
                    <div className="h-3 w-48 rounded bg-[var(--secondary)]" />
                  </div>

                  <div className="h-6 w-20 rounded-full bg-[var(--secondary)]" />
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}