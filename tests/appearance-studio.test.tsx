// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { TemplateKey } from "@prisma/client";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceStudio } from "../src/app/painel/aparencia/appearance-studio";
import type { TenantAppearancePayload } from "../src/lib/appearance/repository";

const appearanceResponse: TenantAppearancePayload = {
  draft: {
    template: TemplateKey.MODABELLA,
    theme: {
      storeName: "Moda Bella Fortaleza",
      accentColor: "#B45372",
      announcement: "Frete grátis em Fortaleza",
      whatsAppNumber: "5585987654321",
    },
    sections: {
      hero: {
        title: "Nova coleção",
        subtitle: "Peças leves para o verão",
        ctaLabel: "Comprar agora",
        ctaHref: "#novidades",
        imageUrl: "https://cdn.example.com/hero.jpg",
      },
      categories: {
        title: "Categorias em destaque",
        enabled: true,
      },
      productFeed: {
        title: "Mais vendidos",
        limit: 8,
        enabled: true,
      },
    },
  },
  published: {
    template: TemplateKey.MODABELLA,
    theme: {
      storeName: "Moda Bella Fortaleza",
      accentColor: "#B45372",
      announcement: "Frete grátis em Fortaleza",
      whatsAppNumber: "5585987654321",
    },
    sections: {
      hero: {
        title: "Nova coleção",
        subtitle: "Peças leves para o verão",
        ctaLabel: "Comprar agora",
        ctaHref: "#novidades",
        imageUrl: "https://cdn.example.com/hero.jpg",
      },
      categories: {
        title: "Categorias em destaque",
        enabled: true,
      },
      productFeed: {
        title: "Mais vendidos",
        limit: 8,
        enabled: true,
      },
    },
  },
  publishedAt: new Date("2026-07-30T11:00:00.000Z"),
  capabilities: {
    canEdit: true,
    canPublish: true,
    templates: [
      { key: TemplateKey.MODABELLA, available: true },
      { key: TemplateKey.TEMPLATE_02, available: false },
      { key: TemplateKey.TEMPLATE_03, available: false },
      { key: TemplateKey.TEMPLATE_04, available: false },
    ],
  },
};

const previewCatalog = {
  categories: [
    { name: "Vestidos", slug: "vestidos", position: 0 },
    { name: "Acessórios", slug: "acessorios", position: 1 },
  ],
  products: [
    {
      name: "Vestido Aurora",
      slug: "vestido-aurora",
      description: null,
      categorySlug: "vestidos",
      price: "189.90",
      compareAtPrice: null,
      variants: [],
      images: [{ url: "https://cdn.example.com/aurora.jpg", altText: "Vestido Aurora" }],
    },
    {
      name: "Bolsa Serena",
      slug: "bolsa-serena",
      description: null,
      categorySlug: "acessorios",
      price: "249.90",
      compareAtPrice: null,
      variants: [],
      images: [{ url: "https://cdn.example.com/serena.jpg", altText: "Bolsa Serena" }],
    },
  ],
};

function mockJsonResponse(body: unknown, init?: ResponseInit) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
      ...init,
    }),
  );
}

describe("AppearanceStudio", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();

        if (!init?.method || init.method === "GET") {
          expect(url).toContain("/api/tenants/tenant-modabella/appearance");
          return mockJsonResponse(appearanceResponse);
        }

        if (init.method === "PATCH") {
          return mockJsonResponse({
            ...appearanceResponse,
            draft: {
              ...appearanceResponse.draft,
              theme: {
                ...appearanceResponse.draft.theme,
                storeName: "Moda Bella Prime",
              },
            },
          });
        }

        if (init.method === "POST") {
          return mockJsonResponse({
            ...appearanceResponse,
            published: {
              ...appearanceResponse.published,
              theme: {
                ...appearanceResponse.published.theme,
                storeName: "Moda Bella Prime",
              },
            },
          });
        }

        return mockJsonResponse({});
      }),
    );
  });

  it("loads the appearance api, renders template options and keeps reserved templates unavailable", async () => {
    render(<AppearanceStudio tenantId="tenant-modabella" catalog={previewCatalog} />);

    expect(await screen.findByRole("heading", { name: "Estúdio de Aparência" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da loja")).toHaveValue("Moda Bella Fortaleza");
    expect(screen.getByRole("button", { name: /modabella/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /template 02/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /template 03/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /template 04/i })).toBeDisabled();
    expect(screen.getAllByText("Moda Bella Fortaleza").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nova coleção").length).toBeGreaterThan(0);
  });

  it("updates the phone preview live from the local draft without writing to the database", async () => {
    const user = userEvent.setup();
    render(<AppearanceStudio tenantId="tenant-modabella" catalog={previewCatalog} />);

    const storeName = await screen.findByLabelText("Nome da loja");
    await user.clear(storeName);
    await user.type(storeName, "Moda Bella Prime");
    const accentColor = screen.getByLabelText("Cor de destaque");
    await user.clear(accentColor);
    await user.type(accentColor, "#0F766E");
    await user.clear(screen.getByLabelText("Título do hero"));
    await user.type(screen.getByLabelText("Título do hero"), "Coleção Resort");

    expect(screen.getAllByText("Moda Bella Prime").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Coleção Resort").length).toBeGreaterThan(0);
    expect(screen.getByTestId("appearance-phone-preview")).toHaveStyle({ "--store-accent": "#0F766E" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("renders a read-only experience for viewer/editor capabilities", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        mockJsonResponse({
          ...appearanceResponse,
          capabilities: {
            ...appearanceResponse.capabilities,
            canEdit: false,
            canPublish: false,
          },
        }),
      ),
    );

    render(<AppearanceStudio tenantId="tenant-modabella" catalog={previewCatalog} />);

    expect(await screen.findByLabelText("Nome da loja")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Publicar alterações" })).toBeDisabled();
    expect(screen.getByRole("note")).toHaveTextContent("Seu papel permite apenas visualização");
  });

  it("saves draft and publishes with status feedback while actions are pending", async () => {
    const user = userEvent.setup();
    render(<AppearanceStudio tenantId="tenant-modabella" catalog={previewCatalog} />);

    const storeName = await screen.findByLabelText("Nome da loja");
    await user.clear(storeName);
    await user.type(storeName, "Moda Bella Prime");

    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Rascunho salvo");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/tenants/tenant-modabella/appearance",
      expect.objectContaining({
        method: "PATCH",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Publicar alterações" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Alterações publicadas");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/tenants/tenant-modabella/appearance/publish",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
