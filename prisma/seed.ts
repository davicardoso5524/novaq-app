import { GlobalRole, MembershipRole, MembershipStatus, PrismaClient, TenantStatus } from "@prisma/client";
import { hash } from "bcryptjs";
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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
