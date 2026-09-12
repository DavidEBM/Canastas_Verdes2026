import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

/*
 * ============================================================
 * GET
 * Obtener todos los productores
 * ============================================================
 */

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await adminDb
      .collection("productores")
      .orderBy("nombre")
      .get();

    const data = snapshot.docs.map((doc) => {
      const item = doc.data();

      return {
        id: doc.id,
        nombre: String(item.nombre ?? ""),
        descripcion: String(item.descripcion ?? ""),
        telefono: String(item.telefono ?? ""),
        correo: String(item.correo ?? ""),
        direccion: String(item.direccion ?? ""),
        activo: item.activo !== false,
        fechaCreacion: item.fechaCreacion?.toDate?.()?.toISOString() ?? null,
        fechaActualizacion:
          item.fechaActualizacion?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      productores: data,
    });
  } catch (error) {
    console.error("Error obteniendo productores:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No fue posible obtener los productores.",
      },
      { status: 500 },
    );
  }
}

/*
 * ============================================================
 * POST
 * Crear un productor
 * ============================================================
 */

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();

    const nombre =
      typeof body.nombre === "string"
        ? body.nombre.trim()
        : "";

    const descripcion =
      typeof body.descripcion === "string"
        ? body.descripcion.trim()
        : "";

    const telefono =
      typeof body.telefono === "string"
        ? body.telefono.trim()
        : "";

    const correo =
      typeof body.correo === "string"
        ? body.correo.trim().toLowerCase()
        : "";

    const direccion =
      typeof body.direccion === "string"
        ? body.direccion.trim()
        : "";

    const activo =
      typeof body.activo === "boolean"
        ? body.activo
        : true;

    /*
     * Validaciones
     */

    if (!nombre) {
      return NextResponse.json(
        {
          success: false,
          error: "El nombre del productor es obligatorio.",
        },
        { status: 400 },
      );
    }

    if (nombre.length > 150) {
      return NextResponse.json(
        {
          success: false,
          error: "El nombre del productor no puede superar los 150 caracteres.",
        },
        { status: 400 },
      );
    }

    if (descripcion.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: "La descripción no puede superar los 500 caracteres.",
        },
        { status: 400 },
      );
    }

    if (telefono.length > 30) {
      return NextResponse.json(
        {
          success: false,
          error: "El teléfono no puede superar los 30 caracteres.",
        },
        { status: 400 },
      );
    }

    if (correo.length > 150) {
      return NextResponse.json(
        {
          success: false,
          error: "El correo no puede superar los 150 caracteres.",
        },
        { status: 400 },
      );
    }

    if (correo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(correo)) {
        return NextResponse.json(
          {
            success: false,
            error: "El correo electrónico no tiene un formato válido.",
          },
          { status: 400 },
        );
      }
    }

    if (direccion.length > 250) {
      return NextResponse.json(
        {
          success: false,
          error: "La dirección no puede superar los 250 caracteres.",
        },
        { status: 400 },
      );
    }

    /*
     * Evitar productores duplicados por nombre.
     *
     * La comparación se realiza normalizando el nombre.
     */

    const normalizedName = nombre.toLowerCase();

    const existingSnapshot = await adminDb
      .collection("productores")
      .where("nombreNormalizado", "==", normalizedName)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un productor con ese nombre.",
        },
        { status: 409 },
      );
    }

    /*
     * Crear productor
     */

    const productorRef = adminDb.collection("productores").doc();

    await productorRef.set({
      nombre,
      nombreNormalizado: normalizedName,
      descripcion,
      telefono,
      correo,
      direccion,
      activo,

      fechaCreacion: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Productor creado correctamente.",
        id: productorRef.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creando productor:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No fue posible crear el productor.",
      },
      { status: 500 },
    );
  }
}