import { adminAuth, adminDb } from "@/lib/firebase-admin";

export type UserRole =
  | "consumidor"
  | "repartidor"
  | "admin";

export async function getAuthoritativeUserRole(
  uid: string,
): Promise<UserRole | null> {
  const userSnapshot = await adminDb
    .collection("usuarios")
    .doc(uid)
    .get();

  if (!userSnapshot.exists) {
    return null;
  }

  const value = userSnapshot.data()?.Rol;
  const role =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  return role === "consumidor" ||
    role === "repartidor" ||
    role === "admin"
    ? role
    : null;
}

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

  const roleValue =
    await getAuthoritativeUserRole(decoded.uid);

  if (!roleValue) {
    throw new Error("FORBIDDEN");
  }

  return {
    ...decoded,
    role: roleValue as UserRole,
  };
}