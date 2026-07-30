import { describe, expect, it } from "vitest";
import { sanitizePublicImageUrl } from "../src/lib/catalog/public-image-url";

describe("sanitizePublicImageUrl", () => {
  it.each([
    "https://cdn.example.com/catalog/hero.jpg",
    "HTTPS://cdn.example.com/hero.jpg",
    "https://images.example.com/hero.webp?width=1200#crop",
    "/images/catalog/hero.jpg",
  ])("accepts safe public image URL %s", (url) => {
    expect(sanitizePublicImageUrl(url)).toBe(url);
  });

  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml;base64,PHN2Zy8+",
    "http://cdn.example.com/hero.jpg",
    "//cdn.example.com/hero.jpg",
    "/\\evil.example/hero.jpg",
    "/%5cevil.example/hero.jpg",
    "/%5C%5Cevil.example/hero.jpg",
    "/%2f%2fevil.example/hero.jpg",
    "https://user:password@cdn.example.com/hero.jpg",
    "not-a-url",
    "https://",
  ])("rejects unsafe or invalid public image URL %s", (url) => {
    expect(sanitizePublicImageUrl(url)).toBeUndefined();
  });
});
