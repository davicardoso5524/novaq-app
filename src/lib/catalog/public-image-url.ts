const PUBLIC_IMAGE_BASE_ORIGIN = "https://public-image.invalid";
const ENCODED_PATH_SEPARATOR = /%(?:2f|5c)/i;

export function sanitizePublicImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  if (value.includes("\\") || /%5c/i.test(value)) return undefined;

  if (value.startsWith("/")) {
    if (value.startsWith("//") || ENCODED_PATH_SEPARATOR.test(value)) return undefined;

    try {
      const url = new URL(value, PUBLIC_IMAGE_BASE_ORIGIN);
      return url.origin === PUBLIC_IMAGE_BASE_ORIGIN && !url.username && !url.password
        ? value
        : undefined;
    } catch {
      return undefined;
    }
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
