const ONLINE_APP_URL =
  "https://canastas-verdes2026.vercel.app";

function cleanUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function isLocalUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function getPublicAppUrl(request: Request) {
  const requestOrigin = cleanUrl(
    new URL(request.url).origin,
  );

  if (isLocalUrl(requestOrigin)) {
    return requestOrigin;
  }

  return ONLINE_APP_URL;
}

export function getReceiptUrl(
  baseUrl: string,
  pedidoId: string,
) {
  return `${cleanUrl(baseUrl)}/recibo/${encodeURIComponent(
    pedidoId,
  )}`;
}
