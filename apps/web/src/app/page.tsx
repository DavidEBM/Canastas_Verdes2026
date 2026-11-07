"use client";

import Image from "next/image";
import Link from "next/link";

import SiteContentEditor from "@/components/content/SiteContentEditor";
import { useSiteContent } from "@/hooks/useSiteContent";

const heroFields = ["heroEyebrow", "heroTitle", "heroDescription", "heroImage", "primaryCta", "secondaryCta"];
const experienceFields = ["experienceTitle", "experienceDescription", "feature1Title", "feature1Description", "feature2Title", "feature2Description", "feature3Title", "feature3Description"];
const storyFields = ["storyTitleLine1", "storyTitleLine2", "storyDescription1", "storyDescription2", "storyImage"];
const closingFields = ["closingTitle", "closingDescription", "closingCta"];

export default function HomePage() {
  const { content, loading: contentLoading, error: contentError, lastDateUpdated } = useSiteContent("inicio");
  const contentUnavailable = Boolean(contentError && !lastDateUpdated);

  return (
    <main className="min-h-[calc(100dvh-4rem)]">
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <Image src={content.heroImage.url} alt={content.heroImage.alt} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[rgb(23_40_31/_37%)]" aria-hidden="true" />
        <SiteContentEditor page="inicio" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={heroFields} title="Portada de inicio" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[rgb(23_40_31_/_80%)] px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]" />
        <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-[var(--secondary)] px-3 py-1 text-sm font-medium text-[var(--secondary-foreground)]">{content.heroEyebrow}</span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">{content.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/90 sm:text-lg">{content.heroDescription}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/tienda" className="inline-flex min-h-11 items-center justify-center rounded-md border-2 border-white/50 bg-[var(--primary)]/70 px-6 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--primary)]">{content.primaryCta}</Link>
              <Link href="/aboutUs" className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/70 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">{content.secondaryCta}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <SiteContentEditor page="inicio" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={experienceFields} title="Beneficios de inicio" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl"><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.experienceTitle}</h2><p className="mt-4 text-base leading-7 text-[var(--muted)]">{content.experienceDescription}</p></div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6"><h3 className="text-lg font-semibold">{content.feature1Title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{content.feature1Description}</p></article>
            <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6"><h3 className="text-lg font-semibold">{content.feature2Title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{content.feature2Description}</p></article>
            <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6"><h3 className="text-lg font-semibold">{content.feature3Title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{content.feature3Description}</p></article>
          </div>
        </div>
      </section>

      <section className="relative border-t border-[var(--border)]">
        <SiteContentEditor page="inicio" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={storyFields} title="Historia de inicio" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
          <div className="overflow-hidden rounded-2xl shadow-lg"><Image src={content.storyImage.url} alt={content.storyImage.alt} width={960} height={640} sizes="(min-width: 1024px) 50vw, 100vw" className="h-80 w-full object-cover sm:h-96" /></div>
          <div><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.storyTitleLine1}<br />{content.storyTitleLine2}</h2><p className="mt-6 text-base leading-7 text-[var(--muted)]">{content.storyDescription1}</p><p className="mt-5 text-base leading-7 text-[var(--muted)]">{content.storyDescription2}</p></div>
        </div>
      </section>

      <section className="relative border-t border-[var(--border)] bg-[var(--surface)]">
        <SiteContentEditor page="inicio" content={content} contentLoading={contentLoading} contentUnavailable={contentUnavailable} fieldKeys={closingFields} title="Cierre de inicio" className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:bg-[var(--secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20"><h2 className="mx-auto text-3xl font-bold tracking-tight sm:text-4xl">{content.closingTitle}</h2><p className="mx-auto mt-4 w-full max-w-2xl text-center leading-7 text-[var(--muted)]">{content.closingDescription}</p><Link href="/tienda" className="mx-auto mt-8 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--primary)] px-6 text-center text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90">{content.closingCta}</Link></div>
      </section>
    </main>
  );
}
