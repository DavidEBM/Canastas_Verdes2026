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

function buildGoogleMapsEmbedUrl(
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

  return `https://www.google.com/maps?q=${encodeURIComponent(
    query
  )}&output=embed`;
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adminMode =
      url.searchParams.get("admin") === "1";

    if (adminMode) {
      await requireAdmin(request);
    }

    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy("nombre", "asc")
      .get();

    const data = snapshot.docs
      .map((doc) => {
        const item = doc.data();

        const activo = item.activo !== false;

        if (!adminMode && !activo) {
          return null;
        }

        const nombre =
          typeof item.nombre === "string"
            ? item.nombre.trim()
            : "";

        const direccion =
          typeof item.direccion === "string"
            ? item.direccion.trim()
            : "";

        const municipio =
          typeof item.municipio === "string"
            ? item.municipio.trim()
            : "";

        const horaInicio =
          typeof item.horaInicio === "string"
            ? item.horaInicio
            : "";

        const horaFin =
          typeof item.horaFin === "string"
            ? item.horaFin
            : "";

        const googleMapsUrl =
          typeof item.googleMapsUrl === "string" &&
          item.googleMapsUrl.trim()
            ? item.googleMapsUrl.trim()
            : buildGoogleMapsUrl(
                nombre,
                direccion,
                municipio
              );

        const googleMapsEmbedUrl =
          typeof item.googleMapsEmbedUrl === "string" &&
          item.googleMapsEmbedUrl.trim()
            ? item.googleMapsEmbedUrl.trim()
            : buildGoogleMapsEmbedUrl(
                nombre,
                direccion,
                municipio
              );

        return {
          id: doc.id,
          nombre,
          direccion,
          municipio,

          IdMunicipalidad:
            typeof item.IdMunicipalidad === "string"
              ? item.IdMunicipalidad
              : "",

          horaInicio,
          horaFin,

          horario:
            typeof item.horario === "string" &&
            item.horario.trim()
              ? item.horario
              : buildHorario(
                  horaInicio,
                  horaFin
                ),

          telefono:
            typeof item.telefono === "string"
              ? item.telefono
              : "",

          activo,

          googleMapsUrl,
          googleMapsEmbedUrl,
        };
      })
      .filter(
        (
          item
        ): item is NonNullable<typeof item> =>
          item !== null
      );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/puntos-recogida:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible cargar los puntos de recogida.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();

    const nombre = cleanString(body.nombre);
    const direccion = cleanString(body.direccion);

    const IdMunicipalidad = cleanString(
      body.IdMunicipalidad
    );

    const horaInicio = cleanString(
      body.horaInicio
    );

    const horaFin = cleanString(
      body.horaFin
    );

    const telefono = cleanString(
      body.telefono
    );

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
      (horaInicio &&
        !isValidTime(horaInicio)) ||
      (horaFin &&
        !isValidTime(horaFin))
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
      await getMunicipalidad(
        IdMunicipalidad
      );

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

    if (!municipalidad.activo) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No se puede crear un punto asociado a una municipalidad inactiva.",
        },
        { status: 400 }
      );
    }

    const duplicate = await adminDb
      .collection(COLLECTION)
      .where("nombre", "==", nombre)
      .limit(1)
      .get();

    if (!duplicate.empty) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ya existe un punto de recogida con ese nombre.",
        },
        { status: 409 }
      );
    }

    const horario = buildHorario(
      horaInicio,
      horaFin
    );

    const googleMapsUrl =
      buildGoogleMapsUrl(
        nombre,
        direccion,
        municipalidad.nombre
      );

    const googleMapsEmbedUrl =
      buildGoogleMapsEmbedUrl(
        nombre,
        direccion,
        municipalidad.nombre
      );

    const ref = adminDb
      .collection(COLLECTION)
      .doc();

    await ref.set({
      nombre,
      direccion,

      IdMunicipalidad,

      municipio:
        municipalidad.nombre,

      horaInicio,
      horaFin,
      horario,

      telefono,

      activo: true,

      googleMapsUrl,
      googleMapsEmbedUrl,

      fechaCreacion:
        FieldValue.serverTimestamp(),

      fechaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,

        data: {
          id: ref.id,
          nombre,
          direccion,
          municipio:
            municipalidad.nombre,
          IdMunicipalidad,

          horaInicio,
          horaFin,
          horario,

          telefono,

          activo: true,

          googleMapsUrl,
          googleMapsEmbedUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/puntos-recogida:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "No fue posible crear el punto de recogida.",
      },
      { status: 500 }
    );
  }
}
