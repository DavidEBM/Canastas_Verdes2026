import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";

export interface UserLabelDocument {
  id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
  automaticKey: "default" | "cliente-antiguo" | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const LABELS_COLLECTION = "etiquetasUsuarios";
const DEFAULT_LABEL_ID = "default";
const OLD_CUSTOMER_LABEL_ID = "cliente-antiguo";

const SYSTEM_LABELS: Array<Omit<UserLabelDocument, "id"> & { id: string }> = [
  {
    id: DEFAULT_LABEL_ID,
    name: "Default",
    description: "Clasificación inicial de usuarios nuevos.",
    color: "#356859",
    active: true,
    automaticKey: "default",
  },
  {
    id: OLD_CUSTOMER_LABEL_ID,
    name: "Cliente antiguo",
    description: "Cuenta con al menos dos meses y un pedido realizado.",
    color: "#a65d3b",
    active: true,
    automaticKey: "cliente-antiguo",
  },
  {
    id: "comprador-frecuente",
    name: "Comprador frecuente",
    description: "Etiqueta histórica configurable para segmentación.",
    color: "#547a5a",
    active: true,
    automaticKey: null,
  },
  {
    id: "asociacion-agricultores",
    name: "Asociación de agricultores",
    description: "Etiqueta histórica configurable para segmentación.",
    color: "#6f4e37",
    active: true,
    automaticKey: null,
  },
  {
    id: "mayorista",
    name: "Mayorista",
    description: "Etiqueta histórica configurable para segmentación.",
    color: "#496a81",
    active: true,
    automaticKey: null,
  },
];

export const legacyLabelMap: Record<string, string> = {
  usuario_nuevo: DEFAULT_LABEL_ID,
  usuario_frecuente: OLD_CUSTOMER_LABEL_ID,
  cliente_antiguo: OLD_CUSTOMER_LABEL_ID,
  comprador_frecuente: "comprador-frecuente",
  asociacion_agricultores: "asociacion-agricultores",
  mayorista: "mayorista",
};

export async function ensureSystemLabels() {
  const references = SYSTEM_LABELS.map((label) =>
    adminDb.collection(LABELS_COLLECTION).doc(label.id),
  );
  const snapshots = await adminDb.getAll(...references);
  const batch = adminDb.batch();
  let operations = 0;

  for (let index = 0; index < SYSTEM_LABELS.length; index += 1) {
    const label = SYSTEM_LABELS[index];
    const snapshot = snapshots[index];

    if (!snapshot.exists) {
      batch.set(references[index], {
        ...label,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      operations += 1;
      continue;
    }

    const data = snapshot.data() ?? {};
    if (typeof data.automaticKey !== "string" && label.automaticKey) {
      batch.update(references[index], {
        automaticKey: label.automaticKey,
        updatedAt: FieldValue.serverTimestamp(),
      });
      operations += 1;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }
}

export async function listUserLabels(): Promise<UserLabelDocument[]> {
  await ensureSystemLabels();
  const snapshot = await adminDb.collection(LABELS_COLLECTION).get();
  return snapshot.docs
    .map((document) => {
      const value = document.data();
      return {
        id: document.id,
        name: typeof value.name === "string" ? value.name : document.id,
        description: typeof value.description === "string" ? value.description : "",
        color: typeof value.color === "string" ? value.color : "#356859",
        active: value.active !== false,
        automaticKey:
          value.automaticKey === "default" || value.automaticKey === "cliente-antiguo"
            ? value.automaticKey
            : null,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
      } satisfies UserLabelDocument;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function storedDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }
  return value instanceof Date ? value : null;
}

function addTwoMonths(date: Date) {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + 2);
  return result;
}

export function hasAtLeastTwoMonths(createdAt: unknown, now = new Date()) {
  const date = storedDate(createdAt);
  return Boolean(date && addTwoMonths(date) <= now);
}

export function normalizeLabelIds(data: FirebaseFirestore.DocumentData): string[] {
  const ids = Array.isArray(data.Etiquetas)
    ? data.Etiquetas.filter((value): value is string => Boolean(typeof value === "string" && value.trim()))
    : [];
  const legacy = typeof data.EtiquetaUsuario === "string" ? legacyLabelMap[data.EtiquetaUsuario.trim().toLowerCase()] : undefined;
  if (legacy) ids.push(legacy);
  return [...new Set(ids)];
}

async function hasPlacedOrder(uid: string) {
  const snapshot = await adminDb
    .collection("pedidos")
    .where("usuarioId", "==", uid)
    .get();
  return snapshot.docs.some((document) => document.data().estado !== "cancelado");
}

/**
 * Sincroniza únicamente las etiquetas automáticas. Las manuales se conservan.
 * La operación es idempotente y puede ser invocada desde registro, pedidos o un cron.
 */
export async function syncAutomaticLabels(uid: string) {
  const userRef = adminDb.collection("usuarios").doc(uid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) return [];

  const data = snapshot.data() ?? {};
  const current = normalizeLabelIds(data);
  const automatic = Array.isArray(data.etiquetasAutomaticas)
    ? data.etiquetasAutomaticas.filter((value): value is string => typeof value === "string")
    : [];
  const next = new Set(current);
  const nextAutomatic = new Set(automatic);

  if (next.size === 0) {
    next.add(DEFAULT_LABEL_ID);
    nextAutomatic.add(DEFAULT_LABEL_ID);
  } else if (next.size > 1 && nextAutomatic.has(DEFAULT_LABEL_ID)) {
    next.delete(DEFAULT_LABEL_ID);
    nextAutomatic.delete(DEFAULT_LABEL_ID);
  }

  const oldCustomer = await hasPlacedOrder(uid);
  const qualifies = hasAtLeastTwoMonths(data.FechaRegistro) && oldCustomer;
  if (qualifies) {
    next.add(OLD_CUSTOMER_LABEL_ID);
    nextAutomatic.add(OLD_CUSTOMER_LABEL_ID);
  } else if (nextAutomatic.has(OLD_CUSTOMER_LABEL_ID)) {
    next.delete(OLD_CUSTOMER_LABEL_ID);
    nextAutomatic.delete(OLD_CUSTOMER_LABEL_ID);
  }

  const nextIds = [...next];
  const nextAutomaticIds = [...nextAutomatic];
  const currentIds = normalizeLabelIds(data);
  const currentAutomatic = automatic;
  if (
    JSON.stringify(nextIds.sort()) !== JSON.stringify(currentIds.sort()) ||
    JSON.stringify(nextAutomaticIds.sort()) !== JSON.stringify(currentAutomatic.sort())
  ) {
    await userRef.set(
      {
        Etiquetas: nextIds,
        etiquetasAutomaticas: nextAutomaticIds,
        EtiquetaUsuario: nextIds[0] ?? DEFAULT_LABEL_ID,
        ultimaActualizacion: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return nextIds;
}

export { DEFAULT_LABEL_ID, OLD_CUSTOMER_LABEL_ID, LABELS_COLLECTION };
