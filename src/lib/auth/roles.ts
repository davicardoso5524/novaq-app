import { GlobalRole, MembershipRole } from "@prisma/client";

export function canAccessPlatform(role: GlobalRole): boolean {
  return role === GlobalRole.SUPERADMIN;
}

export function canManageTenant(role: MembershipRole): boolean {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}

export function canEditCatalog(role: MembershipRole): boolean {
  return canManageTenant(role) || role === MembershipRole.EDITOR;
}

export function canViewTenant(role: MembershipRole): boolean {
  return Object.values(MembershipRole).includes(role);
}

export function canAuthenticateUser(user: { ativo: boolean }): boolean {
  return user.ativo;
}
