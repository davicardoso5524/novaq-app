import { TenantStatus, type Tenant } from "@prisma/client";
import { prisma } from "../prisma";

function normalizeHost(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);
    return url.hostname.replace(/\.$/, "");
  } catch {
    return "";
  }
}

export async function resolveTenantFromHost(host: string): Promise<Tenant | null> {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return null;

  const baseDomain = normalizeHost(
    process.env.PLATFORM_CATALOG_BASE_DOMAIN ?? "localhost",
  );
  const suffix = baseDomain ? `.${baseDomain}` : "";
  const subdomain =
    suffix && normalizedHost.endsWith(suffix)
      ? normalizedHost.slice(0, -suffix.length)
      : null;
  const hostFilter = subdomain
    ? { subdomain }
    : { publicDomain: normalizedHost };

  return prisma.tenant.findFirst({
    where: {
      deletedAt: null,
      status: TenantStatus.ACTIVE,
      ...hostFilter,
    },
  });
}
