import type { ComponentType, ReactNode } from "react";
import type { TemplateKey } from "@prisma/client";
import type { PublicStoreData } from "../catalog/types";
import { ModaBellaStore } from "../../templates/modabella/modabella-store";

export class TemplateUnavailableError extends Error {
  constructor(template: TemplateKey | "UNPUBLISHED") {
    super(`Template ${template} is not available.`);
    this.name = "TemplateUnavailableError";
  }
}

const templates: Partial<
  Record<TemplateKey, ComponentType<{ data: PublicStoreData }>>
> = {
  MODABELLA: ModaBellaStore,
};

export function renderStoreTemplate(data: PublicStoreData): ReactNode {
  const templateKey = data.theme?.template;
  if (!templateKey) throw new TemplateUnavailableError("UNPUBLISHED");

  const Template = templates[templateKey];
  if (!Template) throw new TemplateUnavailableError(templateKey);

  return <Template data={data} />;
}
