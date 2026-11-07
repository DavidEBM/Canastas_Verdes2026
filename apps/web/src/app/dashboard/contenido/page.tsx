"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, ImagePlus, Pencil } from "lucide-react";

const pages = [
  { key: "inicio", label: "Inicio", href: "/", description: "Portada, beneficios, historia y llamado final." },
  { key: "productos", label: "Productos", href: "/tienda", description: "Solo el encabezado superior de la tienda." },
  { key: "aboutUs", label: "Conócenos", href: "/aboutUs", description: "Portada, historia, valores y cierre institucional." },
  { key: "fincas", label: "Fincas", href: "/ubicaciones", description: "Título, descripción e imagen de fondo del mapa." },
  { key: "contacto", label: "Contacto", href: "/contacto", description: "Información, redes, formulario y enlace a fincas." },
  { key: "aliados", label: "Nuestros aliados", href: "/", description: "Título, texto, imágenes visibles y velocidad del carrusel." },
];

export default function SiteContentDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[var(--foreground)] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--primary)]/50 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--secondary)]">Herramienta editorial</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Contenido del sitio</h1>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
            Publica cambios para temporadas, festividades y eventos sin modificar el código. El contenido se conserva en cache en cada navegador y solo se descarga de nuevo cuando cambia su fecha de publicación.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <article key={page.key} className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 transition hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--primary)]"><Pencil size={19} aria-hidden="true" /></div>
              <Link href={page.href} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--border)] p-2 text-[var(--muted)] transition hover:text-[var(--primary)]" aria-label={`Abrir ${page.label}`}><ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
            <h2 className="mt-5 text-xl font-bold text-[var(--foreground)]">{page.label}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--muted)]">{page.description}</p>
            <Link href={page.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] transition group-hover:gap-3">Editar en la página <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><CalendarDays className="text-[var(--primary)]" size={21} aria-hidden="true" /><h2 className="mt-4 font-semibold">Publicación atómica</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Cada guardado actualiza el contenido y `lastDateUpdated` dentro de la misma transacción.</p></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><ImagePlus className="text-[var(--primary)]" size={21} aria-hidden="true" /><h2 className="mt-4 font-semibold">Imágenes protegidas</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Las imágenes se validan y se suben mediante la ruta administrativa de Cloudinary.</p></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Pencil className="text-[var(--primary)]" size={21} aria-hidden="true" /><h2 className="mt-4 font-semibold">Alcance controlado</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">No modifica productos, precios, stock, mapas ni formularios operativos.</p></div>
      </section>
    </main>
  );
}

