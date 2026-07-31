"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, Palette, X } from "lucide-react";
import { TenantSwitcher, type TenantSummary } from "./tenant-switcher";

type ShellUser = { name: string; email: string };
type Section = "dashboard" | "appearance";

const roleLabels: Record<TenantSummary["role"], string> = {
  SUPERADMIN: "Superadmin",
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Visualizador",
};

type AppShellProps = {
  user: ShellUser;
  activeTenant: TenantSummary | null;
  tenants: TenantSummary[];
  activeSection?: Section;
  warning?: string;
  children: ReactNode;
};

type NavigationItem = { id: Section; label: string; href: string; icon: typeof LayoutDashboard };

function Navigation({ items, activeSection, mobile = false, onNavigate }: { items: NavigationItem[]; activeSection: Section; mobile?: boolean; onNavigate?(): void }) {
  return (
    <nav aria-label="Navegação principal" className={mobile ? "grid gap-2" : "mt-8 grid gap-2"}>
      {items.map((item) => {
        const active = item.id === activeSection;
        const Icon = item.icon;
        return (
          <a
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`group flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${
              active
                ? "bg-violet-700 text-white shadow-[0_10px_24px_rgba(109,40,217,0.2)]"
                : "text-slate-600 hover:bg-violet-50 hover:text-violet-800"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-violet-100" : "text-slate-400 group-hover:text-violet-600"}`} aria-hidden="true" />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

export function AppShell({
  user,
  activeTenant,
  tenants,
  activeSection = "dashboard",
  warning,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tenantQuery = activeTenant ? `?tenantId=${encodeURIComponent(activeTenant.id)}` : "";

  function changeTenant(tenantId: string) {
    if (!tenantId) return;
    const target = activeSection === "appearance" ? "/painel/aparencia" : "/painel";
    window.location.assign(`${target}?tenantId=${encodeURIComponent(tenantId)}`);
  }

  const navigation = [
    { id: "dashboard" as const, label: "Visão geral", href: `/painel${tenantQuery}`, icon: LayoutDashboard },
    { id: "appearance" as const, label: "Aparência", href: `/painel/aparencia${tenantQuery}`, icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-[#f8f7fc] text-slate-950 lg:pl-[272px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
        <a href={`/painel${tenantQuery}`} className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-slate-950">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-700 text-sm font-black text-white">N</span>
          <span>Novaq <span className="text-violet-700">Store</span></span>
        </a>
        <p className="mt-2 text-xs font-medium text-slate-500">Seu espaço para publicar melhor</p>
        <div className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
          <TenantSwitcher tenants={tenants} activeTenantId={activeTenant?.id ?? ""} onChange={changeTenant} />
        </div>
        <Navigation items={navigation} activeSection={activeSection} />
        <div className="mt-auto border-t border-slate-200 pt-5">
          <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          {activeTenant ? (
            <p className="mt-2 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
              {roleLabels[activeTenant.role]}
            </p>
          ) : null}
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <a href={`/painel${tenantQuery}`} className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-slate-950">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-700 text-xs font-black text-white">N</span>
            Novaq
          </a>
          <div className="min-w-0 flex-1 max-w-64">
            <TenantSwitcher tenants={tenants} activeTenantId={activeTenant?.id ?? ""} onChange={changeTenant} />
          </div>
          <button type="button" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen ? <div className="mx-auto mt-4 max-w-6xl border-t border-slate-100 pt-4"><Navigation items={navigation} activeSection={activeSection} mobile onNavigate={() => setMobileOpen(false)} /><div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div><LogOut className="h-4 w-4 text-slate-400" aria-hidden="true" /></div></div> : null}
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-9 lg:pb-10">
        {warning ? (
          <div role="alert" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            {warning}
          </div>
        ) : null}
        {children}
      </main>

    </div>
  );
}
