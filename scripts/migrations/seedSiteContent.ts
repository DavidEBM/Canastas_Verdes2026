import { FieldValue, Timestamp } from "firebase-admin/firestore";
import dotenv from "dotenv";
import path from "node:path";

import {
  SITE_CONTENT_DEFAULTS,
  SITE_CONTENT_PAGES,
} from "../../apps/web/src/lib/site-content.ts";

const COLLECTION = "contenidoSitio";
const META_ID = "siteMeta";

dotenv.config({ path: path.resolve(process.cwd(), "apps", "web", ".env.local") });

const { adminDb } = await import("../../apps/web/src/lib/firebase-admin.ts");

async function main() {
  const metaRef = adminDb.collection(COLLECTION).doc(META_ID);
  const existingMeta = await metaRef.get();
  const pageRefs = SITE_CONTENT_PAGES.map((page) => adminDb.collection(COLLECTION).doc(page));
  const existingPages = await adminDb.getAll(...pageRefs);
  const pagesToUpdate = SITE_CONTENT_PAGES.flatMap((page, index) => {
    const snapshot = existingPages[index];
    const existingContent = snapshot?.data()?.content;
    const current = existingContent && typeof existingContent === "object" && !Array.isArray(existingContent)
      ? existingContent as Record<string, unknown>
      : {};
    const merged = { ...SITE_CONTENT_DEFAULTS[page], ...current };
    const needsBackfill = !snapshot?.exists || Object.keys(SITE_CONTENT_DEFAULTS[page]).some((key) => !(key in current));

    return needsBackfill ? [{ page, content: merged }] : [];
  });

  if (existingMeta.exists && pagesToUpdate.length === 0) {
    console.log("La colección contenidoSitio ya fue inicializada; no se sobrescribieron datos.");
    return;
  }

  const now = Timestamp.now();
  const batch = adminDb.batch();

  for (const item of pagesToUpdate) {
    const page = item.page;
    batch.set(adminDb.collection(COLLECTION).doc(page), {
      page,
      content: item.content,
      updatedAt: now,
      updatedBy: "seedSiteContent",
      updatedByEmail: null,
    });
  }

  const currentVersion = existingMeta.data()?.version;
  batch.set(metaRef, {
    lastDateUpdated: now,
    version: typeof currentVersion === "number" ? currentVersion + 1 : 1,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: "seedSiteContent",
  });

  await batch.commit();
  console.log(`Contenido inicial/backfill aplicado en ${pagesToUpdate.length} páginas.`);
}

main().catch((error) => {
  console.error("No fue posible inicializar contenidoSitio:", error);
  process.exitCode = 1;
});

