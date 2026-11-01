import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requirePrivilegedAdmin } from "@/lib/require-privileged-admin";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "NO_AUTH") return NextResponse.json({ success: false, message: "Debes iniciar sesión." }, { status: 401 });
    if (error.message === "PRIVILEGED_ADMIN_NOT_CONFIGURED") return NextResponse.json({ success: false, message: "La eliminación privilegiada no está configurada en el servidor." }, { status: 503 });
    if (error.message === "PRIVILEGED_ADMIN_FORBIDDEN") return NextResponse.json({ success: false, message: "No tienes autorización para eliminar perfiles." }, { status: 403 });
  }
  console.error("Error eliminando perfil", error);
  return NextResponse.json({ success: false, message: "No fue posible eliminar el perfil." }, { status: 500 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const privilegedAdmin = await requirePrivilegedAdmin(request);
    const { id } = await params;
    const uid = typeof id === "string" ? id.trim() : "";
    if (!uid || uid.length > 200 || uid.includes("/")) return NextResponse.json({ success: false, message: "El identificador del usuario no es válido." }, { status: 400 });
    if (uid === privilegedAdmin.uid) return NextResponse.json({ success: false, message: "No puedes eliminar la cuenta privilegiada desde esta operación." }, { status: 409 });

    const userRef = adminDb.collection("usuarios").doc(uid);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) return NextResponse.json({ success: false, message: "El perfil no existe." }, { status: 404 });

    const authUser = await adminAuth.getUser(uid);
    const displayName = authUser.displayName || userSnapshot.data()?.NombreCompleto || "Usuario";
    const auditRef = adminDb.collection("auditoriaAdministrativa").doc();

    await adminDb.runTransaction(async (transaction) => {
      transaction.set(auditRef, {
        action: "profile.delete",
        targetUid: uid,
        targetEmail: authUser.email ?? null,
        actorUid: privilegedAdmin.uid,
        actorEmail: privilegedAdmin.email ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.set(userRef, {
        eliminado: true,
        eliminadoEn: FieldValue.serverTimestamp(),
        Nombres: "Usuario anonimizado",
        Apellidos: "",
        NombreCompleto: "Usuario anonimizado",
        Correo: "",
        Telefono: "",
        Direccion: "",
        Etiquetas: [],
        etiquetasAutomaticas: [],
        ultimaActualizacion: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    await adminAuth.deleteUser(uid);
    return NextResponse.json({ success: true, message: `Perfil de ${displayName} eliminado y registros históricos preservados.` });
  } catch (error) {
    return errorResponse(error);
  }
}
