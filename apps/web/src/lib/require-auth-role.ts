import { adminAuth, adminDb } from "@/lib/firebase-admin";

export type UserRole =
  | "consumidor"
  | "repartidor"
  | "admin";

export async function requireAuthRole(
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
    authorization.substring(7).trim();

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

  const roleValue =
    typeof userData?.Rol === "string"
      ? userData.Rol.trim().toLowerCase()
      : "";

  if (
    roleValue !== "consumidor" &&
    roleValue !== "repartidor" &&
    roleValue !== "admin"
  ) {
    throw new Error("FORBIDDEN");
  }

  return {
    ...decoded,
    role: roleValue as UserRole,
  };
}