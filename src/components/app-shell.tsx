"use client";

import type { ReactNode } from "react";
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

export function AppShell({
  user,
  activeTenant,
  tenants,
  activeSection = "dashboard",
  warning,
  children,
}: AppShellProps) {
  const tenantQuery = activeTenant ? `?tenantId=${encodeURIComponent(activeTenant.id)}` : "";

  function changeTenant(tenantId: string) {
    if (!tenantId) return;
    const target = activeSection === "appearance" ? "/painel/aparencia" : "/painel";
    window.location.assign(`${target}?tenantId=${encodeURIComponent(tenantId)}`);
  }

  const navigation = [
    { id: "dashboard" as const, label: "Dashboard", href: `/painel${tenantQuery}`, icon: "▦" },
    { id: "appearance" as const, label: "Aparência", href: `/painel/aparencia${tenantQuery}`, icon: "◐" },
  ];

  return (
    <div className="min-h-screen bg-[#f8f7fc] text-slate-950 lg:pl-[272px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
        <a href={`/painel${tenantQuery}`} className="text-2xl font-extrabold tracking-tight text-violet-700">
          Novaq Store
        </a>
        <div className="mt-7">
          <TenantSwitcher tenants={tenants} activeTenantId={activeTenant?.id ?? ""} onChange={changeTenant} />
        </div>
        <nav aria-label="Navegação principal" className="mt-7 space-y-2">
          {navigation.map((item) => {
            const active = item.id === activeSection;
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition ${
                  active ? "bg-violet-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <span aria-hidden="true" className="text-lg">{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>
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

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <a href={`/painel${tenantQuery}`} className="shrink-0 text-xl font-extrabold text-violet-700">Novaq</a>
          <div className="min-w-0 flex-1 max-w-64">
            <TenantSwitcher tenants={tenants} activeTenantId={activeTenant?.id ?? ""} onChange={changeTenant} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-9 lg:pb-10">
        {warning ? (
          <div role="alert" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            {warning}
          </div>
        ) : null}
        {children}
      </main>

      <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        {navigation.map((item) => {
          const active = item.id === activeSection;
          return (
            <a key={item.id} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center rounded-lg text-xs font-semibold ${active ? "text-violet-700" : "text-slate-500"}`}>
              <span aria-hidden="true" className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
