/**
 * Normaliza texto para búsquedas de catálogo y administración.
 * Quita tildes, unifica espacios y evita depender del caso o la puntuación.
 */
export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function editDistanceWithin(
  source: string,
  target: string,
  limit: number,
): boolean {
  if (Math.abs(source.length - target.length) > limit) {
    return false;
  }

  let previous = Array.from(
    { length: target.length + 1 },
    (_, index) => index,
  );

  for (let row = 1; row <= source.length; row += 1) {
    const current = [row];

    for (let column = 1; column <= target.length; column += 1) {
      const cost = source[row - 1] === target[column - 1] ? 0 : 1;
      const value = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost,
      );

      current.push(value);
    }

    previous = current;
  }

  return previous[target.length] <= limit;
}

function tokenMatches(queryToken: string, valueToken: string): boolean {
  if (
    valueToken.includes(queryToken) ||
    queryToken.includes(valueToken)
  ) {
    return true;
  }

  if (queryToken.length < 3) {
    return false;
  }

  const limit = queryToken.length <= 5 ? 1 : 2;
  return editDistanceWithin(queryToken, valueToken, limit);
}

/**
 * Busca por coincidencia exacta, sin tildes, y por errores ortográficos
 * pequeños en cada palabra consultada.
 */
export function matchesTolerantSearch(
  values: unknown[],
  query: unknown,
): boolean {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const normalizedValue = normalizeSearchText(values.join(" "));
  const compactQuery = normalizedQuery.replace(/ /g, "");
  const compactValue = normalizedValue.replace(/ /g, "");

  if (
    normalizedValue.includes(normalizedQuery) ||
    compactValue.includes(compactQuery)
  ) {
    return true;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const valueTokens = normalizedValue.split(" ").filter(Boolean);

  return queryTokens.every((queryToken) =>
    valueTokens.some((valueToken) =>
      tokenMatches(queryToken, valueToken),
    ),
  );
}
