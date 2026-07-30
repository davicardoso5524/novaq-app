# Novaq App

Aplicativo multi-tenant da Novaq para administrar e publicar catálogos usando uma única base PostgreSQL com isolamento por tenant.

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
- `npm run verify:foundation` — valida banco, seed, catálogo público e isolamento entre tenants

## Ambiente

Copie `.env.example` para `.env` e preencha os valores antes de conectar a um banco real.

As senhas de seed presentes no exemplo são exclusivas para desenvolvimento local. Defina valores próprios antes de executar o seed em qualquer ambiente compartilhado.

## Instalação local

O Next.js 16 deste primeiro recorte usa React 18; por isso a instalação local precisa respeitar a resolução de peers registrada no lockfile:

```bash
npm install --legacy-peer-deps
```

Suba o PostgreSQL 16, aplique o schema e execute o seed:

```bash
docker compose up -d postgres
npm run db:generate
npm run db:push
npm run db:seed
npm run verify:foundation
```

Inicie o aplicativo em seguida:

```bash
npm run dev
```

- Painel: `http://localhost:3002/painel`
- Studio de Aparência: `http://localhost:3002/painel/aparencia`
- Catálogo público ModaBella: `http://modabella-demo.localhost:3002`

O host identifica o tenant do catálogo. Para testar outro tenant local, use o subdomínio cadastrado antes de `.localhost:3002`; o cliente não envia nem escolhe um `tenantId` público.

## Contas locais do seed

- Superadmin: `admin@novaq.local` / valor de `SEED_SUPERADMIN_PASSWORD`
- Owner ModaBella: `owner@modabella.local` / valor de `SEED_OWNER_PASSWORD`

Os fallbacks do `.env.example` são somente para desenvolvimento local. Não os reutilize em ambiente compartilhado.

## Validação completa

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run verify:foundation
```

O verificador confirma o tema publicado, as categorias e os produtos do seed ModaBella, confere que o DTO público não contém rascunhos e consulta produtos de dois tenants temporários. Toda a prova de isolamento acontece em uma transação revertida, sem deixar dados de teste no banco.
