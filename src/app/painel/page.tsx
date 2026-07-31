import { ArrowUpRight, CheckCircle2, ExternalLink, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth/config";
import { loadPanelState } from "@/lib/panel/load-state";

type PageProps = { searchParams: Promise<{ tenantId?: string }> };

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.ativo) redirect("/login");
  const { tenantId } = await searchParams;
  const state = await loadPanelState(session.user, tenantId);

  return (
    <AppShell
      user={{ name: session.user.name ?? "Usuário", email: session.user.email ?? "" }}
      activeTenant={state.activeTenant}
      tenants={state.tenants}
      warning={state.requestedUnavailable ? "A loja solicitada não está mais disponível para sua conta. Exibimos sua primeira loja ativa." : undefined}
    >
      {state.activeTenant ? (
        <div className="grid gap-6">
          <section className="relative overflow-hidden rounded-[2rem] bg-[#18252f] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-200"><Sparkles className="h-4 w-4" aria-hidden="true" /> Seu workspace está pronto</div>
                <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Olá, {state.activeTenant.name}.</h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">Organize a presença da sua loja, escolha uma atmosfera e acompanhe tudo em um só lugar.</p>
              </div>
              <a href={`/painel/aparencia?tenantId=${encodeURIComponent(state.activeTenant.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-violet-50">
                Personalizar loja <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <div className="relative mt-8 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Tenant protegido</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-violet-200" /> {state.activeTenant.role === "OWNER" ? "Proprietário" : state.activeTenant.role}</span>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">Visão geral</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Acompanhe sua loja</h2>
            </div>
            <a href={`/catalogo/${encodeURIComponent(state.activeTenant.slug)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900">Ver catálogo público <ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
          </div>

          <section aria-label="Resumo da loja" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Status da loja", "Ativa e protegida"],
              ["Seu papel", state.activeTenant.role === "OWNER" ? "Proprietário" : state.activeTenant.role],
              ["Próximo passo", "Escolher um template"],
            ].map(([label, value]) => (
              <article key={label} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-3 text-lg font-bold text-slate-950">{value}</p>
                <div className="mt-5 h-1 w-12 rounded-full bg-violet-200 transition-all group-hover:w-20 group-hover:bg-violet-600" />
              </article>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <a href={`/painel/aparencia?tenantId=${encodeURIComponent(state.activeTenant.id)}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Palette className="h-5 w-5" aria-hidden="true" /></span>
              <h2 className="mt-5 text-lg font-bold text-slate-950">Dê personalidade à sua loja</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Explore os templates e escolha a direção visual que combina com sua próxima coleção.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-700">Abrir Studio <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true" /></span>
            </a>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Próximas melhorias</p>
              <h2 className="mt-3 text-lg font-bold text-slate-950">Seu painel vai crescer com a loja</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Produtos, pedidos e equipe entrarão nesta mesma experiência, sem trocar de contexto.</p>
            </div>
          </section>
        </div>
      ) : (
        <section className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Nenhuma loja disponível</h1>
          <p className="mt-3 text-slate-600">Sua conta ainda não possui uma membership ativa. Fale com um administrador da Novaq.</p>
        </section>
      )}
    </AppShell>
  );
}
