"use client";

import type { AppearanceCapabilities, AppearanceTemplateKey } from "./types";

const templateLabels: Record<AppearanceTemplateKey, string> = {
  MODABELLA: "ModaBella",
  TEMPLATE_02: "Template 02",
  TEMPLATE_03: "Template 03",
  TEMPLATE_04: "Template 04",
};

type TemplatePickerProps = {
  value: AppearanceTemplateKey;
  templates: AppearanceCapabilities["templates"];
  disabled?: boolean;
  onChange: (template: AppearanceTemplateKey) => void;
};

export function TemplatePicker({
  value,
  templates,
  disabled = false,
  onChange,
}: TemplatePickerProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Templates</h2>
          <p className="mt-1 text-sm text-slate-600">Todos usam o mesmo contrato de catálogo e painel.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const active = template.key === value;
          const unavailable = !template.available;

          return (
            <button
              key={template.key}
              type="button"
              aria-pressed={active}
              disabled={disabled || unavailable}
              onClick={() => onChange(template.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-violet-700 bg-violet-50 shadow-sm"
                  : "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-white"
              } ${disabled || unavailable ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="block text-base font-semibold text-slate-950">{templateLabels[template.key]}</span>
                  <span className="mt-1 block text-sm text-slate-600">
                    {template.key === "MODABELLA"
                      ? "Template ativo e pronto para publicação."
                      : "Disponível em breve."}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    unavailable
                      ? "bg-slate-200 text-slate-600"
                      : active
                        ? "bg-violet-700 text-white"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {unavailable ? "Indisponível" : active ? "Selecionado" : "Disponível"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
