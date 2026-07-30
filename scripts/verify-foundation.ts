import { GlobalRole, ProductStatus, TenantStatus } from "@prisma/client";
import { loadPublicStore } from "../src/lib/catalog/load-public-store";
import { prisma } from "../src/lib/prisma";
import { resolveTenantFromHost } from "../src/lib/tenant/resolve";
import { tenantFilter } from "../src/lib/tenant/scoped-repository";

class VerificationRollback extends Error {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function verifyIsolationTransaction() {
  let isolationVerified = false;
  const suffix = `${process.pid}-${Date.now()}`;

  try {
    await prisma.$transaction(async (transaction) => {
      const [tenantA, tenantB] = await Promise.all([
        transaction.tenant.create({
          data: {
            name: "Verification A",
            slug: `verification-a-${suffix}`,
            subdomain: `verification-a-${suffix}`,
            status: TenantStatus.ACTIVE,
          },
        }),
        transaction.tenant.create({
          data: {
            name: "Verification B",
            slug: `verification-b-${suffix}`,
            subdomain: `verification-b-${suffix}`,
            status: TenantStatus.ACTIVE,
          },
        }),
      ]);

      const [categoryA, categoryB] = await Promise.all([
        transaction.category.create({
          data: { tenantId: tenantA.id, name: "Categoria A", slug: "categoria-a" },
        }),
        transaction.category.create({
          data: { tenantId: tenantB.id, name: "Categoria B", slug: "categoria-b" },
        }),
      ]);

      await Promise.all([
        transaction.product.create({
          data: {
            tenantId: tenantA.id,
            categoryId: categoryA.id,
            name: "Produto A",
            slug: "produto-a",
            price: "10.00",
            status: ProductStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        }),
        transaction.product.create({
          data: {
            tenantId: tenantB.id,
            categoryId: categoryB.id,
            name: "Produto B",
            slug: "produto-b",
            price: "20.00",
            status: ProductStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        }),
      ]);

      const context = (tenant: typeof tenantA) => ({
        tenantId: tenant.id,
        tenant,
        userId: "verification-superadmin",
        membership: null,
        isSuperadmin: true,
      });
      const [productsA, productsB] = await Promise.all([
        transaction.product.findMany({
          where: tenantFilter(context(tenantA)),
          select: { slug: true },
        }),
        transaction.product.findMany({
          where: tenantFilter(context(tenantB)),
          select: { slug: true },
        }),
      ]);

      assert(
        productsA.length === 1 && productsA[0].slug === "produto-a",
        "Tenant A recebeu produtos cruzados.",
      );
      assert(
        productsB.length === 1 && productsB[0].slug === "produto-b",
        "Tenant B recebeu produtos cruzados.",
      );
      isolationVerified = true;
      throw new VerificationRollback();
    });
  } catch (error) {
    if (!(error instanceof VerificationRollback)) throw error;
  }

  assert(isolationVerified, "A verificação transacional de isolamento não foi concluída.");
}

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log("✓ PostgreSQL conectado");

  const tenant = await prisma.tenant.findUnique({ where: { slug: "modabella-demo" } });
  assert(tenant?.status === TenantStatus.ACTIVE && !tenant.deletedAt, "Tenant seed ativo não encontrado.");
  console.log("✓ Tenant ModaBella seed encontrado");

  const [superadmin, owner] = await Promise.all([
    prisma.user.findUnique({ where: { email: "admin@novaq.local" } }),
    prisma.user.findUnique({
      where: { email: "owner@modabella.local" },
      include: { memberships: { where: { tenantId: tenant.id } } },
    }),
  ]);
  assert(superadmin?.role === GlobalRole.SUPERADMIN && superadmin.ativo, "Superadmin seed inválido.");
  assert(owner?.ativo && owner.memberships.length === 1, "Owner seed ou membership inválida.");
  console.log("✓ Superadmin, owner e membership conferidos");

  const baseDomain = process.env.PLATFORM_CATALOG_BASE_DOMAIN ?? "localhost";
  const demoHost = `${tenant.subdomain}.${baseDomain}:3002`;
  const resolved = await resolveTenantFromHost(demoHost);
  assert(resolved?.id === tenant.id, "Resolução do subdomínio seed falhou.");
  console.log("✓ Resolução de tenant por host conferida");

  const [theme, categoryCount, productRecords, publicStore] = await Promise.all([
    prisma.storeTheme.findFirst({
      where: { tenantId: tenant.id, publishedAt: { not: null, lte: new Date() } },
      select: { template: true, publishedAt: true },
    }),
    prisma.category.count({ where: { tenantId: tenant.id, active: true } }),
    prisma.product.findMany({
      where: { tenantId: tenant.id },
      select: {
        slug: true,
        status: true,
        deletedAt: true,
        publishedAt: true,
        category: { select: { active: true } },
      },
    }),
    loadPublicStore(demoHost),
  ]);

  assert(theme?.template === "MODABELLA" && theme.publishedAt, "Tema ModaBella publicado não encontrado.");
  assert(categoryCount > 0, "Categoria ModaBella ativa não encontrada.");
  assert(publicStore?.theme?.template === "MODABELLA", "DTO público ModaBella não foi carregado.");
  assert(publicStore.categories.length > 0 && publicStore.products.length > 0, "DTO público sem catálogo.");
  const verificationTime = new Date();
  assert(
    publicStore.products.every((publicProduct) =>
      productRecords.some(
        (record) =>
          record.slug === publicProduct.slug &&
          record.status === ProductStatus.PUBLISHED &&
          !record.deletedAt &&
          record.publishedAt !== null &&
          record.publishedAt <= verificationTime &&
          record.category.active,
      ),
    ),
    "DTO público contém produto em rascunho ou indisponível.",
  );
  const serializedPublicStore = JSON.stringify(publicStore);
  assert(
    !serializedPublicStore.includes("draftConfig") &&
      !serializedPublicStore.includes("publishedConfig"),
    "DTO público expôs configuração administrativa.",
  );
  console.log("✓ Tema, catálogo ModaBella e DTO público sem rascunhos conferidos");

  await verifyIsolationTransaction();
  console.log("✓ Produtos de dois tenants permaneceram isolados e foram revertidos");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Fundação multi-tenant verificada com sucesso.");
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
