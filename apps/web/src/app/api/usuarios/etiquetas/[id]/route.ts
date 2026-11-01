import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { LABELS_COLLECTION } from "@/lib/user-labels";

export const runtime = "nodejs";

function clean(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function auth(request: Request) {
  try {
    await requireAdmin(request);
    return null;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error && error.message === "NO_AUTH" ? "Debes iniciar sesión." : "Solo un administrador puede gestionar etiquetas." },
      { status: error instanceof Error && error.message === "NO_AUTH" ? 401 : 403 },
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await auth(request);
  if (denied) return denied;
  const { id } = await params;
  const ref = adminDb.collection(LABELS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return NextResponse.json({ success: false, message: "La etiqueta no existe." }, { status: 404 });
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ success: false, message: "Los datos no son válidos." }, { status: 400 });
  const current = existing.data() ?? {};
  const input = body as Record<string, unknown>;
  const name = clean(input.name ?? current.name, 80);
  const description = clean(input.description ?? current.description, 240);
  const color = clean(input.color ?? current.color, 30);
  const active = input.active === undefined ? current.active !== false : input.active === true;
  if (!name || !/^#[0-9a-fA-F]{6}$/.test(color)) return NextResponse.json({ success: false, message: "El nombre y el color no son válidos." }, { status: 400 });
  const duplicate = await adminDb.collection(LABELS_COLLECTION).get();
  if (duplicate.docs.some((document) => document.id !== id && clean(document.data().name, 80).toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))) {
    return NextResponse.json({ success: false, message: "Ya existe una etiqueta con ese nombre." }, { status: 409 });
  }

  await ref.update({ name, description, color, active, updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ success: true, data: { id, name, description, color, active, automaticKey: current.automaticKey ?? null }, message: "Etiqueta actualizada correctamente." });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await auth(request);
  if (denied) return denied;
  const { id } = await params;
  const ref = adminDb.collection(LABELS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return NextResponse.json({ success: false, message: "La etiqueta no existe." }, { status: 404 });
  if (id === "default" || id === "cliente-antiguo") return NextResponse.json({ success: false, message: "Las etiquetas automáticas del sistema no se pueden eliminar; puedes desactivarlas." }, { status: 409 });

  const users = await adminDb.collection("usuarios").get();
  let batch = adminDb.batch();
  let operations = 0;
  for (const user of users.docs) {
    const data = user.data();
    const ids = Array.isArray(data.Etiquetas) ? data.Etiquetas.filter((value): value is string => typeof value === "string" && value !== id) : [];
    const automatic = Array.isArray(data.etiquetasAutomaticas) ? data.etiquetasAutomaticas.filter((value): value is string => typeof value === "string" && value !== id) : [];
    if (ids.length !== (Array.isArray(data.Etiquetas) ? data.Etiquetas.length : 0)) {
      batch.update(user.ref, { Etiquetas: ids, etiquetasAutomaticas: automatic, EtiquetaUsuario: ids[0] ?? "default", ultimaActualizacion: FieldValue.serverTimestamp() });
      operations += 1;
      if (operations === 450) {
        await batch.commit();
        batch = adminDb.batch();
        operations = 0;
      }
    }
  }
  if (operations > 0) await batch.commit();
  await ref.delete();
  return NextResponse.json({ success: true, message: "Etiqueta eliminada y asociaciones retiradas." });
}
