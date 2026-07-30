import { StoreSectionType, TemplateKey, type Prisma } from "@prisma/client";
import { z } from "zod";
import { sanitizePublicImageUrl } from "../catalog/public-image-url";

const INTERNAL_BASE_ORIGIN = "https://appearance-studio.invalid";

function isSafeHref(value: string): boolean {
  if (value.startsWith("#")) {
    return /^#[a-z0-9][a-z0-9\-_]*$/i.test(value);
  }

  if (value.startsWith("/")) {
    if (value.startsWith("//")) return false;

    try {
      const url = new URL(value, INTERNAL_BASE_ORIGIN);
      return url.origin === INTERNAL_BASE_ORIGIN && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

const boundedText = (min: number, max: number) => z.string().trim().min(min).max(max);

const safeHrefSchema = z.string().trim().min(1).refine(isSafeHref, "Informe uma URL segura.");
const safeImageSchema = z.string().trim().min(1).refine((value) => {
  return sanitizePublicImageUrl(value) !== undefined;
}, "Informe uma imagem HTTPS ou caminho público válido.");

export const AVAILABLE_APPEARANCE_TEMPLATE = TemplateKey.MODABELLA;

export const appearanceTemplateCapabilities = [
  { key: TemplateKey.MODABELLA, available: true },
  { key: TemplateKey.TEMPLATE_02, available: false },
  { key: TemplateKey.TEMPLATE_03, available: false },
  { key: TemplateKey.TEMPLATE_04, available: false },
] as const;

export const appearanceDraftSchema = z.object({
  template: z.literal(AVAILABLE_APPEARANCE_TEMPLATE),
  theme: z.object({
    storeName: boundedText(2, 120),
    accentColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use uma cor hexadecimal."),
    announcement: boundedText(0, 180),
    whatsAppNumber: z.string().trim().regex(/^\d{10,15}$/, "Use apenas números no WhatsApp."),
  }),
  sections: z.object({
    hero: z.object({
      title: boundedText(2, 120),
      subtitle: boundedText(2, 220),
      ctaLabel: boundedText(2, 40),
      ctaHref: safeHrefSchema,
      imageUrl: safeImageSchema,
    }),
    categories: z.object({
      title: boundedText(2, 80),
      enabled: z.boolean(),
    }),
    productFeed: z.object({
      title: boundedText(2, 80),
      limit: z.number().int().min(1).max(24),
      enabled: z.boolean(),
    }),
  }),
});

export type AppearanceDraft = z.infer<typeof appearanceDraftSchema>;

const legacyThemeSchema = z.object({
  storeName: z.string().trim().min(1).optional(),
  accentColor: z.string().trim().optional(),
  announcement: z.string().trim().optional(),
  whatsAppNumber: z.string().trim().optional(),
});

type AppearanceSectionSnapshot = {
  type: StoreSectionType;
  position: number;
  active: boolean;
  content: Prisma.JsonValue;
};

function readLegacyString(config: Prisma.JsonValue | undefined, key: string): string | undefined {
  if (!config || Array.isArray(config) || typeof config !== "object") return undefined;
  const value = config[key];
  return typeof value === "string" ? value : undefined;
}

function readLegacyNumber(config: Prisma.JsonValue | undefined, key: string): number | undefined {
  if (!config || Array.isArray(config) || typeof config !== "object") return undefined;
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeAppearanceDraft(
  input: AppearanceDraft | Prisma.JsonValue | null | undefined,
  fallback: {
    storeName: string;
    sections?: AppearanceSectionSnapshot[];
  },
): AppearanceDraft {
  const parsed = appearanceDraftSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  const legacyTheme = legacyThemeSchema.safeParse(input).success
    ? legacyThemeSchema.parse(input)
    : {};
  const sections = fallback.sections ?? [];
  const hero = sections.find((section) => section.type === StoreSectionType.HERO);
  const categories = sections.find((section) => section.type === StoreSectionType.CATEGORIES);
  const productFeed = sections.find((section) => section.type === StoreSectionType.PRODUCT_FEED);

  return appearanceDraftSchema.parse({
    template: AVAILABLE_APPEARANCE_TEMPLATE,
    theme: {
      storeName: legacyTheme.storeName ?? fallback.storeName,
      accentColor: legacyTheme.accentColor ?? "#B45372",
      announcement: legacyTheme.announcement ?? "",
      whatsAppNumber: legacyTheme.whatsAppNumber ?? "5585987654321",
    },
    sections: {
      hero: {
        title: readLegacyString(hero?.content, "title") ?? "Sua loja em destaque",
        subtitle:
          readLegacyString(hero?.content, "subtitle") ?? "Atualize este texto no Studio.",
        ctaLabel: readLegacyString(hero?.content, "ctaLabel") ?? "Ver novidades",
        ctaHref: readLegacyString(hero?.content, "ctaHref") ?? "#novidades",
        imageUrl:
          sanitizePublicImageUrl(readLegacyString(hero?.content, "imageUrl")) ??
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85",
      },
      categories: {
        title: readLegacyString(categories?.content, "title") ?? "Categorias",
        enabled: categories?.active ?? true,
      },
      productFeed: {
        title: readLegacyString(productFeed?.content, "title") ?? "Produtos",
        limit: readLegacyNumber(productFeed?.content, "limit") ?? 12,
        enabled: productFeed?.active ?? true,
      },
    },
  });
}
