"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  ImagePlus,
  Pencil,
  RotateCcw,
  Save,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  cacheSiteContent,
} from "@/hooks/useSiteContent";
import {
  cloneDefaultContent,
  SITE_CONTENT_FIELDS,
  type AllyItem,
  type SiteContentField,
  type SiteContentMap,
  type SiteImage,
  type SitePageKey,
} from "@/lib/site-content";

interface SiteContentEditorProps<K extends SitePageKey> {
  page: K;
  content: SiteContentMap[K];
  fieldKeys?: string[];
  title?: string;
  className?: string;
  contentLoading?: boolean;
  contentUnavailable?: boolean;
}

type Draft = Record<string, unknown>;

function asDraft(value: unknown): Draft {
  return JSON.parse(JSON.stringify(value)) as Draft;
}

function imageFromDraft(draft: Draft, key: string): SiteImage {
  const value = draft[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const image = value as Partial<SiteImage>;
    return {
      url: typeof image.url === "string" ? image.url : "",
      publicId: typeof image.publicId === "string" ? image.publicId : null,
      alt: typeof image.alt === "string" ? image.alt : "",
    };
  }
  return { url: "", publicId: null, alt: "" };
}

function inputValue(draft: Draft, field: SiteContentField) {
  const value = draft[field.key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function galleryFromDraft(draft: Draft, key: string): AllyItem[] {
  const value = draft[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AllyItem => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const candidate = item as Partial<AllyItem>;
    return typeof candidate.id === "string" && Boolean(candidate.image && typeof candidate.image === "object");
  });
}

export default function SiteContentEditor<K extends SitePageKey>({
  page,
  content,
  fieldKeys,
  title,
  className,
  contentLoading = false,
  contentUnavailable = false,
}: SiteContentEditorProps<K>) {
  const { user, loading, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => asDraft(content));
  const [files, setFiles] = useState<Record<string, File>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const fields = useMemo(() => {
    const available = SITE_CONTENT_FIELDS[page];
    return fieldKeys?.length
      ? available.filter((field) => fieldKeys.includes(field.key))
      : available;
  }, [fieldKeys, page]);

  if (loading || contentLoading || contentUnavailable || role !== "admin" || !user) return null;

  function openEditor() {
    setDraft(asDraft(content));
    setFiles({});
    setNotice("");
    setError("");
    setOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setOpen(false);
    setError("");
    setNotice("");
  }

  function changeText(field: SiteContentField, value: string) {
    setDraft((current) => ({ ...current, [field.key]: value }));
    setError("");
    setNotice("");
  }

  function changeImage(field: SiteContentField, file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }
    setFiles((current) => ({ ...current, [field.key]: file }));
    setError("");
    setNotice("");
  }

  function restoreField(field: SiteContentField) {
    const defaults = asDraft(cloneDefaultContent(page));
    setDraft((current) => ({ ...current, [field.key]: defaults[field.key] }));
    setFiles((current) => {
      const next = { ...current };
      delete next[field.key];
      if (field.type === "gallery") {
        Object.keys(next).forEach((key) => {
          if (key.startsWith("items.")) delete next[key];
        });
      }
      return next;
    });
    setNotice("Se restauró el valor predeterminado. Guarda para publicarlo.");
  }

  function addGalleryItem(field: SiteContentField) {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `aliado-${Date.now()}`;
    const items = galleryFromDraft(draft, field.key);
    setDraft((current) => ({
      ...current,
      [field.key]: [
        ...items,
        {
          id,
          active: true,
          image: { url: "", publicId: null, alt: "Nuevo aliado" },
        } satisfies AllyItem,
      ],
    }));
    setNotice("Nueva imagen añadida. Selecciona el archivo antes de guardar.");
  }

  function removeGalleryItem(field: SiteContentField, id: string) {
    const items = galleryFromDraft(draft, field.key);
    setDraft((current) => ({
      ...current,
      [field.key]: items.filter((item) => item.id !== id),
    }));
    setFiles((current) => {
      const next = { ...current };
      delete next[`items.${id}`];
      return next;
    });
    setNotice("Imagen retirada del carrusel. Guarda para publicar el cambio.");
  }

  function updateGalleryItem(field: SiteContentField, id: string, update: Partial<AllyItem> | { alt: string }) {
    const items = galleryFromDraft(draft, field.key);
    setDraft((current) => ({
      ...current,
      [field.key]: items.map((item) => item.id === id
        ? { ...item, ...update, image: "alt" in update ? { ...item.image, alt: update.alt } : item.image }
        : item),
    }));
    setNotice("");
  }

  async function uploadImage(file: File, field: SiteContentField) {
    return uploadImageWithName(file, field, `site-${page}-${field.key}`);
  }

  async function uploadImageWithName(file: File, field: SiteContentField, imageName: string) {
    const token = await user!.getIdToken(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("imageName", imageName);

    const response = await fetch("/api/cloudinary/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    });
    const result = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: { imgPath?: string; imageName?: string };
      message?: string;
    } | null;

    if (!response.ok || !result?.success || !result.data?.imgPath) {
      throw new Error(result?.message ?? `No fue posible cargar ${field.label.toLowerCase()}.`);
    }

    return {
      url: result.data.imgPath,
      publicId: result.data.imageName ?? null,
    };
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const nextDraft: Draft = { ...draft };
      const oldImages: string[] = [];

      for (const field of fields) {
        if (field.type === "gallery") {
          const previousItems = galleryFromDraft(draft, field.key);
          const nextItems = galleryFromDraft(nextDraft, field.key);
          const previousById = new Map(previousItems.map((item) => [item.id, item]));

          for (const item of nextItems) {
            const file = files[`items.${item.id}`];
            if (!file) continue;
            const uploaded = await uploadImageWithName(file, field, `site-${page}-ally-${item.id}`);
            const previous = previousById.get(item.id);
            const previousPublicId = previous?.image.publicId;
            item.image = { ...item.image, ...uploaded };
            if (previousPublicId && previousPublicId !== uploaded.publicId) {
              oldImages.push(previousPublicId);
            }
          }

          for (const previous of previousItems) {
            if (!nextItems.some((item) => item.id === previous.id) && previous.image.publicId) {
              oldImages.push(previous.image.publicId);
            }
          }

          nextDraft[field.key] = nextItems;
          continue;
        }

        if (field.type !== "image" || !files[field.key]) continue;
        const previous = imageFromDraft(draft, field.key);
        const uploaded = await uploadImage(files[field.key]!, field);
        nextDraft[field.key] = { ...previous, ...uploaded } satisfies SiteImage;
        if (previous.publicId && previous.publicId !== uploaded.publicId) oldImages.push(previous.publicId);
      }

      const token = await user!.getIdToken(true);
      const response = await fetch("/api/contenido-sitio", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page, content: nextDraft }),
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as {
        success?: boolean;
        data?: {
          content?: SiteContentMap[K];
          lastDateUpdated?: string | null;
        };
        message?: string;
      } | null;

      if (!response.ok || !result?.success || !result.data?.content) {
        throw new Error(result?.message ?? "No fue posible publicar los cambios.");
      }

      const nextContent = result.data.content;
      const nextDate = result.data.lastDateUpdated ?? null;
      cacheSiteContent(page, nextContent, nextDate);
      window.dispatchEvent(
        new CustomEvent("site-content-updated", {
          detail: { page, content: nextContent, lastDateUpdated: nextDate },
        }),
      );

      // La eliminación antigua es secundaria: nunca invalida una publicación válida.
      for (const publicId of oldImages) {
        try {
          await fetch("/api/cloudinary/upload", {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ publicId }),
          });
        } catch (cleanupError) {
          console.warn("No fue posible limpiar una imagen anterior:", cleanupError);
        }
      }

      setDraft(asDraft(nextContent));
      setFiles({});
      setNotice("Contenido publicado correctamente.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className={
          className ??
          "fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]"
        }
        aria-label={`Editar ${title ?? page}`}
        title={`Editar ${title ?? page}`}
      >
        <Pencil size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Editar</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgb(8_24_15_/_65%)] p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`site-content-editor-${page}`}
        >
          <div className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] border border-white/20 bg-[var(--background)] shadow-2xl sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--foreground)] px-5 py-5 text-white sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--secondary)]">
                  Editor de contenido
                </p>
                <h2 id={`site-content-editor-${page}`} className="mt-1 text-xl font-bold sm:text-2xl">
                  {title ?? `Editar ${page}`}
                </h2>
                <p className="mt-1 text-sm text-white/65">
                  Cambios para eventos, temporadas y comunicaciones especiales.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full border border-white/20 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar editor"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-7">
              <div className="grid gap-5 sm:grid-cols-2">
                {fields.map((field) => {
                  const isImage = field.type === "image";
                  const isGallery = field.type === "gallery";
                  const asset = isImage ? imageFromDraft(draft, field.key) : null;
                  const galleryItems = isGallery ? galleryFromDraft(draft, field.key) : [];

                  return (
                    <div key={field.key} className={isImage || isGallery || field.type === "textarea" ? "sm:col-span-2" : ""}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor={`site-field-${page}-${field.key}`} className="text-sm font-semibold text-[var(--foreground)]">
                          {field.label}
                        </label>
                        <button
                          type="button"
                          onClick={() => restoreField(field)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                          title="Restaurar valor predeterminado"
                        >
                          <RotateCcw size={12} aria-hidden="true" />
                          Restaurar
                        </button>
                      </div>

                      {isGallery ? (
                        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {galleryItems.map((item) => (
                              <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                                <div className="flex items-start gap-3">
                                  {item.image.url ? (
                                    <Image src={item.image.url} alt={item.image.alt || "Vista previa"} width={96} height={64} unoptimized className="h-16 w-24 shrink-0 rounded-lg object-contain" />
                                  ) : (
                                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-xs text-[var(--muted)]">Sin imagen</div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <label className="block text-xs font-semibold text-[var(--foreground)]">Texto alternativo</label>
                                    <input value={item.image.alt} maxLength={180} onChange={(event) => updateGalleryItem(field, item.id, { alt: event.target.value })} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-xs outline-none focus:border-[var(--primary)]" />
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]"><input type="checkbox" checked={item.active !== false} onChange={(event) => updateGalleryItem(field, item.id, { active: event.target.checked })} /> Visible</label>
                                  <button type="button" onClick={() => removeGalleryItem(field, item.id)} className="text-xs font-semibold text-red-700 hover:underline">Quitar</button>
                                </div>
                                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--secondary)]">
                                  {files[`items.${item.id}`]?.name ?? (item.image.url ? "Cambiar imagen" : "Seleccionar imagen")}
                                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => changeImage({ ...field, key: `items.${item.id}` }, event.target.files?.[0])} />
                                </label>
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => addGalleryItem(field)} className="mt-3 inline-flex items-center rounded-xl border border-[var(--primary)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--secondary)]">+ Agregar imagen</button>
                          <p className="mt-2 text-xs text-[var(--muted)]">{field.help}</p>
                        </div>
                      ) : isImage ? (
                        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-3">
                          {asset?.url && (
                            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2">
                              <Image src={asset.url} alt="Vista previa" width={96} height={64} unoptimized className="h-16 w-24 rounded-lg object-cover" />
                              <p className="min-w-0 flex-1 truncate text-xs text-[var(--muted)]">{asset.url}</p>
                            </div>
                          )}
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--secondary)]">
                            <ImagePlus size={17} aria-hidden="true" />
                            {files[field.key]?.name ?? "Seleccionar nueva imagen"}
                            <input
                              id={`site-field-${page}-${field.key}`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={(event) => changeImage(field, event.target.files?.[0])}
                            />
                          </label>
                          <p className="mt-2 text-xs text-[var(--muted)]">{field.help}</p>
                        </div>
                      ) : field.type === "textarea" ? (
                        <textarea
                          id={`site-field-${page}-${field.key}`}
                          value={inputValue(draft, field)}
                          maxLength={field.maxLength}
                          rows={4}
                          onChange={(event) => changeText(field, event.target.value)}
                          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm leading-6 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        />
                      ) : (
                        <input
                          id={`site-field-${page}-${field.key}`}
                          type={field.type === "url" ? "url" : field.type === "number" ? "number" : "text"}
                          value={inputValue(draft, field)}
                          maxLength={field.maxLength}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          onChange={(event) => changeText(field, event.target.value)}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
              {notice && <p className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><Check size={16} aria-hidden="true" />{notice}</p>}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button type="button" onClick={closeEditor} disabled={saving} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)] disabled:opacity-50">
                Cerrar
              </button>
              <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                <Save size={16} aria-hidden="true" />
                {saving ? "Publicando…" : "Guardar y publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

