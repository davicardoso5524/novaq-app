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
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-700">Visão geral</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Dashboard</h1>
              <p className="mt-2 text-slate-600">Olá, <strong>{state.activeTenant.name}</strong>. Este é o novo núcleo administrativo da sua loja.</p>
            </div>
            <a href={`/painel/aparencia?tenantId=${encodeURIComponent(state.activeTenant.id)}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-violet-800">
              Abrir Aparência
            </a>
          </div>
          <section aria-label="Resumo da fundação" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Tenant ativo", state.activeTenant.name],
              ["Seu papel", state.activeTenant.role === "OWNER" ? "Proprietário" : state.activeTenant.role],
              ["Isolamento", "Contexto validado no servidor"],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-3 text-lg font-bold text-slate-950">{value}</p>
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-950">Nenhuma loja disponível</h1>
          <p className="mt-3 text-slate-600">Sua conta ainda não possui uma membership ativa. Fale com um administrador da Novaq.</p>
        </section>
      )}
    </AppShell>
  );
}
