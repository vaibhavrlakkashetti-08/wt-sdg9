export function isHttpUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasUniqueNormalizedValues(values) {
  const normalized = values.map((value) => value.trim().toLocaleLowerCase());
  return new Set(normalized).size === normalized.length;
}