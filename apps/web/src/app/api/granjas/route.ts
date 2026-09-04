import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await adminDb
      .collection("granjas")
      .orderBy("Nombre")
      .get();

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      nombre: String(doc.data().Nombre ?? ""),
      activo: doc.data().Activo !== false,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error obteniendo granjas:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible obtener las granjas.",
      },
      { status: 500 },
    );
  }
}