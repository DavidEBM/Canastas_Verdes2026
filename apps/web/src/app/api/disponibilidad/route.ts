import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const COLLECTION = "configuracionesDisponibilidad";
const SCOPES = ["default", "producto", "categoria", "grupo"] as const;
const VARIANTS = ["soft", "solid", "outline"] as const;

type Scope = (typeof SCOPES)[number];
type Variant = (typeof VARIANTS)[number];

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function mapConfiguration(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    scope: data.scope as Scope,
    targetId: clean(data.targetId),
    message: clean(data.message, 160),
    active: data.active === true,
    color: clean(data.color, 30) || "#b42318",
    variant: (VARIANTS.includes(data.variant) ? data.variant : "soft") as Variant,
    priority: typeof data.priority === "number" ? data.priority : 0,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

function authError(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === "NO_AUTH") {
    return NextResponse.json({ success: false, message: "Debes iniciar sesión." }, { status: 401 });
  }
  if (error.message === "FORBIDDEN") {
    return NextResponse.json({ success: false, message: "Solo un administrador puede gestionar disponibilidad." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.collection(COLLECTION).get();
    const data = snapshot.docs
      .map((document) => mapConfiguration(document.id, document.data()))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error("GET /api/disponibilidad", error);
    return NextResponse.json({ success: false, message: "No fue posible cargar los mensajes de disponibilidad." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: "Los datos no son válidos." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const scope = clean(input.scope, 30) as Scope;
    const targetId = scope === "default" ? "__default__" : clean(input.targetId);
    const message = clean(input.message, 160);
    const color = clean(input.color, 30) || "#b42318";
    const variant = clean(input.variant, 30) as Variant;
    const priority = Number(input.priority ?? 0);
    const active = input.active !== false;

    if (!SCOPES.includes(scope) || !targetId || !message || message.length > 160) {
      return NextResponse.json({ success: false, message: "Selecciona un alcance y escribe un mensaje válido." }, { status: 400 });
    }
    if (!VARIANTS.includes(variant) || !Number.isInteger(priority) || priority < 0 || priority > 1000) {
      return NextResponse.json({ success: false, message: "La variante o prioridad no son válidas." }, { status: 400 });
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json({ success: false, message: "El color debe ser hexadecimal." }, { status: 400 });
    }

    const ref = adminDb.collection(COLLECTION).doc();
    await ref.set({
      scope,
      targetId,
      message,
      color,
      variant,
      priority,
      active,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, data: { id: ref.id, scope, targetId, message, color, variant, priority, active } }, { status: 201 });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error("POST /api/disponibilidad", error);
    return NextResponse.json({ success: false, message: "No fue posible guardar el mensaje de disponibilidad." }, { status: 500 });
  }
}
