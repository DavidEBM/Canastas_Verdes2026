type ApiPayload = {
  message?: unknown;
  error?: unknown;
};

export async function readApiResponse<T>(
  response: Response,
): Promise<{ data: T | null; text: string }> {
  const text = await response.text();

  if (!text.trim()) {
    return { data: null, text };
  }

  try {
    return {
      data: JSON.parse(text) as T,
      text,
    };
  } catch {
    return { data: null, text };
  }
}

export function getApiErrorMessage(
  response: Response,
  data: unknown,
  rawText: string,
  fallback: string,
): string {
  if (data && typeof data === "object") {
    const payload = data as ApiPayload;
    const message =
      typeof payload.message === "string"
        ? payload.message
        : typeof payload.error === "string"
          ? payload.error
          : null;

    if (message) {
      return message;
    }
  }

  if (response.status === 413) {
    return "La imagen es demasiado grande para el servidor. Selecciona una imagen de máximo 4 MB.";
  }

  const plainText = rawText.trim();
  if (
    plainText &&
    plainText.length <= 180 &&
    !/<[a-z][\s\S]*>/i.test(plainText)
  ) {
    return plainText;
  }

  return `${fallback} (HTTP ${response.status}).`;
}
