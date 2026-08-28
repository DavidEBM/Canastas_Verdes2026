export default function SkeletonMenu() {
  return (
    <div
      className="animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-4 py-4">
        {/* Logo */}
        <div className="h-7 w-40 rounded-md bg-[var(--secondary)]" />

        {/* Desktop */}
        <div className="hidden items-center gap-5 md:flex">
          <div className="h-4 w-14 rounded bg-[var(--secondary)]" />
          <div className="h-4 w-14 rounded bg-[var(--secondary)]" />
          <div className="h-4 w-20 rounded bg-[var(--secondary)]" />
          <div className="h-4 w-24 rounded bg-[var(--secondary)]" />
          <div className="h-9 w-32 rounded-lg bg-[var(--secondary)]" />
        </div>

        {/* Mobile */}
        <div className="h-10 w-10 rounded-lg bg-[var(--secondary)] md:hidden" />
      </div>
    </div>
  );
}