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

export function getAvailableStoreTemplate(data: PublicStoreData): {
  key: TemplateKey;
  Component: ComponentType<{ data: PublicStoreData }>;
} {
  const templateKey = data.theme?.template;
  if (!templateKey) throw new TemplateUnavailableError("UNPUBLISHED");

  const Component = templates[templateKey];
  if (!Component) throw new TemplateUnavailableError(templateKey);

  return { key: templateKey, Component };
}

export function isAvailableStoreTemplate(
  data: PublicStoreData,
  expected: TemplateKey,
): boolean {
  try {
    return getAvailableStoreTemplate(data).key === expected;
  } catch (error) {
    if (error instanceof TemplateUnavailableError) return false;
    throw error;
  }
}

export function renderStoreTemplate(data: PublicStoreData): ReactNode {
  const { Component } = getAvailableStoreTemplate(data);

  return <Component data={data} />;
}
