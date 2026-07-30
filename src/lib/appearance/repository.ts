import { Prisma, StoreSectionType } from "@prisma/client";
import { prisma } from "../prisma";
import type { TenantContext } from "../tenant/types";
import {
  appearanceDraftSchema,
  appearanceTemplateCapabilities,
  normalizeAppearanceDraft,
  type AppearanceDraft,
} from "./schema";

type AppearanceState = {
  draft: AppearanceDraft;
  published: AppearanceDraft;
  publishedAt: Date | null;
};

type AppearanceCapabilities = {
  canEdit: boolean;
  canPublish: boolean;
  templates: typeof appearanceTemplateCapabilities;
};

type PublishedThemeConfig = {
  storeName: string;
  accentColor: string;
  announcement: string;
  whatsAppNumber: string;
};

export type TenantAppearancePayload = AppearanceState & {
  capabilities: AppearanceCapabilities;
};

function buildCapabilities(context: TenantContext): AppearanceCapabilities {
  const canManage = context.isSuperadmin
    || context.membership?.role === "OWNER"
    || context.membership?.role === "ADMIN";

  return {
    canEdit: canManage,
    canPublish: canManage,
    templates: appearanceTemplateCapabilities,
  };
}

function toPublishedThemeConfig(draft: AppearanceDraft): PublishedThemeConfig {
  return {
    storeName: draft.theme.storeName,
    accentColor: draft.theme.accentColor,
    announcement: draft.theme.announcement,
    whatsAppNumber: draft.theme.whatsAppNumber,
  };
}

function mapSectionRows(
  tenantId: string,
  draft: AppearanceDraft,
): Array<Prisma.StoreSectionCreateManyInput> {
  return [
    {
      tenantId,
      type: StoreSectionType.HERO,
      position: 0,
      active: true,
      content: {
        title: draft.sections.hero.title,
        subtitle: draft.sections.hero.subtitle,
        ctaLabel: draft.sections.hero.ctaLabel,
        ctaHref: draft.sections.hero.ctaHref,
        imageUrl: draft.sections.hero.imageUrl,
      },
    },
    {
      tenantId,
      type: StoreSectionType.CATEGORIES,
      position: 1,
      active: draft.sections.categories.enabled,
      content: {
        title: draft.sections.categories.title,
      },
    },
    {
      tenantId,
      type: StoreSectionType.PRODUCT_FEED,
      position: 2,
      active: draft.sections.productFeed.enabled,
      content: {
        title: draft.sections.productFeed.title,
        limit: draft.sections.productFeed.limit,
      },
    },
  ];
}

type AppearanceDb = typeof prisma | Prisma.TransactionClient;

async function readThemeState(
  tenantId: string,
  tenantName: string,
  db: AppearanceDb = prisma,
): Promise<AppearanceState> {
  const [theme, sections] = await Promise.all([
    db.storeTheme.findUnique({
      where: { tenantId },
      select: {
        tenantId: true,
        template: true,
        draftConfig: true,
        publishedConfig: true,
        publishedAt: true,
      },
    }),
    db.storeSection.findMany({
      where: {
        tenantId,
        type: { in: [StoreSectionType.HERO, StoreSectionType.CATEGORIES, StoreSectionType.PRODUCT_FEED] },
      },
      orderBy: { position: "asc" },
      select: {
        type: true,
        position: true,
        active: true,
        content: true,
      },
    }),
  ]);

  const draft = normalizeAppearanceDraft(theme?.draftConfig, {
    storeName: tenantName,
    sections,
  });
  const published = normalizeAppearanceDraft(theme?.publishedConfig ?? theme?.draftConfig, {
    storeName: tenantName,
    sections,
  });

  return {
    draft,
    published,
    publishedAt: theme?.publishedAt ?? null,
  };
}

export async function getTenantAppearance(context: TenantContext): Promise<TenantAppearancePayload> {
  const state = await readThemeState(context.tenantId, context.tenant.name);

  return {
    ...state,
    capabilities: buildCapabilities(context),
  };
}

export async function saveTenantAppearanceDraft(input: {
  context: TenantContext;
  draft: AppearanceDraft;
}): Promise<TenantAppearancePayload> {
  const draft = appearanceDraftSchema.parse(input.draft);
  const current = await readThemeState(input.context.tenantId, input.context.tenant.name);

  await prisma.$transaction(async (transaction) => {
    await transaction.storeTheme.upsert({
      where: { tenantId: input.context.tenantId },
      create: {
        tenantId: input.context.tenantId,
        template: draft.template,
        draftConfig: draft,
        publishedConfig: draft,
      },
      update: {
        template: draft.template,
        draftConfig: draft,
      },
    });
    await transaction.auditLog.create({
      data: {
        tenantId: input.context.tenantId,
        userId: input.context.userId,
        action: "appearance.draft.saved",
        entity: "StoreTheme",
        entityId: input.context.tenantId,
        metadata: { template: draft.template },
      },
    });
  });

  return {
    draft,
    published: current.published,
    publishedAt: current.publishedAt,
    capabilities: buildCapabilities(input.context),
  };
}

export async function publishTenantAppearance(input: {
  context: TenantContext;
}): Promise<TenantAppearancePayload> {
  const published = await prisma.$transaction(async (transaction) => {
    const current = await readThemeState(
      input.context.tenantId,
      input.context.tenant.name,
      transaction,
    );
    const draft = appearanceDraftSchema.parse(current.draft);
    const publishedAt = new Date();
    const sectionRows = mapSectionRows(input.context.tenantId, draft);
    const publishedConfig = toPublishedThemeConfig(draft);

    await transaction.storeTheme.upsert({
      where: { tenantId: input.context.tenantId },
      create: {
        tenantId: input.context.tenantId,
        template: draft.template,
        draftConfig: draft,
        publishedConfig,
        publishedAt,
      },
      update: {
        template: draft.template,
        publishedConfig,
        publishedAt,
      },
    });
    await transaction.storeSection.deleteMany({
      where: {
        tenantId: input.context.tenantId,
        type: {
          in: [
            StoreSectionType.HERO,
            StoreSectionType.CATEGORIES,
            StoreSectionType.PRODUCT_FEED,
          ],
        },
      },
    });
    await transaction.storeSection.createMany({
      data: sectionRows,
    });
    await transaction.auditLog.create({
      data: {
        tenantId: input.context.tenantId,
        userId: input.context.userId,
        action: "appearance.published",
        entity: "StoreTheme",
        entityId: input.context.tenantId,
        metadata: { template: draft.template, publishedAt: publishedAt.toISOString() },
      },
    });

    return { draft, publishedAt };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  return {
    draft: published.draft,
    published: published.draft,
    publishedAt: published.publishedAt,
    capabilities: buildCapabilities(input.context),
  };
}
