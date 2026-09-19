import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

const COLLECTION = "puntosRecogida";
const MUNICIPALIDADES = "municipalidades";

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function buildHorario(
  horaInicio: string,
  horaFin: string
): string {
  if (!horaInicio || !horaFin) {
    return "";
  }

  return `${horaInicio} - ${horaFin}`;
}

function buildGoogleMapsUrl(
  nombre: string,
  direccion: string,
  municipio: string
): string {
  const query = [
    nombre,
    direccion,
    municipio,
    "Colombia",
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

async function getMunicipalidad(id: string) {
  const snap = await adminDb
    .collection(MUNICIPALIDADES)
    .doc(id)
    .get();

  if (!snap.exists) {
    return null;
  }

  const data = snap.data() ?? {};

  return {
    nombre:
      typeof data.Nombre === "string"
        ? data.Nombre.trim()
        : typeof data.nombre === "string"
          ? data.nombre.trim()
          : "",
    activo:
      data.Activo !== false &&
      data.activo !== false,
  };
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;

    const ref = adminDb
      .collection(COLLECTION)
      .doc(id);

    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El punto de recogida no existe.",
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const current = existing.data() ?? {};

    const nombre =
      body.nombre !== undefined
        ? cleanString(body.nombre)
        : cleanString(current.nombre);

    const direccion =
      body.direccion !== undefined
        ? cleanString(body.direccion)
        : cleanString(current.direccion);

    const IdMunicipalidad =
      body.IdMunicipalidad !== undefined
        ? cleanString(body.IdMunicipalidad)
        : cleanString(
            current.IdMunicipalidad
          );

    const horaInicio =
      body.horaInicio !== undefined
        ? cleanString(body.horaInicio)
        : cleanString(current.horaInicio);

    const horaFin =
      body.horaFin !== undefined
        ? cleanString(body.horaFin)
        : cleanString(current.horaFin);

    const telefono =
      body.telefono !== undefined
        ? cleanString(body.telefono)
        : cleanString(current.telefono);

    const activo =
      body.activo !== undefined
        ? body.activo === true
        : current.activo !== false;

    if (
      !nombre ||
      !direccion ||
      !IdMunicipalidad
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nombre, dirección y municipalidad son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (
      (horaInicio && !isValidTime(horaInicio)) ||
      (horaFin && !isValidTime(horaFin))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Las horas de atención no tienen un formato válido.",
        },
        { status: 400 }
      );
    }

    if (
      (horaInicio && !horaFin) ||
      (!horaInicio && horaFin)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Debes seleccionar tanto la hora de apertura como la hora de cierre.",
        },
        { status: 400 }
      );
    }

    if (
      horaInicio &&
      horaFin &&
      horaInicio >= horaFin
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La hora de cierre debe ser posterior a la hora de apertura.",
        },
        { status: 400 }
      );
    }

    const municipalidad =
      await getMunicipalidad(IdMunicipalidad);

    if (!municipalidad) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La municipalidad no existe.",
        },
        { status: 400 }
      );
    }

    if (
      activo &&
      !municipalidad.activo
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No se puede activar el punto porque su municipalidad está inactiva.",
        },
        { status: 400 }
      );
    }

    const duplicate = await adminDb
      .collection(COLLECTION)
      .where("nombre", "==", nombre)
      .limit(2)
      .get();

    const duplicateExists =
      duplicate.docs.some(
        (doc) => doc.id !== id
      );

    if (duplicateExists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ya existe otro punto con ese nombre.",
        },
        { status: 409 }
      );
    }

    const horario = buildHorario(
      horaInicio,
      horaFin
    );

    const googleMapsUrl = buildGoogleMapsUrl(
      nombre,
      direccion,
      municipalidad.nombre
    );

    await ref.update({
      nombre,
      direccion,
      IdMunicipalidad,
      municipio: municipalidad.nombre,
      horaInicio,
      horaFin,
      horario,
      telefono,
      activo,
      googleMapsUrl,
      fechaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        nombre,
        direccion,
        municipio: municipalidad.nombre,
        IdMunicipalidad,
        horaInicio,
        horaFin,
        horario,
        telefono,
        activo,
        googleMapsUrl,
      },
    });
  } catch (error) {
    console.error(
      "PATCH /api/puntos-recogida/[id]:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible actualizar el punto de recogida.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;

    const ref = adminDb
      .collection(COLLECTION)
      .doc(id);

    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El punto de recogida no existe.",
        },
        { status: 404 }
      );
    }

    await ref.update({
      activo: false,
      fechaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Punto de recogida desactivado correctamente.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/puntos-recogida/[id]:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible desactivar el punto de recogida.",
      },
      { status: 500 }
    );
  }
}