import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function requireAdmin(
  request: Request,
) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    throw new Error("NO_AUTH");
  }

  const token =
    authorization.substring(7);

  if (!token) {
    throw new Error("NO_AUTH");
  }

  let decoded;

  try {
    decoded =
      await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error(
      "Error verificando token:",
      error,
    );

    throw new Error("NO_AUTH");
  }

  /*
   * El rol NO se obtiene del custom claim.
   * Se obtiene del documento:
   *
   * usuarios/{UID}
   *
   * campo:
   * Rol
   */

  const userSnapshot =
    await adminDb
      .collection("usuarios")
      .doc(decoded.uid)
      .get();

  if (!userSnapshot.exists) {
    throw new Error("FORBIDDEN");
  }

  const userData =
    userSnapshot.data();

  const role =
    typeof userData?.Rol === "string"
      ? userData.Rol.trim().toLowerCase()
      : "";

  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return {
    ...decoded,
    role,
  };
}