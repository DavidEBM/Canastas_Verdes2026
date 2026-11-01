import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { syncAutomaticLabels } from "@/lib/user-labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const users = await adminDb.collection("usuarios").limit(1000).get();
    let processed = 0;
    for (const user of users.docs) {
      await syncAutomaticLabels(user.id);
      processed += 1;
    }
    return NextResponse.json({ success: true, usuariosProcesados: processed });
  } catch (error) {
    console.error("Error actualizando etiquetas automáticas", error);
    return NextResponse.json({ success: false, message: "No fue posible actualizar las etiquetas automáticas." }, { status: 500 });
  }
}
