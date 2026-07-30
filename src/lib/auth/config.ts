import { compare } from "bcryptjs";
import { GlobalRole } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "../prisma";
import { canAuthenticateUser } from "./roles";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function isGlobalRole(value: unknown): value is GlobalRole {
  return Object.values(GlobalRole).includes(value as GlobalRole);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !canAuthenticateUser(user)) return null;

        const passwordMatches = await compare(
          parsed.data.password,
          user.hashedPassword,
        );
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          ativo: user.ativo,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.ativo = user.ativo;
      }
      return token;
    },
    session({ session, token }) {
      if (
        typeof token.id !== "string" ||
        !isGlobalRole(token.role) ||
        typeof token.ativo !== "boolean"
      ) {
        throw new Error("Sessão inválida.");
      }
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.ativo = token.ativo;
      return session;
    },
  },
});
