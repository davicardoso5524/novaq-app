export const MODABELLA_TENANT_SLUG = "modabella-demo";

export type ModaBellaSeed = {
  settings: {
    storeName: string;
    whatsAppNumber: string;
  };
  theme: {
    template: "MODABELLA";
    draftConfig: Record<string, unknown>;
    publishedConfig: Record<string, unknown>;
  };
  sections: Array<{
    type: "HERO" | "CATEGORIES" | "PRODUCT_FEED" | "PROMOTIONS" | "TESTIMONIALS";
    position: number;
    active: boolean;
    content: Record<string, unknown>;
  }>;
  categories: Array<{
    name: string;
    slug: string;
    position: number;
  }>;
  products: Array<{
    name: string;
    slug: string;
    categorySlug: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    variants: Array<{
      sku: string;
      size: string;
      color: string;
      stock: number;
      price?: number;
    }>;
    media: Array<{
      storageKey: string;
      url: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      altText: string;
      position: number;
    }>;
  }>;
};

export function getModaBellaSeed(): ModaBellaSeed {
  const settings = {
    storeName: "ModaBella",
    whatsAppNumber: "5585987654321",
  };

  return {
    settings,
    theme: {
      template: "MODABELLA",
      draftConfig: {
        ...settings,
        accentColor: "#B45372",
        announcement: "Frete grátis em Fortaleza nas compras acima de R$ 199.",
      },
      publishedConfig: {
        ...settings,
        accentColor: "#B45372",
        announcement: "Frete grátis em Fortaleza nas compras acima de R$ 199.",
      },
    },
    sections: [
      {
        type: "HERO",
        position: 0,
        active: true,
        content: {
          title: "Seu estilo, sua história",
          subtitle: "Peças escolhidas para acompanhar todos os seus momentos.",
          ctaLabel: "Ver novidades",
          ctaHref: "#novidades",
        },
      },
      {
        type: "CATEGORIES",
        position: 1,
        active: true,
        content: { title: "Compre por categoria" },
      },
      {
        type: "PRODUCT_FEED",
        position: 2,
        active: true,
        content: { title: "Novidades ModaBella", limit: 12 },
      },
    ],
    categories: [
      { name: "Vestidos", slug: "vestidos", position: 0 },
      { name: "Conjuntos", slug: "conjuntos", position: 1 },
      { name: "Acessórios", slug: "acessorios", position: 2 },
    ],
    products: [
      {
        name: "Vestido Aurora",
        slug: "vestido-aurora",
        categorySlug: "vestidos",
        description: "Vestido midi em tecido leve com caimento fluido.",
        price: 189.9,
        compareAtPrice: 229.9,
        variants: [
          { sku: "MB-VA-ROSA-P", size: "P", color: "Rosa", stock: 8 },
          { sku: "MB-VA-ROSA-M", size: "M", color: "Rosa", stock: 12 },
          { sku: "MB-VA-ROSA-G", size: "G", color: "Rosa", stock: 6 },
        ],
        media: [
          {
            storageKey: "catalog/vestido-aurora-rosa-01.jpg",
            url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=85",
            fileName: "vestido-aurora-rosa-01.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 184_000,
            altText: "Vestido Aurora rosa em fundo claro",
            position: 0,
          },
        ],
      },
      {
        name: "Conjunto Serena",
        slug: "conjunto-serena",
        categorySlug: "conjuntos",
        description: "Conjunto de alfaiataria com blazer e calça de cintura alta.",
        price: 279.9,
        variants: [
          { sku: "MB-CS-BEGE-P", size: "P", color: "Bege", stock: 4 },
          { sku: "MB-CS-BEGE-M", size: "M", color: "Bege", stock: 9 },
          { sku: "MB-CS-BEGE-G", size: "G", color: "Bege", stock: 5 },
        ],
        media: [
          {
            storageKey: "catalog/conjunto-serena-bege-01.jpg",
            url: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1200&q=85",
            fileName: "conjunto-serena-bege-01.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 191_000,
            altText: "Conjunto Serena bege de alfaiataria",
            position: 0,
          },
        ],
      },
      {
        name: "Bolsa Luna",
        slug: "bolsa-luna",
        categorySlug: "acessorios",
        description: "Bolsa estruturada para acompanhar a rotina e ocasiões especiais.",
        price: 159.9,
        variants: [
          { sku: "MB-BL-CARAMELO-UN", size: "Único", color: "Caramelo", stock: 15 },
        ],
        media: [
          {
            storageKey: "catalog/bolsa-luna-caramelo-01.jpg",
            url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85",
            fileName: "bolsa-luna-caramelo-01.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 141_000,
            altText: "Bolsa Luna caramelo com alça curta",
            position: 0,
          },
        ],
      },
    ],
  };
}
