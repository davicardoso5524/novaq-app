export function sanitizePublicImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  if (value.startsWith("/")) {
    return value.startsWith("//") ? undefined : value;
  }

  if (!value.startsWith("https://")) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname ? value : undefined;
  } catch {
    return undefined;
  }
}
