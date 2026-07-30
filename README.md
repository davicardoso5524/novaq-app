# plataforma-multitenant

Scaffold inicial do aplicativo multi-tenant da Novaq.

## O que este pacote entrega

- Next.js 16 com App Router
- React 18 + TypeScript
- Prisma 5
- Auth.js / NextAuth
- bcryptjs, Zod, Tailwind CSS e Vitest

## Scripts

- `npm run dev` — inicia em `http://localhost:3002`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:seed`

## Ambiente

Copie `.env.example` para `.env` e preencha os valores antes de conectar a um banco real.

As senhas de seed presentes no exemplo são exclusivas para desenvolvimento local. Defina valores próprios antes de executar o seed em qualquer ambiente compartilhado.

Para subir o PostgreSQL local:

```bash
docker compose up -d postgres
npm run db:push
npm run db:seed
```
