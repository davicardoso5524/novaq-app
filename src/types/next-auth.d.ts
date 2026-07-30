import type { GlobalRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: GlobalRole;
      ativo: boolean;
    };
  }

  interface User {
    role: GlobalRole;
    ativo: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: GlobalRole;
    ativo: boolean;
  }
}
