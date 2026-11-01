import { adminAuth, adminDb } from "@/lib/firebase-admin";

/**
 * Autorización adicional para operaciones de eliminación de cuentas.
 * El correo nunca viene del cliente: se compara con la variable del servidor.
 */
export async function requirePrivilegedAdmin(request: Request) {
  const configuredEmail = process.env.PRIVILEGED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredEmail) throw new Error("PRIVILEGED_ADMIN_NOT_CONFIGURED");

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("NO_AUTH");
  const token = authorization.slice(7).trim();
  if (!token) throw new Error("NO_AUTH");

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    throw new Error("NO_AUTH");
  }

  const email = decoded.email?.trim().toLowerCase();
  if (!email || email !== configuredEmail || decoded.email_verified !== true) {
    throw new Error("PRIVILEGED_ADMIN_FORBIDDEN");
  }

  const userSnapshot = await adminDb.collection("usuarios").doc(decoded.uid).get();
  const role = userSnapshot.data()?.Rol;
  if (typeof role !== "string" || role.trim().toLowerCase() !== "admin") {
    throw new Error("PRIVILEGED_ADMIN_FORBIDDEN");
  }

  return decoded;
}
