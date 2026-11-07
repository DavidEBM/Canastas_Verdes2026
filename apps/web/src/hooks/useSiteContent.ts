"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  cloneDefaultContent,
  mergeSiteContent,
  SITE_CONTENT_DEFAULTS,
  type SiteContentMap,
  type SitePageKey,
} from "@/lib/site-content";

const STORAGE_PREFIX = "canastas-verdes:site-content:v1:";
const META_CHECK_TTL_MS = 60_000;

interface StoredContent<K extends SitePageKey> {
  page: K;
  content: SiteContentMap[K];
  lastDateUpdated: string | null;
  cachedAt: number;
}

interface SiteContentEventDetail {
  page?: SitePageKey;
  content?: unknown;
  lastDateUpdated?: string | null;
}

interface SiteContentState<K extends SitePageKey> {
  content: SiteContentMap[K];
  loading: boolean;
  error: string;
  lastDateUpdated: string | null;
  reload: () => Promise<void>;
}

const memoryCache = new Map<SitePageKey, StoredContent<SitePageKey>>();

function storageKey(page: SitePageKey) {
  return `${STORAGE_PREFIX}${page}`;
}

function readStored<K extends SitePageKey>(page: K): StoredContent<K> | null {
  const inMemory = memoryCache.get(page) as StoredContent<K> | undefined;
  if (inMemory) return inMemory;

  try {
    const raw = window.localStorage.getItem(storageKey(page));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredContent<K>>;
    if (!parsed.content || typeof parsed.content !== "object") return null;

    const stored: StoredContent<K> = {
      page,
      content: mergeSiteContent(page, parsed.content),
      lastDateUpdated:
        typeof parsed.lastDateUpdated === "string" ? parsed.lastDateUpdated : null,
      cachedAt: typeof parsed.cachedAt === "number" ? parsed.cachedAt : 0,
    };
    memoryCache.set(page, stored as StoredContent<SitePageKey>);
    return stored;
  } catch (error) {
    console.warn("No fue posible leer el contenido cacheado del sitio:", error);
    return null;
  }
}

function writeStored<K extends SitePageKey>(
  page: K,
  content: SiteContentMap[K],
  lastDateUpdated: string | null,
) {
  const stored: StoredContent<K> = {
    page,
    content: mergeSiteContent(page, content),
    lastDateUpdated,
    cachedAt: Date.now(),
  };

  memoryCache.set(page, stored as StoredContent<SitePageKey>);

  try {
    window.localStorage.setItem(storageKey(page), JSON.stringify(stored));
  } catch (error) {
    // El modo privado o una cuota agotada no debe impedir que el sitio funcione.
    console.warn("No fue posible guardar el contenido del sitio en localStorage:", error);
  }
}

async function getMeta(lastDateUpdated: string | null) {
  const query = new URLSearchParams({ meta: "1" });
  if (lastDateUpdated) query.set("lastDateUpdated", lastDateUpdated);

  const response = await fetch(`/api/contenido-sitio?${query.toString()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const result = (await response.json().catch(() => null)) as {
    success?: boolean;
    notModified?: boolean;
    data?: { lastDateUpdated?: string | null };
    message?: string;
  } | null;

  if (!response.ok || !result?.success) {
    throw new Error(result?.message ?? "No fue posible comprobar el contenido publicado.");
  }

  return {
    notModified: result.notModified === true,
    lastDateUpdated:
      typeof result.data?.lastDateUpdated === "string" ? result.data.lastDateUpdated : null,
  };
}

async function getPage<K extends SitePageKey>(page: K, lastDateUpdated: string | null) {
  const query = new URLSearchParams({ page });
  if (lastDateUpdated) query.set("lastDateUpdated", lastDateUpdated);

  const response = await fetch(`/api/contenido-sitio?${query.toString()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const result = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: Record<string, unknown>;
    lastDateUpdated?: string | null;
    message?: string;
  } | null;

  if (!response.ok || !result?.success || !result.data) {
    throw new Error(result?.message ?? "No fue posible cargar el contenido publicado.");
  }

  const serverContent = result.data[page];
  return {
    content: mergeSiteContent(page, serverContent),
    lastDateUpdated:
      typeof result.lastDateUpdated === "string" ? result.lastDateUpdated : null,
  };
}

export function cacheSiteContent<K extends SitePageKey>(
  page: K,
  content: SiteContentMap[K],
  lastDateUpdated: string | null,
) {
  if (typeof window === "undefined") return;
  writeStored(page, content, lastDateUpdated);
}

export function invalidateSiteContentCache(page?: SitePageKey) {
  if (typeof window === "undefined") return;

  if (page) {
    memoryCache.delete(page);
    window.localStorage.removeItem(storageKey(page));
    return;
  }

  memoryCache.clear();
  for (const pageKey of Object.keys(SITE_CONTENT_DEFAULTS) as SitePageKey[]) {
    window.localStorage.removeItem(storageKey(pageKey));
  }
}

export function useSiteContent<K extends SitePageKey>(page: K): SiteContentState<K> {
  const initial = cloneDefaultContent(page);
  const [content, setContent] = useState<SiteContentMap[K]>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastDateUpdated, setLastDateUpdated] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    const cached = readStored(page);

    if (cached) {
      setContent(cached.content);
      setLastDateUpdated(cached.lastDateUpdated);
    }

    setLoading(!cached);
    setError("");

    try {
      const shouldCheckMeta = !cached || Date.now() - cached.cachedAt >= META_CHECK_TTL_MS;

      if (!shouldCheckMeta && cached) {
        setLoading(false);
        return;
      }

      // La primera consulta siempre compara únicamente la fecha. Si el navegador
      // no tiene lastDateUpdated, se fuerza la descarga completa del documento.
      const meta = await getMeta(cached?.lastDateUpdated ?? null);
      if (requestId !== requestRef.current) return;

      if (cached?.lastDateUpdated && meta.notModified) {
        writeStored(page, cached.content, cached.lastDateUpdated);
        setLoading(false);
        return;
      }

      const fresh = await getPage(page, cached?.lastDateUpdated ?? null);
      if (requestId !== requestRef.current) return;

      writeStored(page, fresh.content, fresh.lastDateUpdated);
      setContent(fresh.content);
      setLastDateUpdated(fresh.lastDateUpdated);
    } catch (caught) {
      if (requestId !== requestRef.current) return;
      setError(caught instanceof Error ? caught.message : "No fue posible cargar el contenido.");
      // El contenido por defecto o el cacheado sigue disponible como fallback.
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onContentUpdated(event: Event) {
      const detail = (event as CustomEvent<SiteContentEventDetail>).detail;
      if (detail?.page !== page || !detail.content) return;

      const nextContent = mergeSiteContent(page, detail.content);
      const nextDate = typeof detail.lastDateUpdated === "string" ? detail.lastDateUpdated : null;
      writeStored(page, nextContent, nextDate);
      setContent(nextContent);
      setLastDateUpdated(nextDate);
      setError("");
    }

    function onStorage(event: StorageEvent) {
      if (event.key !== storageKey(page) || !event.newValue) return;
      try {
        const stored = JSON.parse(event.newValue) as StoredContent<K>;
        if (!stored.content) return;
        const nextContent = mergeSiteContent(page, stored.content);
        setContent(nextContent);
        setLastDateUpdated(stored.lastDateUpdated ?? null);
      } catch {
        // Una entrada corrupta no debe romper la página.
      }
    }

    window.addEventListener("site-content-updated", onContentUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("site-content-updated", onContentUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [page]);

  return { content, loading, error, lastDateUpdated, reload: load };
}

