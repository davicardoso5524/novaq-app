import { GlobalRole, TenantStatus } from "@prisma/client";
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

      await Promise.all([
        transaction.auditLog.create({
          data: { tenantId: tenantA.id, action: "verify.a", entity: "Verification" },
        }),
        transaction.auditLog.create({
          data: { tenantId: tenantB.id, action: "verify.b", entity: "Verification" },
        }),
      ]);

      const context = (tenant: typeof tenantA) => ({
        tenantId: tenant.id,
        tenant,
        userId: "verification-superadmin",
        membership: null,
        isSuperadmin: true,
      });
      const [recordsA, recordsB] = await Promise.all([
        transaction.auditLog.findMany({ where: tenantFilter(context(tenantA)) }),
        transaction.auditLog.findMany({ where: tenantFilter(context(tenantB)) }),
      ]);

      assert(recordsA.length === 1 && recordsA[0].action === "verify.a", "Tenant A recebeu dados cruzados.");
      assert(recordsB.length === 1 && recordsB[0].action === "verify.b", "Tenant B recebeu dados cruzados.");
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
  const resolved = await resolveTenantFromHost(`${tenant.subdomain}.${baseDomain}:3002`);
  assert(resolved?.id === tenant.id, "Resolução do subdomínio seed falhou.");
  console.log("✓ Resolução de tenant por host conferida");

  await verifyIsolationTransaction();
  console.log("✓ Consultas de dois tenants permaneceram isoladas e foram revertidas");
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
