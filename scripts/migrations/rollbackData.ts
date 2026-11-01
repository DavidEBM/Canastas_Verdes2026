import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";

/* =========================================================
   CARGAR .env.local DE APPS/WEB
========================================================= */

const envPath = path.resolve(
  process.cwd(),
  "apps",
  "web",
  ".env.local",
);

if (!fs.existsSync(envPath)) {
  throw new Error(
    `No se encontró el archivo de entorno:\n${envPath}`,
  );
}

dotenv.config({
  path: envPath,
});

/* =========================================================
   FIREBASE ADMIN
========================================================= */

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    [
      "Faltan variables de Firebase Admin.",
      `Archivo leído: ${envPath}`,
      "",
      `FIREBASE_PROJECT_ID: ${projectId ? "OK" : "FALTA"}`,
      `FIREBASE_CLIENT_EMAIL: ${clientEmail ? "OK" : "FALTA"}`,
      `FIREBASE_PRIVATE_KEY: ${privateKey ? "OK" : "FALTA"}`,
    ].join("\n"),
  );
}

const firebaseApp = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  }),
});

const adminDb = getFirestore(firebaseApp);

/* =========================================================
   COLECCIONES
========================================================= */

const PRODUCTS_COLLECTION = "productos";
const IMPORTACIONES_COLLECTION = "importaciones";

/* =========================================================
   TIPOS
========================================================= */

interface ImportChange {
  orden: number;
  productoId: string;
  codigo: string;
  operacion: "crear" | "actualizar";
  datosAnteriores:
    | Record<string, unknown>
    | null;
}

/* =========================================================
   VALIDAR OPERACIÓN
========================================================= */

function isImportOperation(
  value: unknown,
): value is "crear" | "actualizar" {
  return (
    value === "crear" ||
    value === "actualizar"
  );
}

/* =========================================================
   ROLLBACK
========================================================= */

async function rollbackData(
  importId: string,
): Promise<void> {
  if (!importId) {
    throw new Error(
      "Debes proporcionar el ID de la importación.",
    );
  }

  console.log("");
  console.log("========================================");
  console.log(" CANASTAS VERDES - ROLLBACK");
  console.log("========================================");
  console.log("");
  console.log(`Importación: ${importId}`);
  console.log(`Entorno: ${envPath}`);
  console.log("");

  const importRef = adminDb
    .collection(IMPORTACIONES_COLLECTION)
    .doc(importId);

  const importSnapshot =
    await importRef.get();

  if (!importSnapshot.exists) {
    throw new Error(
      `No existe la importación "${importId}".`,
    );
  }

  const importData =
    importSnapshot.data();

  const estado = importData?.estado;

  if (
    estado === "revertida" ||
    estado ===
      "revertida_con_omisiones"
  ) {
    throw new Error(
      `La importación "${importId}" ya fue revertida.`,
    );
  }

  if (estado !== "completada") {
    throw new Error(
      `La importación no puede revertirse porque su estado actual es "${estado}".`,
    );
  }

  const changesSnapshot =
    await importRef
      .collection("cambios")
      .get();

  if (changesSnapshot.empty) {
    throw new Error(
      "La importación no contiene registros de cambios.",
    );
  }

  const changes: ImportChange[] = [];

  for (const document of changesSnapshot.docs) {
    const data = document.data();

    if (!isImportOperation(data.operacion)) {
      throw new Error(
        `El cambio "${document.id}" tiene una operación inválida.`,
      );
    }

    const previousData =
      data.datosAnteriores;

    if (
      previousData !== null &&
      typeof previousData !== "object"
    ) {
      throw new Error(
        `El cambio "${document.id}" tiene datosAnteriores inválidos.`,
      );
    }

    changes.push({
      orden: Number(data.orden),
      productoId: String(
        data.productoId ?? "",
      ),
      codigo: String(
        data.codigo ?? "",
      ),
      operacion: data.operacion,
      datosAnteriores:
        previousData as
          | Record<string, unknown>
          | null,
    });
  }

  changes.sort(
    (a, b) => b.orden - a.orden,
  );

  console.log(
    `Cambios encontrados: ${changes.length}`,
  );
  console.log("");
  console.log("Iniciando rollback...");
  console.log("");

  let restoredCount = 0;
  let deletedCount = 0;
  let skippedCount = 0;

  for (const change of changes) {
    const productRef = adminDb
      .collection(PRODUCTS_COLLECTION)
      .doc(change.productoId);

    const productSnapshot =
      await productRef.get();

    /* =====================================================
       PRODUCTO CREADO POR LA IMPORTACIÓN
    ===================================================== */

    if (change.operacion === "crear") {
      if (!productSnapshot.exists) {
        skippedCount++;

        console.log(
          `[OMITIDO] ${change.codigo} - el producto ya no existe.`,
        );

        continue;
      }

      const currentData =
        productSnapshot.data();

      const currentImportId =
        currentData?.importOperationId;

      if (currentImportId !== importId) {
        skippedCount++;

        console.log(
          `[OMITIDO] ${change.codigo} - el producto fue modificado después de la importación.`,
        );

        continue;
      }

      await productRef.delete();

      deletedCount++;

      console.log(
        `[ELIMINADO] ${change.codigo}`,
      );

      continue;
    }

    /* =====================================================
       PRODUCTO ACTUALIZADO
    ===================================================== */

    if (!productSnapshot.exists) {
      skippedCount++;

      console.log(
        `[OMITIDO] ${change.codigo} - el producto ya no existe.`,
      );

      continue;
    }

    if (!change.datosAnteriores) {
      skippedCount++;

      console.log(
        `[OMITIDO] ${change.codigo} - no existen datos anteriores.`,
      );

      continue;
    }

    const currentData =
      productSnapshot.data();

    const currentImportId =
      currentData?.importOperationId;

    if (currentImportId !== importId) {
      skippedCount++;

      console.log(
        `[OMITIDO] ${change.codigo} - el producto fue modificado después de la importación.`,
      );

      continue;
    }

    /*
      merge:false es intencional.

      Esto restaura exactamente el documento anterior,
      incluyendo valores null y eliminando campos que
      únicamente fueron agregados durante la importación.
    */

    await productRef.set(
      change.datosAnteriores,
      {
        merge: false,
      },
    );

    restoredCount++;

    console.log(
      `[RESTAURADO] ${change.codigo}`,
    );
  }

  const finalStatus =
    skippedCount > 0
      ? "revertida_con_omisiones"
      : "revertida";

  await importRef.update({
    estado: finalStatus,
    fechaRollback:
      FieldValue.serverTimestamp(),
    productosRestaurados:
      restoredCount,
    productosEliminados:
      deletedCount,
    productosOmitidos:
      skippedCount,
  });

  console.log("");
  console.log("========================================");
  console.log(" ROLLBACK FINALIZADO");
  console.log("========================================");
  console.log("");
  console.log(
    `Productos restaurados: ${restoredCount}`,
  );
  console.log(
    `Productos eliminados: ${deletedCount}`,
  );
  console.log(
    `Productos omitidos: ${skippedCount}`,
  );
  console.log(
    `Estado: ${finalStatus}`,
  );
  console.log("");
}

/* =========================================================
   CLI
========================================================= */

const importId = process.argv[2];

if (!importId) {
  console.error(
    'Uso: pnpm run rollbackData "ID_DE_IMPORTACION"',
  );
  process.exit(1);
}

rollbackData(importId).catch((error) => {
  console.error("");
  console.error("========================================");
  console.error(" ERROR EN EL ROLLBACK");
  console.error("========================================");
  console.error("");

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  console.error("");

  process.exit(1);
});