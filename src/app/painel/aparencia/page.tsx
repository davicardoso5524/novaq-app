import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppearanceStudio } from "./appearance-studio";
import { auth } from "@/lib/auth/config";
import type { PublicStoreData } from "@/lib/catalog/types";
import { loadPanelState } from "@/lib/panel/load-state";
import { prisma } from "@/lib/prisma";

type PageProps = { searchParams: Promise<{ tenantId?: string }> };

async function loadAppearancePreviewCatalog(tenantId: string): Promise<Pick<PublicStoreData, "categories" | "products">> {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { tenantId, active: true },
      orderBy: { position: "asc" },
      select: {
        name: true,
        slug: true,
        position: true,
      },
    }),
    prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
        category: { is: { active: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 12,
      select: {
        name: true,
        slug: true,
        description: true,
        price: true,
        compareAtPrice: true,
        category: { select: { slug: true } },
        variants: {
          where: { tenantId, active: true },
          select: {
            sku: true,
            size: true,
            color: true,
            stock: true,
            price: true,
          },
          orderBy: { createdAt: "asc" },
        },
        media: {
          where: { tenantId, mediaAsset: { is: { deletedAt: null } } },
          orderBy: { position: "asc" },
          select: {
            mediaAsset: {
              select: {
                url: true,
                altText: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    categories,
    products: products.map((product) => ({
      name: product.name,
      slug: product.slug,
      description: product.description,
      categorySlug: product.category.slug,
      price: product.price.toString(),
      compareAtPrice: product.compareAtPrice?.toString() ?? null,
      variants: product.variants.map((variant) => ({
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
        price: variant.price?.toString() ?? null,
      })),
      images: product.media.map(({ mediaAsset }) => ({
        url: mediaAsset.url,
        altText: mediaAsset.altText,
      })),
    })),
  };
}

export default async function AppearancePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.ativo) redirect("/login");
  const { tenantId } = await searchParams;
  const state = await loadPanelState(session.user, tenantId);
  const previewCatalog = state.activeTenant
    ? await loadAppearancePreviewCatalog(state.activeTenant.id)
    : { categories: [], products: [] };

  return (
    <AppShell
      user={{ name: session.user.name ?? "Usuário", email: session.user.email ?? "" }}
      activeTenant={state.activeTenant}
      tenants={state.tenants}
      activeSection="appearance"
      warning={state.requestedUnavailable ? "A loja solicitada não está mais disponível para sua conta. Exibimos sua primeira loja ativa." : undefined}
    >
      {state.activeTenant ? (
        <AppearanceStudio tenantId={state.activeTenant.id} catalog={previewCatalog} />
      ) : (
        <section className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-950">Nenhuma loja disponível</h1>
          <p className="mt-3 text-slate-600">Sua conta ainda não possui uma membership ativa para abrir o Studio.</p>
        </section>
      )}
    </AppShell>
  );
}
