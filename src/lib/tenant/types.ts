import type { Membership, MembershipRole, Tenant } from "@prisma/client";

export type TenantRole = MembershipRole;

export type TenantContext = {
  tenantId: string;
  tenant: Tenant;
  userId: string;
  membership: Membership | null;
  isSuperadmin: boolean;
};

export type TenantAccessErrorCode =
  | "TENANT_NOT_FOUND"
  | "USER_UNAUTHORIZED"
  | "TENANT_FORBIDDEN"
  | "TENANT_ROLE_FORBIDDEN"
  | "INVALID_TENANT_CONTEXT";

export class TenantAccessError extends Error {
  constructor(
    public readonly code: TenantAccessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TenantAccessError";
  }
}
