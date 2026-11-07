import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import {
  mergeSiteContent,
  normalizeSiteContent,
  SITE_CONTENT_PAGES,
  type SitePageKey,
} from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "contenidoSitio";
const META_ID = "siteMeta";
const META_CACHE_MS = 30_000;

interface SiteMeta {
  lastDateUpdated: string | null;
  version: number;
}

interface MetaCache {
  expiresAt: number;
  value: SiteMeta;
}

const globalCache = globalThis as typeof globalThis & {
  __canastasSiteContentMeta?: MetaCache;
};

function isPageKey(value: string): value is SitePageKey {
  return (SITE_CONTENT_PAGES as readonly string[]).includes(value);
}

function timestampToIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      const date = toDate();
      if (date instanceof Date) return date.toISOString();
    }
  }
  if (typeof value === "string") return value;
  return null;
}

function responseHeaders(meta: SiteMeta): HeadersInit {
  return {
    "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    "Last-Modified": meta.lastDateUpdated
      ? new Date(meta.lastDateUpdated).toUTCString()
      : new Date(0).toUTCString(),
  };
}

async function getMeta(force = false): Promise<SiteMeta> {
  const cached = globalCache.__canastasSiteContentMeta;
  if (!force && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const snapshot = await adminDb.collection(COLLECTION).doc(META_ID).get();
  const data = snapshot.data() ?? {};
  const value: SiteMeta = {
    lastDateUpdated: timestampToIso(data.lastDateUpdated),
    version: typeof data.version === "number" ? data.version : 0,
  };

  globalCache.__canastasSiteContentMeta = {
    expiresAt: Date.now() + META_CACHE_MS,
    value,
  };

  return value;
}

function authError(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === "NO_AUTH") {
    return NextResponse.json(
      { success: false, message: "Debes iniciar sesión." },
      { status: 401 },
    );
  }
  if (error.message === "FORBIDDEN") {
    return NextResponse.json(
      { success: false, message: "Solo un administrador puede editar el contenido." },
      { status: 403 },
    );
  }
  return null;
}

function parseRequestedPages(searchParams: URLSearchParams): SitePageKey[] {
  const raw = searchParams.get("pages") ?? searchParams.get("page");
  if (!raw) return [...SITE_CONTENT_PAGES];

  const pages = raw
    .split(",")
    .map((page) => page.trim())
    .filter(isPageKey);

  return pages.length > 0 ? [...new Set(pages)] : [...SITE_CONTENT_PAGES];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const meta = await getMeta();
    const isMetaOnly = url.searchParams.get("meta") === "1";
    const lastDateUpdated = url.searchParams.get("lastDateUpdated");

    if (isMetaOnly || (lastDateUpdated && lastDateUpdated === meta.lastDateUpdated)) {
      return NextResponse.json(
        {
          success: true,
          notModified: Boolean(lastDateUpdated && lastDateUpdated === meta.lastDateUpdated),
          data: meta,
        },
        { headers: responseHeaders(meta) },
      );
    }

    const pages = parseRequestedPages(url.searchParams);
    const snapshots = await adminDb.getAll(
      ...pages.map((page) => adminDb.collection(COLLECTION).doc(page)),
    );

    const data = Object.fromEntries(
      snapshots.map((snapshot, index) => {
        const page = pages[index];
        const storedContent = snapshot.exists ? snapshot.data()?.content : null;
        return [page, mergeSiteContent(page, storedContent)];
      }),
    );

    return NextResponse.json(
      {
        success: true,
        notModified: false,
        data,
        lastDateUpdated: meta.lastDateUpdated,
        version: meta.version,
      },
      { headers: responseHeaders(meta) },
    );
  } catch (error) {
    console.error("GET /api/contenido-sitio", error);
    return NextResponse.json(
      { success: false, message: "No fue posible cargar el contenido del sitio." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Los datos enviados no son válidos." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;
    const pageValue = typeof input.page === "string" ? input.page.trim() : "";
    if (!isPageKey(pageValue)) {
      return NextResponse.json(
        { success: false, message: "La página de contenido no es válida." },
        { status: 400 },
      );
    }

    if (!input.content || typeof input.content !== "object" || Array.isArray(input.content)) {
      return NextResponse.json(
        { success: false, message: "El contenido de la página no es válido." },
        { status: 400 },
      );
    }

    const normalized = normalizeSiteContent(pageValue, input.content);
    if (normalized.errors.length > 0) {
      return NextResponse.json(
        { success: false, message: normalized.errors.join(" ") },
        { status: 400 },
      );
    }

    const metaRef = adminDb.collection(COLLECTION).doc(META_ID);
    const pageRef = adminDb.collection(COLLECTION).doc(pageValue);
    let lastDateUpdated: Timestamp | null = null;
    let version = 0;

    await adminDb.runTransaction(async (transaction) => {
      const metaSnapshot = await transaction.get(metaRef);
      const currentVersion = metaSnapshot.data()?.version;
      version = typeof currentVersion === "number" ? currentVersion + 1 : 1;
      // Se genera dentro de la transacción para que un reintento por concurrencia
      // siempre produzca una fecha posterior al guardado que lo precedió.
      lastDateUpdated = Timestamp.now();

      transaction.set(
        pageRef,
        {
          page: pageValue,
          content: normalized.data,
          updatedAt: lastDateUpdated,
          updatedBy: actor.uid,
          updatedByEmail: actor.email ?? null,
        },
        { merge: false },
      );

      transaction.set(
        metaRef,
        {
          lastDateUpdated,
          version,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: actor.uid,
        },
        { merge: true },
      );
    });

    const committedDate = lastDateUpdated ?? Timestamp.now();
    const meta: SiteMeta = {
      lastDateUpdated: committedDate.toDate().toISOString(),
      version,
    };
    globalCache.__canastasSiteContentMeta = {
      expiresAt: Date.now() + META_CACHE_MS,
      value: meta,
    };

    return NextResponse.json({
      success: true,
      data: {
        page: pageValue,
        content: normalized.data,
        ...meta,
      },
    });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error("PUT /api/contenido-sitio", error);
    return NextResponse.json(
      { success: false, message: "No fue posible guardar el contenido del sitio." },
      { status: 500 },
    );
  }
}

