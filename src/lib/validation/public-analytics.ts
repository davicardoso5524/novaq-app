import { z } from "zod";

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
    path: z.string().trim().min(1).max(2048).startsWith("/"),
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
