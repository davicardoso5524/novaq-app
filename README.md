# plataforma-multitenant

Fundação do aplicativo multi-tenant da Novaq, isolada dos sites e catálogos existentes.

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
- `npm run verify:foundation` — valida banco, seed, host e isolamento entre tenants

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

Inicie o painel em seguida:

```bash
npm run dev
```

- Painel: `http://localhost:3002/painel`
- Studio de Aparência: `http://localhost:3002/painel/aparencia`
- Host de catálogo usado na verificação: `modabella-demo.localhost:3002`

## Integração com o Novaq site

O app consulta o `novaq-site` para resolver catálogos pelo slug. Configure no `.env`:

```env
PLATFORM_API_URL=http://localhost:3001
PLATFORM_SECRET_KEY=mesma-chave-do-novaq-site
```

O catálogo público de teste fica em `/catalogo/modabella`. O endpoint interno da plataforma também é usado para consultar status e exibir a tela de manutenção quando o catálogo estiver pausado.

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

O verificador cria dois tenants e registros temporários dentro de uma transação que é revertida ao final; assim ele prova o escopo sem deixar dados de teste no banco.
