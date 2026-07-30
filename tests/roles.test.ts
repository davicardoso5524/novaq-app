import { GlobalRole, MembershipRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canAccessPlatform,
  canAuthenticateUser,
  canEditCatalog,
  canManageTenant,
  canViewTenant,
} from "../src/lib/auth/roles";

describe("role capabilities", () => {
  it("allows only superadmins into platform-wide administration", () => {
    expect(canAccessPlatform(GlobalRole.SUPERADMIN)).toBe(true);
    expect(canAccessPlatform(GlobalRole.USER)).toBe(false);
  });

  it("allows owners and admins to manage a tenant", () => {
    expect(canManageTenant(MembershipRole.OWNER)).toBe(true);
    expect(canManageTenant(MembershipRole.ADMIN)).toBe(true);
    expect(canManageTenant(MembershipRole.EDITOR)).toBe(false);
    expect(canManageTenant(MembershipRole.VIEWER)).toBe(false);
  });

  it("allows editors to edit catalog and appearance", () => {
    expect(canEditCatalog(MembershipRole.OWNER)).toBe(true);
    expect(canEditCatalog(MembershipRole.ADMIN)).toBe(true);
    expect(canEditCatalog(MembershipRole.EDITOR)).toBe(true);
    expect(canEditCatalog(MembershipRole.VIEWER)).toBe(false);
  });

  it("lets every active membership role view its tenant", () => {
    Object.values(MembershipRole).forEach((role) => {
      expect(canViewTenant(role)).toBe(true);
    });
  });

  it("does not authenticate inactive users", () => {
    expect(canAuthenticateUser({ ativo: true })).toBe(true);
    expect(canAuthenticateUser({ ativo: false })).toBe(false);
  });
});
