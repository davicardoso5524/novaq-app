import { notFound } from "next/navigation";
import { getPlatformCatalog, PlatformCatalogError } from "@/lib/platform/catalog-client";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export default async function PublicCatalogPage({ params }: PageProps) {
  const { slug } = await params;
  let catalog;

  try {
    catalog = await getPlatformCatalog(slug);
  } catch (error) {
    if (error instanceof PlatformCatalogError && error.code === "PLATFORM_NOT_FOUND") notFound();
    throw error;
  }

  if (catalog.status !== "ativo") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe5] px-6 py-16 text-[#143a2d]">
        <section className="w-full max-w-xl rounded-[2rem] border border-[#143a2d]/10 bg-white p-8 text-center shadow-xl sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#20a86b]">{catalog.name}</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Estamos em manutenção</h1>
          <p className="mt-4 text-base leading-7 text-[#527064]">
            Estamos atualizando este catálogo. Volte em alguns instantes para conferir as novidades.
          </p>
        </section>
      </main>
    );
  }

  return <ActiveCatalog catalog={catalog} />;
}

function ActiveCatalog({ catalog }: { catalog: Awaited<ReturnType<typeof getPlatformCatalog>> }) {
  return (
    <main className="min-h-screen bg-[#f4efe5] px-5 py-10 text-[#143a2d] sm:px-10">
      <section className="mx-auto max-w-6xl rounded-[2rem] bg-[#143a2d] p-8 text-[#f4efe5] shadow-2xl sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#20d586]">{catalog.template}</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight">{catalog.name}</h1>
        {catalog.description ? <p className="mt-4 max-w-2xl text-[#c5d8cf]">{catalog.description}</p> : null}
        <div className="mt-10 rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-[#c5d8cf]">
          Catálogo conectado à plataforma Novaq e pronto para receber seus produtos.
        </div>
      </section>
    </main>
  );
}
