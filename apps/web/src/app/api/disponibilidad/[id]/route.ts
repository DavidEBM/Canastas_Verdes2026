import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const SCOPES = ["default", "producto", "categoria", "grupo"] as const;
const VARIANTS = ["soft", "solid", "outline"] as const;

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function authorize(request: Request) {
  try {
    await requireAdmin(request);
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === "NO_AUTH") {
      return NextResponse.json({ success: false, message: "Debes iniciar sesión." }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: "Solo un administrador puede gestionar disponibilidad." }, { status: 403 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await authorize(request);
  if (denied) return denied;

  const { id } = await params;
  const ref = adminDb.collection("configuracionesDisponibilidad").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return NextResponse.json({ success: false, message: "La configuración no existe." }, { status: 404 });
  }

  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, message: "Los datos no son válidos." }, { status: 400 });
  }

  const current = existing.data() ?? {};
  const input = body as Record<string, unknown>;
  const scope = clean(input.scope ?? current.scope, 30);
  const targetId = scope === "default" ? "__default__" : clean(input.targetId ?? current.targetId);
  const message = clean(input.message ?? current.message, 160);
  const color = clean(input.color ?? current.color, 30);
  const variant = clean(input.variant ?? current.variant, 30);
  const priority = Number(input.priority ?? current.priority ?? 0);
  const active = input.active === undefined ? current.active === true : input.active === true;

  if (!SCOPES.includes(scope as (typeof SCOPES)[number]) || !targetId || !message) {
    return NextResponse.json({ success: false, message: "El alcance, destino y mensaje son obligatorios." }, { status: 400 });
  }
  if (!VARIANTS.includes(variant as (typeof VARIANTS)[number]) || !Number.isInteger(priority) || priority < 0 || priority > 1000 || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return NextResponse.json({ success: false, message: "La configuración visual o prioridad no son válidas." }, { status: 400 });
  }

  await ref.update({ scope, targetId, message, color, variant, priority, active, updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ success: true, message: "Mensaje de disponibilidad actualizado." });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await authorize(request);
  if (denied) return denied;

  const { id } = await params;
  const ref = adminDb.collection("configuracionesDisponibilidad").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    return NextResponse.json({ success: false, message: "La configuración no existe." }, { status: 404 });
  }

  await ref.delete();
  return NextResponse.json({ success: true, message: "Configuración eliminada." });
}
