"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppearanceEditor } from "@/components/appearance/appearance-editor";
import { AppearancePreview } from "@/components/appearance/appearance-preview";
import { TemplatePicker } from "@/components/appearance/template-picker";
import type {
  AppearanceDraftValue,
  AppearancePreviewCatalog,
  AppearanceResponse,
} from "@/components/appearance/types";

type AppearanceStudioProps = {
  tenantId: string;
  catalog: AppearancePreviewCatalog;
};

type Notice = {
  tone: "status" | "alert";
  message: string;
};

function isSafeHref(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#")) return /^#[a-z0-9][a-z0-9\-_]*$/i.test(trimmed);
  if (trimmed.startsWith("/")) return !trimmed.startsWith("//");

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isSafeImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return !trimmed.startsWith("//");

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateDraft(draft: AppearanceDraftValue): string | null {
  if (!/^#[0-9A-Fa-f]{6}$/.test(draft.theme.accentColor.trim())) {
    return "Use uma cor hexadecimal válida no formato #RRGGBB.";
  }

  if (!/^\d{10,15}$/.test(draft.theme.whatsAppNumber.trim())) {
    return "O WhatsApp deve conter apenas números entre 10 e 15 dígitos.";
  }

  if (!isSafeHref(draft.sections.hero.ctaHref)) {
    return "Use um link seguro no CTA do hero.";
  }

  if (!isSafeImageUrl(draft.sections.hero.imageUrl)) {
    return "Use uma imagem HTTPS ou caminho público válido no hero.";
  }

  if (!Number.isInteger(draft.sections.productFeed.limit) || draft.sections.productFeed.limit < 1 || draft.sections.productFeed.limit > 24) {
    return "O limite da vitrine deve ficar entre 1 e 24 produtos.";
  }

  return null;
}

export function AppearanceStudio({ tenantId, catalog }: AppearanceStudioProps) {
  const [appearance, setAppearance] = useState<AppearanceResponse | null>(null);
  const [draft, setDraft] = useState<AppearanceDraftValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewCloseRef = useRef<HTMLButtonElement | null>(null);

  const showInlinePreview = viewportWidth >= 1024;
  const showPreviewTrigger = viewportWidth < 1024;

  useEffect(() => {
    let active = true;

    async function loadAppearance() {
      setLoading(true);
      setNotice(null);

      try {
        const response = await fetch(`/api/tenants/${tenantId}/appearance`);
        const payload = await response.json() as AppearanceResponse | { error?: { message?: string } };

        if (!response.ok) {
          throw new Error(payload && "error" in payload ? payload.error?.message ?? "Falha ao carregar o Studio." : "Falha ao carregar o Studio.");
        }

        if (!active) return;
        setAppearance(payload as AppearanceResponse);
        setDraft((payload as AppearanceResponse).draft);
      } catch (error) {
        if (!active) return;
        setNotice({
          tone: "alert",
          message: error instanceof Error ? error.message : "Falha ao carregar o Studio.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAppearance();

    return () => {
      active = false;
    };
  }, [tenantId]);

  useEffect(() => {
    function handleResize() {
      const nextWidth = window.innerWidth;
      setViewportWidth(nextWidth);
      if (nextWidth >= 1024) {
        setIsPreviewOpen(false);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isPreviewOpen) return;
    previewCloseRef.current?.focus();
  }, [isPreviewOpen]);

  const validationMessage = useMemo(() => (draft ? validateDraft(draft) : null), [draft]);

  function closePreviewDialog() {
    setIsPreviewOpen(false);
    window.requestAnimationFrame(() => {
      previewTriggerRef.current?.focus();
    });
  }

  async function persistDraft() {
    if (!draft || validationMessage) return;

    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/appearance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json() as AppearanceResponse | { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload && "error" in payload ? payload.error?.message ?? "Não foi possível salvar o rascunho." : "Não foi possível salvar o rascunho.");
      }

      setAppearance(payload as AppearanceResponse);
      setDraft((payload as AppearanceResponse).draft);
      setNotice({ tone: "status", message: "Rascunho salvo com sucesso." });
    } catch (error) {
      setNotice({
        tone: "alert",
        message: error instanceof Error ? error.message : "Não foi possível salvar o rascunho.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function publishDraft() {
    if (!draft || validationMessage) return;

    setIsPublishing(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/appearance/publish`, {
        method: "POST",
      });
      const payload = await response.json() as AppearanceResponse | { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload && "error" in payload ? payload.error?.message ?? "Não foi possível publicar as alterações." : "Não foi possível publicar as alterações.");
      }

      setAppearance(payload as AppearanceResponse);
      setDraft((payload as AppearanceResponse).draft);
      setNotice({ tone: "status", message: "Alterações publicadas com sucesso." });
    } catch (error) {
      setNotice({
        tone: "alert",
        message: error instanceof Error ? error.message : "Não foi possível publicar as alterações.",
      });
    } finally {
      setIsPublishing(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-violet-700">Studio de Aparência</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Carregando Studio...</h1>
      </section>
    );
  }

  if (!appearance || !draft) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-rose-950">Não foi possível abrir o Studio</h1>
        <p role="alert" className="mt-3 text-sm text-rose-800">
          {notice?.message ?? "Verifique sua sessão e tente novamente."}
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="space-y-6">
          <TemplatePicker
            value={draft.template}
            templates={appearance.capabilities.templates}
            disabled={!appearance.capabilities.canEdit}
            onChange={(template) => setDraft({ ...draft, template })}
          />
          <AppearanceEditor
            draft={draft}
            canEdit={appearance.capabilities.canEdit}
            canPublish={appearance.capabilities.canPublish}
            isSaving={isSaving}
            isPublishing={isPublishing}
            validationMessage={validationMessage}
            notice={notice}
            onOpenPreview={() => setIsPreviewOpen(true)}
            previewTriggerRef={previewTriggerRef}
            showPreviewTrigger={showPreviewTrigger}
            onSave={() => void persistDraft()}
            onPublish={() => void publishDraft()}
            onDraftChange={setDraft}
          />
        </div>

        {showInlinePreview ? (
          <aside className="lg:sticky lg:top-24">
            <AppearancePreview draft={draft} catalog={catalog} />
          </aside>
        ) : null}
      </div>

      {isPreviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 lg:hidden"
          tabIndex={-1}
          onClick={(event) => {
            if (event.target === event.currentTarget) closePreviewDialog();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closePreviewDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="appearance-preview-dialog-title"
            className="max-h-[95vh] w-full max-w-[420px] overflow-auto rounded-[2rem] bg-white p-4 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="appearance-preview-dialog-title" className="text-lg font-bold text-slate-950">Preview da loja</h2>
                <p className="text-sm text-slate-600">Visualização do draft atual.</p>
              </div>
              <button
                ref={previewCloseRef}
                type="button"
                onClick={closePreviewDialog}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-900"
              >
                Fechar
              </button>
            </div>
            <AppearancePreview draft={draft} catalog={catalog} title="Preview mobile da loja" />
          </div>
        </div>
      ) : null}
    </>
  );
}
