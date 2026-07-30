"use client";

import type { AppearanceDraftValue } from "./types";

type Notice = {
  tone: "status" | "alert";
  message: string;
};

type AppearanceEditorProps = {
  draft: AppearanceDraftValue;
  canEdit: boolean;
  canPublish: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  validationMessage: string | null;
  notice: Notice | null;
  previewTriggerRef?: React.MutableRefObject<HTMLButtonElement | null>;
  showPreviewTrigger?: boolean;
  onOpenPreview: () => void;
  onSave: () => void;
  onPublish: () => void;
  onDraftChange: (draft: AppearanceDraftValue) => void;
};

function updateDraft(
  draft: AppearanceDraftValue,
  path: string,
  value: string | number | boolean,
): AppearanceDraftValue {
  const next = structuredClone(draft) as AppearanceDraftValue;
  const keys = path.split(".");
  let cursor: Record<string, unknown> = next as unknown as Record<string, unknown>;

  for (let index = 0; index < keys.length - 1; index += 1) {
    cursor = cursor[keys[index]] as Record<string, unknown>;
  }

  cursor[keys[keys.length - 1]] = value;
  return next;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-800">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Input({
  disabled,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      disabled={disabled}
      className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500"
    />
  );
}

function Textarea({
  disabled,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      disabled={disabled}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500"
    />
  );
}

export function AppearanceEditor({
  draft,
  canEdit,
  canPublish,
  isSaving,
  isPublishing,
  validationMessage,
  notice,
  previewTriggerRef,
  showPreviewTrigger = true,
  onOpenPreview,
  onSave,
  onPublish,
  onDraftChange,
}: AppearanceEditorProps) {
  const disableActions = Boolean(validationMessage) || isSaving || isPublishing;
  const readOnly = !canEdit;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-700">Studio de Aparência</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Estúdio de Aparência</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Ajuste o visual da loja, salve o rascunho e publique quando estiver pronto.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showPreviewTrigger ? (
            <button
              ref={previewTriggerRef}
              type="button"
              onClick={onOpenPreview}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700"
            >
              Preview da loja
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={readOnly || disableActions}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Salvando..." : "Salvar rascunho"}
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={!canPublish || disableActions}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-300"
          >
            {isPublishing ? "Publicando..." : "Publicar alterações"}
          </button>
        </div>
      </div>

      {readOnly ? (
        <p role="note" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Seu papel permite apenas visualização deste Studio.
        </p>
      ) : null}

      {validationMessage ? (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {validationMessage}
        </p>
      ) : null}

      {notice ? (
        notice.tone === "status" ? (
          <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice.message}
          </p>
        ) : (
          <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {notice.message}
          </p>
        )
      ) : null}

      <div className="space-y-4">
        <details open className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-slate-950">Identidade da loja</summary>
          <div className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:grid-cols-2">
            <Field label="Nome da loja">
              <Input
                aria-label="Nome da loja"
                value={draft.theme.storeName}
                disabled={readOnly}
                onChange={(event) => onDraftChange(updateDraft(draft, "theme.storeName", event.target.value))}
              />
            </Field>
            <Field label="Cor de destaque">
              <Input
                aria-label="Cor de destaque"
                value={draft.theme.accentColor}
                disabled={readOnly}
                onChange={(event) => onDraftChange(updateDraft(draft, "theme.accentColor", event.target.value.toUpperCase()))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Faixa de anúncio">
                <Input
                  aria-label="Faixa de anúncio"
                  value={draft.theme.announcement}
                  disabled={readOnly}
                  onChange={(event) => onDraftChange(updateDraft(draft, "theme.announcement", event.target.value))}
                />
              </Field>
            </div>
          </div>
        </details>

        <details open className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-slate-950">Hero principal</summary>
          <div className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:grid-cols-2">
            <Field label="Título do hero">
              <Input
                aria-label="Título do hero"
                value={draft.sections.hero.title}
                disabled={readOnly}
                onChange={(event) => onDraftChange(updateDraft(draft, "sections.hero.title", event.target.value))}
              />
            </Field>
            <Field label="CTA do hero">
              <Input
                aria-label="CTA do hero"
                value={draft.sections.hero.ctaLabel}
                disabled={readOnly}
                onChange={(event) => onDraftChange(updateDraft(draft, "sections.hero.ctaLabel", event.target.value))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Subtítulo do hero">
                <Textarea
                  aria-label="Subtítulo do hero"
                  rows={3}
                  value={draft.sections.hero.subtitle}
                  disabled={readOnly}
                  onChange={(event) => onDraftChange(updateDraft(draft, "sections.hero.subtitle", event.target.value))}
                />
              </Field>
            </div>
            <Field label="Link do CTA">
              <Input
                aria-label="Link do CTA"
                value={draft.sections.hero.ctaHref}
                disabled={readOnly}
                onChange={(event) => onDraftChange(updateDraft(draft, "sections.hero.ctaHref", event.target.value))}
              />
            </Field>
            <Field label="Imagem do hero">
              <Input
                aria-label="Imagem do hero"
                value={draft.sections.hero.imageUrl}
                disabled={readOnly}
                onChange={(event) => onDraftChange(updateDraft(draft, "sections.hero.imageUrl", event.target.value))}
              />
            </Field>
          </div>
        </details>

        <details open className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-5 py-4 text-base font-semibold text-slate-950">Seções da loja</summary>
          <div className="grid gap-4 border-t border-slate-100 px-5 py-5">
            <div className="grid gap-4 rounded-2xl border border-slate-100 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Título das categorias">
                <Input
                  aria-label="Título das categorias"
                  value={draft.sections.categories.title}
                  disabled={readOnly}
                  onChange={(event) => onDraftChange(updateDraft(draft, "sections.categories.title", event.target.value))}
                />
              </Field>
              <label className="inline-flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={draft.sections.categories.enabled}
                  disabled={readOnly}
                  onChange={(event) => onDraftChange(updateDraft(draft, "sections.categories.enabled", event.target.checked))}
                />
                Exibir categorias
              </label>
            </div>

            <div className="grid gap-4 rounded-2xl border border-slate-100 p-4 sm:grid-cols-2">
              <Field label="Título da vitrine">
                <Input
                  aria-label="Título da vitrine"
                  value={draft.sections.productFeed.title}
                  disabled={readOnly}
                  onChange={(event) => onDraftChange(updateDraft(draft, "sections.productFeed.title", event.target.value))}
                />
              </Field>
              <Field label="Limite de produtos">
                <Input
                  aria-label="Limite de produtos"
                  type="number"
                  min={1}
                  max={24}
                  value={String(draft.sections.productFeed.limit)}
                  disabled={readOnly}
                  onChange={(event) => onDraftChange(updateDraft(draft, "sections.productFeed.limit", Number(event.target.value)))}
                />
              </Field>
              <label className="inline-flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-800 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={draft.sections.productFeed.enabled}
                  disabled={readOnly}
                  onChange={(event) => onDraftChange(updateDraft(draft, "sections.productFeed.enabled", event.target.checked))}
                />
                Exibir vitrine de produtos
              </label>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
