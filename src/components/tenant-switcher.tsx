"use client";

export type TenantSummary = {
  id: string;
  slug: string;
  name: string;
  role: "SUPERADMIN" | "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
};

type TenantSwitcherProps = {
  tenants: TenantSummary[];
  activeTenantId: string;
  onChange(tenantId: string): void;
};

export function TenantSwitcher({ tenants, activeTenantId, onChange }: TenantSwitcherProps) {
  return (
    <div className="w-full">
      <label htmlFor="active-tenant" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        Loja ativa
      </label>
      <select
        id="active-tenant"
        value={activeTenantId}
        onChange={(event) => onChange(event.target.value)}
        disabled={tenants.length === 0}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        {tenants.length === 0 ? <option value="">Nenhuma loja disponível</option> : null}
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </div>
  );
}
