type SeedEnvironment = Record<string, string | undefined>;

export function getSeedPasswords(environment: SeedEnvironment) {
  return {
    superadmin: environment.SEED_SUPERADMIN_PASSWORD || "admin123456",
    owner: environment.SEED_OWNER_PASSWORD || "owner123456",
  };
}
