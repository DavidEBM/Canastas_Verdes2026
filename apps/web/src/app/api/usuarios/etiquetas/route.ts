import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";
import { listUserLabels, LABELS_COLLECTION } from "@/lib/user-labels";

export const runtime = "nodejs";

function clean(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function unauthorized(error: unknown) {
  if (error instanceof Error && error.message === "NO_AUTH") {
    return NextResponse.json({ success: false, message: "Debes iniciar sesión." }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ success: false, message: "Solo un administrador puede gestionar etiquetas." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ success: true, data: await listUserLabels() });
  } catch (error) {
    return unauthorized(error) ?? NextResponse.json({ success: false, message: "No fue posible cargar las etiquetas." }, { status: 500 });
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
    const name = clean(input.name, 80);
    const description = clean(input.description, 240);
    const color = clean(input.color, 30) || "#356859";
    const active = input.active !== false;
    if (!name || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json({ success: false, message: "El nombre y el color son obligatorios y válidos." }, { status: 400 });
    }

    const existing = await listUserLabels();
    if (existing.some((label) => label.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"))) {
      return NextResponse.json({ success: false, message: "Ya existe una etiqueta con ese nombre." }, { status: 409 });
    }

    const baseId = slug(name) || "etiqueta";
    let id = baseId;
    let suffix = 2;
    while (existing.some((label) => label.id === id)) id = `${baseId}-${suffix++}`;
    await adminDb.collection(LABELS_COLLECTION).doc(id).set({
      name,
      description,
      color,
      active,
      automaticKey: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true, data: { id, name, description, color, active, automaticKey: null } }, { status: 201 });
  } catch (error) {
    return unauthorized(error) ?? NextResponse.json({ success: false, message: "No fue posible crear la etiqueta." }, { status: 500 });
  }
}
