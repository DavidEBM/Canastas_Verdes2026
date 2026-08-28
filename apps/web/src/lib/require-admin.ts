import { adminAuth, adminDb } from "@/lib/firebase-admin";

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string;
  role: string;
}

function tokenFrom(request: Request): string | null {
  const value = request.headers.get("authorization");

  if (!value?.startsWith("Bearer ")) {
    return null;
  }

  const token = value.slice(7).trim();

  return token || null;
}

/**
 * Verifica que la solicitud:
 *
 * 1. Tenga un token Firebase válido.
 * 2. El UID exista en Firestore.
 * 3. El documento usuarios/{UID} tenga Rol = "admin".
 *
 * Los roles se administran exclusivamente desde Firestore.
 */
export async function requireAdmin(
  request: Request,
): Promise<AdminUser> {
  const token = tokenFrom(request);

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const decoded = await adminAuth.verifyIdToken(token);

  const userRef = adminDb
    .collection("usuarios")
    .doc(decoded.uid);

  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    throw new Error("USER_NOT_FOUND");
  }

  const userData = userSnapshot.data();

  if (!userData) {
    throw new Error("USER_INVALID");
  }

  const role =
    typeof userData?.Rol === "string"
      ? userData.Rol.trim().toLowerCase()
      : "";

  if (role !== "admin") {
    throw new Error("ADMIN_REQUIRED");
  }

  const displayName = [
    typeof userData.Nombres === "string"
      ? userData.Nombres.trim()
      : "",
    typeof userData.Apellidos === "string"
      ? userData.Apellidos.trim()
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    uid: decoded.uid,
    email:
      typeof userData.Correo === "string"
        ? userData.Correo.trim()
        : decoded.email ?? null,
    displayName,
    role,
  };
}