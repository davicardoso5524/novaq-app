import { Check, Eye, LayoutTemplate, Palette, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth/config";
import { loadPanelState } from "@/lib/panel/load-state";

type PageProps = { searchParams: Promise<{ tenantId?: string }> };

const templates = [
  { name: "Moda Bella", slug: "moda-bella", description: "Editorial, elegante e com foco em coleções.", accent: "#d9a66d", background: "from-[#5a2d2d] via-[#b87862] to-[#f4d2b4]", active: true },
  { name: "Casa Nobre", slug: "casa-nobre", description: "Calmo, material e pensado para ambientes.", accent: "#d1ad7b", background: "from-[#33413d] via-[#a79778] to-[#e8ddc6]", active: false },
  { name: "Óptica Prisma", slug: "optica-prisma", description: "Preciso, contemporâneo e cheio de contraste.", accent: "#8bc7d6", background: "from-[#152a3c] via-[#32788e] to-[#b6e0e3]", active: false },
  { name: "Studio Beauty", slug: "studio-beauty", description: "Leve, sensorial e com uma presença delicada.", accent: "#e9a8b3", background: "from-[#553b50] via-[#ca8297] to-[#f5d4c8]", active: false },
];

export default async function AppearancePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.ativo) redirect("/login");
  const { tenantId } = await searchParams;
  const state = await loadPanelState(session.user, tenantId);

  return (
    <AppShell
      user={{ name: session.user.name ?? "Usuário", email: session.user.email ?? "" }}
      activeTenant={state.activeTenant}
      tenants={state.tenants}
      activeSection="appearance"
      warning={state.requestedUnavailable ? "A loja solicitada não está mais disponível para sua conta. Exibimos sua primeira loja ativa." : undefined}
    >
      <div className="grid gap-7">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-700"><Sparkles className="h-4 w-4" aria-hidden="true" /> Studio de aparência</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">A atmosfera da sua loja</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Escolha uma base visual. Seus produtos e configurações continuam os mesmos, apenas a forma de apresentar muda.</p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 sm:self-auto"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Loja publicada</span>
        </header>

        <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700"><LayoutTemplate className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Template atual</p><h2 className="text-xl font-bold text-slate-950">Moda Bella</h2></div></div>
            <p className="mt-5 text-sm leading-6 text-slate-600">Uma composição com ritmo editorial para destacar lançamentos e coleções especiais.</p>
            <button type="button" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-violet-800"><Palette className="h-4 w-4" aria-hidden="true" /> Personalizar base</button>
          </div>
          <div className="relative min-h-56 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#5a2d2d] via-[#b87862] to-[#f4d2b4] p-5 shadow-inner sm:min-h-64">
            <div className="absolute right-5 top-5 h-24 w-24 rounded-full border border-white/30 bg-white/15 backdrop-blur" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/30 bg-black/15 p-4 text-white backdrop-blur-sm"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Coleção atual</p><p className="mt-2 text-2xl font-semibold">Verão essencial</p><div className="mt-4 h-1 w-20 rounded-full bg-white/80" /></div>
            <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800"><Eye className="h-3 w-3" aria-hidden="true" /> Preview</span>
          </div>
        </section>

        <section aria-labelledby="templates-title">
          <div className="mb-4 flex items-end justify-between gap-4"><div><h2 id="templates-title" className="text-xl font-bold text-slate-950">Escolha outro template</h2><p className="mt-1 text-sm text-slate-600">Todos seguem o mesmo painel e contrato de dados.</p></div><span className="hidden text-xs font-semibold text-slate-500 sm:block">{templates.length} opções disponíveis</span></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {templates.map((template) => (
              <article key={template.slug} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${template.active ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200"}`}>
                <div className={`relative h-36 bg-gradient-to-br ${template.background} p-4`}><div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/30 bg-black/10 p-3 text-white backdrop-blur-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{template.slug}</p><p className="mt-1 text-lg font-semibold">{template.name}</p></div>{template.active ? <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white text-violet-700"><Check className="h-4 w-4" aria-hidden="true" /></span> : null}</div>
                <div className="p-4"><h3 className="font-bold text-slate-950">{template.name}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-slate-600">{template.description}</p><div className="mt-4 flex items-center justify-between"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: template.accent }} aria-hidden="true" />{template.active ? <span className="text-xs font-bold text-violet-700">Em uso</span> : <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-violet-300 hover:text-violet-700">Visualizar <Eye className="h-3.5 w-3.5" aria-hidden="true" /></button>}</div></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
