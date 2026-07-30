import { z } from "zod";

const localPathBase = new URL("https://public-analytics.invalid/");
const forbiddenEncodedPathBytes = /%(?:0[0-9a-f]|1[0-9a-f]|25|2f|5c|7f)/i;
const malformedPercentEncoding = /%(?![0-9a-f]{2})/i;

function isStrictLocalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (/[\\?#\u0000-\u001f\u007f]/.test(path)) return false;
  if (forbiddenEncodedPathBytes.test(path) || malformedPercentEncoding.test(path)) return false;

  try {
    const normalized = new URL(path, localPathBase);
    return normalized.origin === localPathBase.origin && normalized.pathname === path;
  } catch {
    return false;
  }
}

export const publicAnalyticsEvents = [
  "PAGE_VIEW",
  "PRODUCT_VIEW",
  "SEARCH",
  "ADD_TO_CART",
  "WHATSAPP_CLICK",
] as const;

export const publicAnalyticsSchema = z
  .object({
    event: z.enum(publicAnalyticsEvents),
    path: z
      .string()
      .min(1)
      .max(2048)
      .refine(isStrictLocalPath, "Use somente um pathname local válido."),
    productSlug: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    searchTerm: z.string().trim().min(1).max(120).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const productEvent = input.event === "PRODUCT_VIEW" || input.event === "ADD_TO_CART";

    if (productEvent && !input.productSlug) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productSlug"],
        message: "Produto obrigatório para este evento.",
      });
    }

    if (input.event === "SEARCH" && !input.searchTerm) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["searchTerm"],
        message: "Termo obrigatório para busca.",
      });
    }

    if (input.event !== "SEARCH" && input.searchTerm) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["searchTerm"],
        message: "Termo permitido apenas para busca.",
      });
    }
  });

export type PublicAnalyticsInput = z.infer<typeof publicAnalyticsSchema>;
