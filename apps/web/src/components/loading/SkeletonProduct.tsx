export default function SkeletonProduct() {
  return (
    <article
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm"
      aria-hidden="true"
    >
      <div className="animate-pulse">
        {/* Imagen */}
        <div className="aspect-square w-full bg-[var(--secondary)]" />

        {/* Información */}
        <div className="space-y-4 p-4">
          {/* Categoría */}
          <div className="h-3 w-20 rounded bg-[var(--secondary)]" />

          {/* Nombre */}
          <div className="h-5 w-3/4 rounded bg-[var(--secondary)]" />

          {/* Descripción */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-[var(--secondary)]" />
            <div className="h-3 w-5/6 rounded bg-[var(--secondary)]" />
          </div>

          {/* Precio */}
          <div className="h-6 w-28 rounded bg-[var(--secondary)]" />

          {/* Unidad / stock */}
          <div className="flex justify-between gap-3">
            <div className="h-4 w-20 rounded bg-[var(--secondary)]" />
            <div className="h-4 w-24 rounded bg-[var(--secondary)]" />
          </div>

          {/* Botón */}
          <div className="h-10 w-full rounded-lg bg-[var(--secondary)]" />
        </div>
      </div>
    </article>
  );
}