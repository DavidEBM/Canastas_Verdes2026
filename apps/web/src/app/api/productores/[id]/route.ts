import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/*
 * ============================================================
 * GET
 * Obtener un productor específico
 * ============================================================
 */

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "El identificador del productor es obligatorio.",
        },
        { status: 400 },
      );
    }

    const productorRef = adminDb
      .collection("productores")
      .doc(id);

    const snapshot = await productorRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "El productor no existe.",
        },
        { status: 404 },
      );
    }

    const data = snapshot.data() ?? {};

    return NextResponse.json({
      success: true,
      productor: {
        id: snapshot.id,
        nombre: String(data.nombre ?? ""),
        descripcion: String(data.descripcion ?? ""),
        telefono: String(data.telefono ?? ""),
        correo: String(data.correo ?? ""),
        direccion: String(data.direccion ?? ""),
        activo: data.activo !== false,
        fechaCreacion:
          data.fechaCreacion?.toDate?.()?.toISOString() ?? null,
        fechaActualizacion:
          data.fechaActualizacion?.toDate?.()?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Error obteniendo productor:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No fue posible obtener el productor.",
      },
      { status: 500 },
    );
  }
}

/*
 * ============================================================
 * PUT
 * Actualizar un productor
 * ============================================================
 */

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "El identificador del productor es obligatorio.",
        },
        { status: 400 },
      );
    }

    const productorRef = adminDb
      .collection("productores")
      .doc(id);

    const currentSnapshot = await productorRef.get();

    if (!currentSnapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "El productor no existe.",
        },
        { status: 404 },
      );
    }

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
          error:
            "El nombre del productor no puede superar los 150 caracteres.",
        },
        { status: 400 },
      );
    }

    if (descripcion.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La descripción no puede superar los 500 caracteres.",
        },
        { status: 400 },
      );
    }

    if (telefono.length > 30) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El teléfono no puede superar los 30 caracteres.",
        },
        { status: 400 },
      );
    }

    if (correo.length > 150) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El correo no puede superar los 150 caracteres.",
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
            error:
              "El correo electrónico no tiene un formato válido.",
          },
          { status: 400 },
        );
      }
    }

    if (direccion.length > 250) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La dirección no puede superar los 250 caracteres.",
        },
        { status: 400 },
      );
    }

    /*
     * Comprobar nombres duplicados.
     *
     * Se excluye el propio documento que estamos editando.
     */

    const normalizedName = nombre.toLowerCase();

    const duplicateSnapshot = await adminDb
      .collection("productores")
      .where(
        "nombreNormalizado",
        "==",
        normalizedName,
      )
      .limit(2)
      .get();

    const duplicate = duplicateSnapshot.docs.find(
      (doc) => doc.id !== id,
    );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ya existe otro productor con ese nombre.",
        },
        { status: 409 },
      );
    }

    /*
     * Actualizar productor
     */

    await productorRef.update({
      nombre,
      nombreNormalizado: normalizedName,
      descripcion,
      telefono,
      correo,
      direccion,
      activo,
      fechaActualizacion:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Productor actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando productor:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "No fue posible actualizar el productor.",
      },
      { status: 500 },
    );
  }
}

/*
 * ============================================================
 * DELETE
 * Eliminar un productor
 * ============================================================
 */

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El identificador del productor es obligatorio.",
        },
        { status: 400 },
      );
    }

    const productorRef = adminDb
      .collection("productores")
      .doc(id);

    const snapshot = await productorRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "El productor no existe.",
        },
        { status: 404 },
      );
    }

    /*
     * Por ahora eliminamos únicamente el documento del
     * productor.
     *
     * Más adelante, cuando Productores se relacione con
     * Productos mediante IdProductor, esta operación deberá
     * comprobar relaciones antes de permitir la eliminación.
     */

    await productorRef.delete();

    return NextResponse.json({
      success: true,
      message: "Productor eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error eliminando productor:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "No fue posible eliminar el productor.",
      },
      { status: 500 },
    );
  }
}