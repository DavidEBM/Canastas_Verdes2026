"use client";

import Image from "next/image";

import SiteContentEditor from "@/components/content/SiteContentEditor";
import { useSiteContent } from "@/hooks/useSiteContent";

const heroFields = ["heroEyebrow", "heroTitle", "heroDescription", "heroImage"];
const storyFields = ["storyEyebrow", "storyTitle", "storyParagraph1", "storyParagraph2", "storyImage"];
const valuesFields = ["valuesEyebrow", "valuesTitle", "valuesDescription", "qualityTitle", "qualityDescription", "sustainabilityTitle", "sustainabilityDescription", "communityTitle", "communityDescription"];
const producersFields = ["producersEyebrow", "producersTitle", "producersDescription", "producersImage", "producersCta"];
const farmsFields = ["farmsEyebrow", "farmsTitle", "farmsDescription", "farmsImage", "farmsCta"];
const productsFields = ["productsEyebrow", "productsTitle", "productsDescription", "productsImage", "productsCta"];
const missionVisionFields = ["missionVisionEyebrow", "missionVisionTitle", "missionTitle", "missionDescription", "visionTitle", "visionDescription"];
const closingFields = ["closingTitle", "closingDescription"];

export default function AboutUsPage() {
  const { content, loading: contentLoading, error: contentError, lastDateUpdated } = useSiteContent("aboutUs");
  const contentUnavailable = Boolean(contentError && !lastDateUpdated);

  return (
    <main>
      <section className="relative min-h-[55dvh] overflow-hidden">
        <Image src={content.heroImage.url} alt={content.heroImage.alt} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-[rgb(23_53_31_/_68%)]" />
        <SiteContentEditor page="aboutUs" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={heroFields} title="Portada de Conócenos" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[rgb(23_53_31_/_80%)] px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]" />
        <div className="relative mx-auto flex min-h-[55dvh] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8"><div className="max-w-3xl text-white"><p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">{content.heroEyebrow}</p><h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{content.heroTitle}</h1><p className="mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">{content.heroDescription}</p></div></div>
      </section>

      <section className="relative bg-white py-16 sm:py-20">
        <SiteContentEditor page="aboutUs" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={storyFields} title="Historia de Conócenos" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8"><div><p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">{content.storyEyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">{content.storyTitle}</h2><p className="mt-6 leading-7 text-[var(--muted)]">{content.storyParagraph1}</p><p className="mt-4 leading-7 text-[var(--muted)]">{content.storyParagraph2}</p></div><div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)]"><Image src={content.storyImage.url} alt={content.storyImage.alt} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" /></div></div>
      </section>

      <section className="relative overflow-hidden bg-[var(--background)] py-16 sm:py-20">
        <SiteContentEditor page="aboutUs" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={producersFields} title="Información sobre productores" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
          <div className="relative order-2 aspect-[4/3] overflow-hidden rounded-[2rem] shadow-lg lg:order-1"><Image src={content.producersImage.url} alt={content.producersImage.alt} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" /></div>
          <div className="order-1 lg:order-2"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{content.producersEyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">{content.producersTitle}</h2><p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">{content.producersDescription}</p><a href="/ubicaciones" className="mt-7 inline-flex items-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90">{content.producersCta}</a></div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-[var(--border)] bg-white py-16 sm:py-20">
        <SiteContentEditor page="aboutUs" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={farmsFields} title="Información sobre fincas" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{content.farmsEyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">{content.farmsTitle}</h2><p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">{content.farmsDescription}</p><a href="/ubicaciones" className="mt-7 inline-flex items-center rounded-xl border-2 border-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary)] transition hover:-translate-y-0.5 hover:bg-[var(--secondary)]">{content.farmsCta}</a></div><div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-lg"><Image src={content.farmsImage.url} alt={content.farmsImage.alt} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" /></div></div>
      </section>

      <section className="relative overflow-hidden bg-[var(--surface)] py-16 sm:py-20">
        <SiteContentEditor page="aboutUs" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={productsFields} title="Información sobre productos" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8"><div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-lg"><Image src={content.productsImage.url} alt={content.productsImage.alt} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" /></div><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{content.productsEyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">{content.productsTitle}</h2><p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">{content.productsDescription}</p><a href="/tienda" className="mt-7 inline-flex items-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90">{content.productsCta}</a></div></div>
      </section>

      <section className="relative bg-[var(--surface)] py-16 sm:py-20">
        <SiteContentEditor page="aboutUs" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={valuesFields} title="Valores de Conócenos" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">{content.valuesEyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">{content.valuesTitle}</h2><p className="mt-4 text-[var(--muted)]">{content.valuesDescription}</p></div><div className="mt-12 grid gap-6 md:grid-cols-3">{[[content.qualityTitle, content.qualityDescription], [content.sustainabilityTitle, content.sustainabilityDescription], [content.communityTitle, content.communityDescription]].map(([title, description]) => <article key={title} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary)] text-lg font-bold text-[var(--primary)]">✓</div><h3 className="mt-5 text-xl font-bold text-[var(--foreground)]">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p></article>)}</div></div>
      </section>

      <section className="relative overflow-hidden border-y border-[var(--border)] bg-[var(--foreground)] py-16 text-white sm:py-20">
        <SiteContentEditor page="aboutUs" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={missionVisionFields} title="Misión y Visión" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">{content.missionVisionEyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{content.missionVisionTitle}</h2></div><div className="mt-10 grid gap-5 lg:grid-cols-2"><article className="rounded-[2rem] border border-white/15 bg-white/10 p-7 shadow-xl backdrop-blur-sm sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--secondary)] text-xl font-bold text-[var(--primary)]">M</div><h3 className="mt-6 text-2xl font-bold">{content.missionTitle}</h3><p className="mt-4 leading-7 text-white/75">{content.missionDescription}</p></article><article className="rounded-[2rem] border border-white/15 bg-[var(--primary)]/80 p-7 shadow-xl sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-[var(--secondary)]">V</div><h3 className="mt-6 text-2xl font-bold">{content.visionTitle}</h3><p className="mt-4 leading-7 text-white/80">{content.visionDescription}</p></article></div></div>
      </section>

      <section className="relative bg-[var(--primary)] py-16 text-white sm:py-20">
        <SiteContentEditor page="aboutUs" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={closingFields} title="Cierre de Conócenos" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]" />
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6"><h2 className="text-center text-3xl font-bold sm:text-4xl">{content.closingTitle}</h2><p className="mx-auto mt-5 w-full max-w-2xl !text-center leading-7 text-white/80" style={{ textAlign: "center" }}>{content.closingDescription}</p></div>
      </section>
    </main>
  );
}
