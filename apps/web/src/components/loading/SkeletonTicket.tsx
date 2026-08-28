export default function SkeletonTicket() {
  return (
    <article
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm"
      aria-hidden="true"
    >
      <div className="animate-pulse p-5">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-[var(--secondary)]" />
            <div className="h-5 w-32 rounded bg-[var(--secondary)]" />
          </div>

          {/* Estado */}
          <div className="h-7 w-24 rounded-full bg-[var(--secondary)]" />
        </div>

        {/* Fecha */}
        <div className="mt-4 h-3 w-40 rounded bg-[var(--secondary)]" />

        {/* Productos */}
        <div className="mt-6 space-y-3">
          <div className="h-3 w-24 rounded bg-[var(--secondary)]" />

          <div className="flex items-center justify-between rounded-lg bg-[var(--surface)] p-3">
            <div className="h-4 w-40 rounded bg-[var(--secondary)]" />
            <div className="h-4 w-16 rounded bg-[var(--secondary)]" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[var(--surface)] p-3">
            <div className="h-4 w-32 rounded bg-[var(--secondary)]" />
            <div className="h-4 w-16 rounded bg-[var(--secondary)]" />
          </div>
        </div>

        {/* Total */}
        <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div className="h-4 w-20 rounded bg-[var(--secondary)]" />
          <div className="h-6 w-28 rounded bg-[var(--secondary)]" />
        </div>

        {/* Botón */}
        <div className="mt-4 h-10 w-full rounded-lg bg-[var(--secondary)]" />
      </div>
    </article>
  );
}