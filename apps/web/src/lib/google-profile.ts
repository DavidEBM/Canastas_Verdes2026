export interface GoogleProfileName {
  nombreCompleto: string;
  nombres: string;
  apellidos: string;
}

/**
 * Convierte el nombre que entrega Google en los campos del perfil local,
 * conservando además el nombre completo original.
 */
export function getGoogleProfileName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): GoogleProfileName {
  let nombreCompleto = displayName?.trim() ?? "";

  if (!nombreCompleto && email) {
    nombreCompleto = email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim();
  }

  if (!nombreCompleto) {
    nombreCompleto = "Usuario Google";
  }

  const partes = nombreCompleto
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) {
    return {
      nombreCompleto,
      nombres: "Usuario",
      apellidos: "Google",
    };
  }

  if (partes.length === 1) {
    return {
      nombreCompleto,
      nombres: partes[0],
      apellidos: "",
    };
  }

  // Para nombres de 3+ palabras reservamos las dos últimas para apellidos.
  const indiceApellidos = Math.max(1, partes.length - 2);

  return {
    nombreCompleto,
    nombres: partes.slice(0, indiceApellidos).join(" "),
    apellidos: partes.slice(indiceApellidos).join(" "),
  };
}
