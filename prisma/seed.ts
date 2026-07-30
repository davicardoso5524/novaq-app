import {
  GlobalRole,
  MembershipRole,
  MembershipStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
  TenantStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { getModaBellaSeed } from "../src/lib/catalog/modabella-seed";
import { getSeedPasswords } from "../src/lib/seed-config";

const prisma = new PrismaClient();

async function main() {
  const passwords = getSeedPasswords(process.env);
  const [superadminPassword, ownerPassword] = await Promise.all([
    hash(passwords.superadmin, 12),
    hash(passwords.owner, 12),
  ]);

  const plan = await prisma.plan.upsert({
    where: { name: "basico" },
    update: { active: true, price: "149.00" },
    create: { name: "basico", price: "149.00" },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "modabella-demo" },
    update: {
      name: "ModaBella Demo",
      status: TenantStatus.ACTIVE,
      subdomain: "modabella-demo",
      planId: plan.id,
      deletedAt: null,
    },
    create: {
      slug: "modabella-demo",
      name: "ModaBella Demo",
      status: TenantStatus.ACTIVE,
      subdomain: "modabella-demo",
      planId: plan.id,
    },
  });

  const superadmin = await prisma.user.upsert({
    where: { email: "admin@novaq.local" },
    update: {
      name: "Novaq Superadmin",
      hashedPassword: superadminPassword,
      role: GlobalRole.SUPERADMIN,
      ativo: true,
    },
    create: {
      name: "Novaq Superadmin",
      email: "admin@novaq.local",
      hashedPassword: superadminPassword,
      role: GlobalRole.SUPERADMIN,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@modabella.local" },
    update: {
      name: "ModaBella Owner",
      hashedPassword: ownerPassword,
      role: GlobalRole.USER,
      ativo: true,
    },
    create: {
      name: "ModaBella Owner",
      email: "owner@modabella.local",
      hashedPassword: ownerPassword,
    },
  });

  await Promise.all([
    prisma.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: superadmin.id } },
      update: { role: MembershipRole.ADMIN, status: MembershipStatus.ACTIVE },
      create: {
        tenantId: tenant.id,
        userId: superadmin.id,
        role: MembershipRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    }),
    prisma.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
      update: { role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE },
      create: {
        tenantId: tenant.id,
        userId: owner.id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    }),
  ]);

  const catalog = getModaBellaSeed();
  const categoriesBySlug = new Map<string, string>();

  for (const category of catalog.categories) {
    const persistedCategory = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: category.slug } },
      update: {
        name: category.name,
        position: category.position,
        active: true,
      },
      create: {
        tenantId: tenant.id,
        name: category.name,
        slug: category.slug,
        position: category.position,
      },
    });

    categoriesBySlug.set(category.slug, persistedCategory.id);
  }

  await prisma.storeTheme.upsert({
    where: { tenantId: tenant.id },
    update: {
      template: catalog.theme.template,
      draftConfig: catalog.theme.draftConfig as Prisma.InputJsonValue,
      publishedConfig: catalog.theme.publishedConfig as Prisma.InputJsonValue,
      publishedAt: new Date("2025-01-01T00:00:00.000Z"),
    },
    create: {
      tenantId: tenant.id,
      template: catalog.theme.template,
      draftConfig: catalog.theme.draftConfig as Prisma.InputJsonValue,
      publishedConfig: catalog.theme.publishedConfig as Prisma.InputJsonValue,
      publishedAt: new Date("2025-01-01T00:00:00.000Z"),
    },
  });

  await Promise.all(
    catalog.sections.map((section) =>
      prisma.storeSection.upsert({
        where: {
          tenantId_type_position: {
            tenantId: tenant.id,
            type: section.type,
            position: section.position,
          },
        },
        update: {
          active: section.active,
          content: section.content as Prisma.InputJsonValue,
        },
        create: {
          tenantId: tenant.id,
          type: section.type,
          position: section.position,
          active: section.active,
          content: section.content as Prisma.InputJsonValue,
        },
      }),
    ),
  );

  for (const product of catalog.products) {
    const categoryId = categoriesBySlug.get(product.categorySlug);

    if (!categoryId) {
      throw new Error(`Missing ModaBella category for product ${product.slug}`);
    }

    const persistedProduct = await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: product.slug } },
      update: {
        categoryId,
        name: product.name,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        status: ProductStatus.PUBLISHED,
        publishedAt: new Date("2025-01-01T00:00:00.000Z"),
        deletedAt: null,
      },
      create: {
        tenantId: tenant.id,
        categoryId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        status: ProductStatus.PUBLISHED,
        publishedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
    });

    await Promise.all(
      product.variants.map((variant) =>
        prisma.productVariant.upsert({
          where: { tenantId_sku: { tenantId: tenant.id, sku: variant.sku } },
          update: {
            productId: persistedProduct.id,
            size: variant.size,
            color: variant.color,
            stock: variant.stock,
            price: variant.price,
            active: true,
          },
          create: {
            tenantId: tenant.id,
            productId: persistedProduct.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            stock: variant.stock,
            price: variant.price,
          },
        }),
      ),
    );

    for (const media of product.media) {
      const mediaAsset = await prisma.mediaAsset.upsert({
        where: { tenantId_storageKey: { tenantId: tenant.id, storageKey: media.storageKey } },
        update: {
          url: media.url,
          fileName: media.fileName,
          mimeType: media.mimeType,
          sizeBytes: BigInt(media.sizeBytes),
          altText: media.altText,
          deletedAt: null,
        },
        create: {
          tenantId: tenant.id,
          storageKey: media.storageKey,
          url: media.url,
          fileName: media.fileName,
          mimeType: media.mimeType,
          sizeBytes: BigInt(media.sizeBytes),
          altText: media.altText,
        },
      });

      await prisma.productMedia.upsert({
        where: {
          tenantId_productId_mediaAssetId: {
            tenantId: tenant.id,
            productId: persistedProduct.id,
            mediaAssetId: mediaAsset.id,
          },
        },
        update: { position: media.position },
        create: {
          tenantId: tenant.id,
          productId: persistedProduct.id,
          mediaAssetId: mediaAsset.id,
          position: media.position,
        },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
