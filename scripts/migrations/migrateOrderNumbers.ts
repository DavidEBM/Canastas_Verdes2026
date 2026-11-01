import path from "node:path";

import { config as loadEnv } from "dotenv";

const projectRoot = process.cwd();

// Next.js carga .env.local, pero un script tsx no lo hace automáticamente.
// Cargamos las variantes habituales antes de importar Firebase Admin.
for (const file of [
  ".env",
  ".env.local",
  path.join("apps", "web", ".env"),
  path.join("apps", "web", ".env.local"),
]) {
  loadEnv({
    path: path.join(projectRoot, file),
    override: false,
  });
}

/**
 * Asigna números visibles a pedidos históricos sin tocar su ID interno.
 * Es idempotente: los pedidos que ya tienen numeroPedido se conservan.
 */
async function migrate() {
  const [{ FieldValue }, { adminDb }] = await Promise.all([
    import("firebase-admin/firestore"),
    import("../../apps/web/src/lib/firebase-admin"),
  ]);

  const snapshot = await adminDb.collection("pedidos").get();
  const documents = [...snapshot.docs].sort((left, right) => {
    const leftDate = left.data().fechaCreacion?.toDate?.()?.getTime?.() ?? 0;
    const rightDate = right.data().fechaCreacion?.toDate?.()?.getTime?.() ?? 0;
    return leftDate - rightDate || left.id.localeCompare(right.id);
  });

  let next = documents.reduce((max, document) => {
    const value = Number(document.data().numeroPedido ?? 0);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  let batch = adminDb.batch();
  let operations = 0;
  let migrated = 0;
  for (const document of documents) {
    if (
      typeof document.data().numeroPedido === "number" &&
      Number.isFinite(document.data().numeroPedido)
    ) continue;
    next += 1;
    batch.update(document.ref, {
      numeroPedido: next,
      numeroPedidoVisible: `CV-${String(next).padStart(6, "0")}`,
      ultimaActualizacion: FieldValue.serverTimestamp(),
    });
    operations += 1;
    migrated += 1;
    if (operations === 450) {
      await batch.commit();
      batch = adminDb.batch();
      operations = 0;
    }
  }
  if (operations > 0) await batch.commit();

  await adminDb.collection("secuencias").doc("pedidos").set({
    ultimoNumero: next,
    actualizadoEn: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`Pedidos revisados: ${documents.length}. Numerados: ${migrated}. Último número: ${next}.`);
}

migrate().catch((error) => {
  console.error("No fue posible migrar números de pedido:", error);
  process.exitCode = 1;
});
