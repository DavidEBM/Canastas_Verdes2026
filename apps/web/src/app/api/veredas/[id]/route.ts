import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";
function clean(value: unknown, max = 150) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const ref = adminDb.collection("veredas").doc(id);
    const existing = await ref.get();
    if (!existing.exists) return NextResponse.json({ success: false, message: "La vereda no existe." }, { status: 404 });
    const body = await request.json();
    const current = existing.data() ?? {};
    const nombre = clean(body.nombre ?? current.nombre);
    const IdMunicipalidad = clean(body.IdMunicipalidad ?? current.IdMunicipalidad);
    const activo = body.activo === undefined ? current.activo !== false : body.activo === true;
    const municipality = await adminDb.collection("municipalidades").doc(IdMunicipalidad).get();
    if (!nombre || !municipality.exists || municipality.data()?.Activo === false || (!activo && body.activo === true)) return NextResponse.json({ success: false, message: "La vereda o municipio no son válidos." }, { status: 400 });
    await ref.update({ nombre, IdMunicipalidad, municipio: clean(municipality.data()?.Nombre ?? municipality.data()?.nombre), activo, fechaActualizacion: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, message: "Vereda actualizada correctamente." });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_AUTH") return NextResponse.json({ success: false, message: "Debes iniciar sesión." }, { status: 401 });
    return NextResponse.json({ success: false, message: "No fue posible actualizar la vereda." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const ref = adminDb.collection("veredas").doc(id);
    if (!(await ref.get()).exists) return NextResponse.json({ success: false, message: "La vereda no existe." }, { status: 404 });
    await ref.update({ activo: false, fechaActualizacion: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, message: "Vereda desactivada correctamente." });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_AUTH") return NextResponse.json({ success: false, message: "Debes iniciar sesión." }, { status: 401 });
    return NextResponse.json({ success: false, message: "No fue posible desactivar la vereda." }, { status: 500 });
  }
}
