import { MembershipRole, TenantStatus } from "@prisma/client";
import { z } from "zod";

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "Informe um domínio válido sem protocolo ou caminho.",
  );

export const tenantCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use slug em kebab-case."),
  ownerEmail: z.string().trim().toLowerCase().email(),
  publicDomain: domainSchema.nullish(),
});

export const tenantUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    publicDomain: domainSchema.nullable().optional(),
    status: z.nativeEnum(TenantStatus).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Informe ao menos uma alteração.");

export const membershipCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum([
    MembershipRole.ADMIN,
    MembershipRole.EDITOR,
    MembershipRole.VIEWER,
  ]),
});
