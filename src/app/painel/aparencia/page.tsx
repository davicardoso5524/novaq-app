import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth/config";
import { loadPanelState } from "@/lib/panel/load-state";

type PageProps = { searchParams: Promise<{ tenantId?: string }> };

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
      <div className="max-w-4xl">
        <p className="text-sm font-semibold text-violet-700">Studio de Aparência</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Aparência da loja</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Este é o ponto de entrada protegido do Studio dentro do mesmo painel, sessão e tenant. O editor de templates será conectado aqui na próxima fase.
        </p>
        <section className="mt-8 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm sm:p-8">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-700 text-xl text-white" aria-hidden="true">◐</div>
          <h2 className="mt-5 text-xl font-bold text-slate-950">Módulo em construção</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Os quatro templates compartilharão o mesmo contrato de dados. Trocar o visual não duplicará catálogo, produtos ou lógica administrativa.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
