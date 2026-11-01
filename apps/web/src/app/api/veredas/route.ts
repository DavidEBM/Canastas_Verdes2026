import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";
const COLLECTION = "veredas";

function clean(value: unknown, max = 150) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

async function municipality(id: string) {
  const snapshot = await adminDb.collection("municipalidades").doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  return { nombre: clean(data.Nombre ?? data.nombre), activo: data.Activo !== false && data.activo !== false };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const municipalityId = new URL(request.url).searchParams.get("municipio")?.trim() ?? "";
    const snapshot = await adminDb.collection(COLLECTION).get();
    const data = snapshot.docs.map((document) => {
      const value = document.data();
      return { id: document.id, nombre: clean(value.nombre ?? value.Nombre), IdMunicipalidad: clean(value.IdMunicipalidad ?? value.municipioId), activo: value.activo !== false };
    }).filter((item) => !municipalityId || item.IdMunicipalidad === municipalityId).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_AUTH") return NextResponse.json({ success: false, message: "Debes iniciar sesión." }, { status: 401 });
    return NextResponse.json({ success: false, message: "No fue posible cargar las veredas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const nombre = clean(body.nombre);
    const IdMunicipalidad = clean(body.IdMunicipalidad);
    if (!nombre || !IdMunicipalidad) return NextResponse.json({ success: false, message: "El nombre y el municipio son obligatorios." }, { status: 400 });
    const selected = await municipality(IdMunicipalidad);
    if (!selected?.activo) return NextResponse.json({ success: false, message: "El municipio no existe o está inactivo." }, { status: 400 });
    const duplicate = await adminDb.collection(COLLECTION).where("IdMunicipalidad", "==", IdMunicipalidad).get();
    if (duplicate.docs.some((document) => clean(document.data().nombre).toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es") && document.data().activo !== false)) return NextResponse.json({ success: false, message: "Ya existe esa vereda en el municipio seleccionado." }, { status: 409 });
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.set({ nombre, IdMunicipalidad, municipio: selected.nombre, activo: true, fechaCreacion: FieldValue.serverTimestamp(), fechaActualizacion: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, data: { id: ref.id, nombre, IdMunicipalidad, activo: true } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_AUTH") return NextResponse.json({ success: false, message: "Debes iniciar sesión." }, { status: 401 });
    return NextResponse.json({ success: false, message: "No fue posible crear la vereda." }, { status: 500 });
  }
}
