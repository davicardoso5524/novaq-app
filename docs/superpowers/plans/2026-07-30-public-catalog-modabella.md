# Public Multi-tenant Catalog and ModaBella Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o primeiro catálogo público real do `novaq-app`, resolvido por host, isolado por tenant e renderizado pelo template compartilhado ModaBella.

**Architecture:** O host da requisição resolve o tenant no servidor; um loader público devolve um contrato de dados independente do template; um registry seleciona somente a camada visual. Produtos, categorias, variantes, mídia, tema, seções e eventos ficam no PostgreSQL único com `tenantId` obrigatório e índices compostos. O painel e o catálogo permanecem no mesmo app, mas consultas públicas nunca usam `tenantId` fornecido pelo navegador.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Prisma 5, PostgreSQL 16, Zod, Tailwind CSS, Vitest e Playwright CLI para validação visual.

## Global Constraints

- O site institucional permanece no repositório `Novaq` e não será alterado por este plano.
- O catálogo ModaBella legado é referência funcional e visual, não fonte de persistência.
- Todo modelo de negócio possui `tenantId`; toda leitura pública deriva o tenant do host no servidor.
- Dinheiro usa `Decimal`, timestamps usam `timestamptz` e exclusões de produto são inicialmente lógicas.
- Templates recebem o mesmo `PublicStoreData`; nenhuma regra de preço, estoque, busca, carrinho ou WhatsApp vive dentro do template.
- O banco armazena configuração estruturada, nunca HTML ou JavaScript do cliente.
- Esta fase implementa somente `MODABELLA`; os outros três identificadores ficam reservados, sem templates falsos ou duplicação de código.
- O Studio completo, CRUD administrativo, upload de mídia, pedidos persistidos e migração definitiva ficam em planos separados.

---

## File Map

**Create:**

- `src/lib/catalog/types.ts` — contrato público compartilhado pelos templates.
- `src/lib/catalog/load-public-store.ts` — loader escopado por host.
- `src/lib/catalog/search.ts` — normalização e filtro de busca pública.
- `src/lib/catalog/whatsapp.ts` — mensagem e URL do orçamento.
- `src/lib/templates/registry.tsx` — registry tipado de templates.
- `src/templates/modabella/*` — componentes visuais ModaBella.
- `src/components/storefront/cart-provider.tsx` — estado local compartilhado do carrinho.
- `src/app/produto/[slug]/page.tsx`, `src/app/categorias/[slug]/page.tsx`, `src/app/busca/page.tsx`, `src/app/carrinho/page.tsx` — rotas públicas por host.
- `src/app/api/public/analytics/route.ts` — ingestão limitada de eventos públicos.
- `tests/public-catalog-isolation.test.ts`, `tests/template-registry.test.tsx`, `tests/storefront-search.test.ts`, `tests/whatsapp-cart.test.ts`, `tests/public-analytics.test.ts`.

**Modify:**

- `prisma/schema.prisma` — catálogo e aparência multi-tenant.
- `prisma/seed.ts` — dados públicos ModaBella idempotentes.
- `src/app/page.tsx` — catálogo em host de tenant e diagnóstico no host da plataforma.
- `src/app/layout.tsx`, `src/app/globals.css` — metadados e tokens públicos.
- `scripts/verify-foundation.ts` — conferir catálogo seed e isolamento real.
- `README.md` — execução e hosts públicos.

---

### Task 1: Schema de catálogo, tema e seed ModaBella

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`
- Create: `tests/catalog-seed-config.test.ts`

**Interfaces:**
- Produces: `Category`, `Product`, `ProductVariant`, `ProductMedia`, `StoreTheme`, `StoreSection`, `PageView` e enums `ProductStatus`, `TemplateKey`, `StoreSectionType`.

- [ ] **Step 1: Escrever teste de configuração do seed**

Testar uma função pura `getModaBellaSeed()` que retorna template `MODABELLA`, WhatsApp normalizado, ao menos duas categorias e produtos com slugs únicos, preços positivos e mídia com alt text.

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `npm test -- --run tests/catalog-seed-config.test.ts`

Expected: FAIL porque `src/lib/catalog/modabella-seed.ts` ainda não existe.

- [ ] **Step 3: Modelar catálogo com chaves compostas por tenant**

Adicionar:

```prisma
enum ProductStatus { DRAFT PUBLISHED ARCHIVED }
enum TemplateKey { MODABELLA TEMPLATE_02 TEMPLATE_03 TEMPLATE_04 }
enum StoreSectionType { HERO CATEGORIES PRODUCT_FEED PROMOTIONS TESTIMONIALS }

model Category {
  id String @id @default(cuid())
  tenantId String
  name String
  slug String
  position Int @default(0)
  active Boolean @default(true)
  createdAt DateTime @default(now()) @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @db.Timestamptz(3)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  products Product[]
  @@unique([tenantId, slug])
  @@unique([id, tenantId])
  @@index([tenantId, active, position])
  @@map("categories")
}
```

`Product` usa `Decimal(12,2)`, `@@unique([tenantId, slug])`, publicação/soft delete e índices `[tenantId,status,publishedAt]`, `[tenantId,categoryId,status]`. `ProductVariant` mantém SKU, tamanho, cor, estoque e preço opcional. `ProductMedia` referencia produto e `MediaAsset` usando pares compostos com o mesmo `tenantId`. `StoreTheme` é único por tenant e guarda `draftConfig`, `publishedConfig`, `publishedAt`; `StoreSection` guarda tipo, posição, ativo e conteúdo JSON. `PageView` inclui tenant, evento, path, productId opcional, termo e timestamps.

- [ ] **Step 4: Implementar seed idempotente**

Criar `src/lib/catalog/modabella-seed.ts` com dados estruturados e fazer `prisma/seed.ts` executar upserts por `[tenantId, slug]`, publicar tema ModaBella, seções e produtos somente no tenant `modabella-demo`.

- [ ] **Step 5: Aplicar e verificar no PostgreSQL**

Run: `npx prisma format && npx prisma validate && npm run db:push && npm run db:seed && npm run db:seed`

Expected: schema válido e segunda execução sem duplicações.

- [ ] **Step 6: Commit**

```bash
git add prisma src/lib/catalog/modabella-seed.ts tests/catalog-seed-config.test.ts
git commit -m "feat: add tenant catalog schema and modabella seed"
```

### Task 2: Contrato público e isolamento por host

**Files:**
- Create: `src/lib/catalog/types.ts`, `src/lib/catalog/load-public-store.ts`
- Test: `tests/public-catalog-isolation.test.ts`

**Interfaces:**
- Produces: `loadPublicStore(host: string): Promise<PublicStoreData | null>`.
- Produces: `PublicStoreData = { tenant; theme; sections; categories; products; settings }` sem campos administrativos.

- [ ] **Step 1: Escrever testes de isolamento**

Cobrir host ModaBella, host desconhecido, tenant pausado, produto rascunho, produto de outro tenant e produto com `publishedAt` futuro. Confirmar que o loader nunca recebe `tenantId` como argumento.

- [ ] **Step 2: Rodar testes e confirmar falha**

Run: `npm test -- --run tests/public-catalog-isolation.test.ts`

Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implementar DTOs explícitos**

Definir DTOs serializáveis com dinheiro em string decimal, imagens com `url` e `altText`, variantes públicas sem custo interno e settings limitados a nome, WhatsApp e textos públicos.

- [ ] **Step 4: Implementar loader**

Resolver tenant com `resolveTenantFromHost(host)`, carregar somente tema publicado, seções ativas, categorias ativas e produtos `PUBLISHED`, não excluídos e já publicados. Toda consulta combina `tenantFilter(context)` ou `tenantId` obtido exclusivamente do tenant resolvido.

- [ ] **Step 5: Rodar testes**

Run: `npm test -- --run tests/public-catalog-isolation.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/catalog tests/public-catalog-isolation.test.ts
git commit -m "feat: add host-scoped public catalog contract"
```

### Task 3: Registry compartilhado e home ModaBella

**Files:**
- Create: `src/lib/templates/registry.tsx`, `src/templates/modabella/modabella-store.tsx`, `src/templates/modabella/components/*`
- Create: `src/components/storefront/cart-provider.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`
- Test: `tests/template-registry.test.tsx`

**Interfaces:**
- Consumes: `PublicStoreData`.
- Produces: `renderStoreTemplate(data: PublicStoreData): ReactNode`.

- [ ] **Step 1: Escrever teste do registry**

Confirmar que `MODABELLA` renderiza nome, hero, categorias e produtos do DTO; identificadores ainda indisponíveis lançam `TemplateUnavailableError`; trocar template não altera o objeto de catálogo.

- [ ] **Step 2: Confirmar falha**

Run: `npm test -- --run tests/template-registry.test.tsx`

Expected: FAIL por registry ausente.

- [ ] **Step 3: Implementar registry sem regra de negócio**

```tsx
const templates: Partial<Record<TemplateKey, ComponentType<{ data: PublicStoreData }>>> = {
  MODABELLA: ModaBellaStore,
};
```

O registry seleciona componente; preços, disponibilidade e filtros já chegam resolvidos pelo contrato.

- [ ] **Step 4: Migrar a composição ModaBella**

Recriar cabeçalho, busca, hero, categorias, produtos em destaque, feed e rodapé a partir do app legado. Copiar somente assets necessários com origem conhecida. Usar links reais para `/produto/:slug`, `/categorias/:slug`, `/busca` e `/carrinho`.

- [ ] **Step 5: Integrar a home por host**

`src/app/page.tsx` usa `headers()` para obter host. Se houver tenant, chama `loadPublicStore` e o registry; no host da plataforma mantém a página diagnóstica do app.

- [ ] **Step 6: Validar UI**

Run: `npm test -- --run tests/template-registry.test.tsx && npm run typecheck && npm run lint && npm run build`

Verificar por navegador 1440, 1024, 768, 390 e 320 px, navegação por teclado, foco, contraste, overflow e estados vazios.

- [ ] **Step 7: Commit**

```bash
git add src/app src/components/storefront src/lib/templates src/templates tests/template-registry.test.tsx
git commit -m "feat: add shared template registry and modabella home"
```

### Task 4: Busca, categoria e detalhe de produto

**Files:**
- Create: `src/lib/catalog/search.ts`
- Create: `src/app/busca/page.tsx`, `src/app/categorias/[slug]/page.tsx`, `src/app/produto/[slug]/page.tsx`
- Test: `tests/storefront-search.test.ts`

**Interfaces:**
- Produces: `normalizeSearchTerm(value: string): string` e `searchPublicProducts(data, term)`.

- [ ] **Step 1: Escrever testes**

Cobrir acentos, caixa, espaços, termo vazio, produto de outro tenant ausente, categoria inexistente e slug de produto inexistente.

- [ ] **Step 2: Confirmar falha**

Run: `npm test -- --run tests/storefront-search.test.ts`

Expected: FAIL por helper ausente.

- [ ] **Step 3: Implementar busca e rotas**

Cada rota resolve novamente o host, usa somente o DTO público do tenant e chama `notFound()` para slugs que não pertencem ao catálogo resolvido. O detalhe mostra galeria, preço, variantes disponíveis, estoque e ação de carrinho.

- [ ] **Step 4: Validar**

Run: `npm test -- --run tests/storefront-search.test.ts && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalog/search.ts src/app/busca src/app/categorias src/app/produto tests/storefront-search.test.ts
git commit -m "feat: add public catalog discovery routes"
```

### Task 5: Carrinho local e orçamento por WhatsApp

**Files:**
- Create: `src/lib/catalog/whatsapp.ts`, `src/components/storefront/cart-provider.tsx`, `src/app/carrinho/page.tsx`
- Test: `tests/whatsapp-cart.test.ts`

**Interfaces:**
- Produces: `buildWhatsAppQuote(input: WhatsAppQuoteInput): { message: string; url: string }`.
- Produces: `CartItem = { productId; slug; name; unitPrice; quantity; variantId?; variantLabel? }`.

- [ ] **Step 1: Escrever testes de cálculo e mensagem**

Cobrir quantidade mínima, soma decimal em centavos, variante, caracteres especiais, telefone brasileiro normalizado e carrinho vazio.

- [ ] **Step 2: Confirmar falha**

Run: `npm test -- --run tests/whatsapp-cart.test.ts`

Expected: FAIL por helper ausente.

- [ ] **Step 3: Implementar estado compartilhado**

Persistir somente itens públicos em `localStorage` com chave que inclua o slug do tenant; validar o payload ao restaurar e nunca confiar no preço armazenado para persistência futura.

- [ ] **Step 4: Implementar orçamento**

Gerar mensagem determinística com loja, produtos, variantes, quantidades, total e URL pública. Abrir `https://wa.me/<telefone>?text=<mensagem codificada>` por link nativo.

- [ ] **Step 5: Validar**

Run: `npm test -- --run tests/whatsapp-cart.test.ts && npm run typecheck && npm run lint`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/catalog/whatsapp.ts src/components/storefront/cart-provider.tsx src/app/carrinho tests/whatsapp-cart.test.ts
git commit -m "feat: add tenant cart and whatsapp quote"
```

### Task 6: Analytics público e verificação final

**Files:**
- Create: `src/app/api/public/analytics/route.ts`, `src/lib/validation/public-analytics.ts`
- Test: `tests/public-analytics.test.ts`
- Modify: `scripts/verify-foundation.ts`, `README.md`

**Interfaces:**
- Produces: `POST /api/public/analytics` com `{ event, path, productSlug?, searchTerm? }`; tenant vem do host.

- [ ] **Step 1: Escrever testes da API**

Cobrir host desconhecido `404`, payload inválido `422`, evento permitido `201`, produto alheio ignorado/rejeitado e ausência de dados pessoais crus.

- [ ] **Step 2: Confirmar falha**

Run: `npm test -- --run tests/public-analytics.test.ts`

Expected: FAIL por rota ausente.

- [ ] **Step 3: Implementar ingestão mínima**

Aceitar somente `PAGE_VIEW`, `PRODUCT_VIEW`, `SEARCH`, `ADD_TO_CART`, `WHATSAPP_CLICK`; limitar path e termo; resolver tenant por host; validar product slug dentro do tenant; não armazenar IP ou corpo arbitrário.

- [ ] **Step 4: Ampliar verificador**

Conferir tema publicado, ao menos uma categoria/produto ModaBella, DTO público sem rascunhos e duas consultas de produtos em tenants temporários dentro da transação revertida.

- [ ] **Step 5: Rodar bateria final**

Run: `npm test -- --run && npm run typecheck && npm run lint && npm run build && npm run verify:foundation`

Expected: todos os testes, build e verificador PostgreSQL aprovados.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/public src/lib/validation tests/public-analytics.test.ts scripts/verify-foundation.ts README.md
git commit -m "test: verify public multitenant catalog"
```

## Próximos planos

1. CRUD administrativo de categorias, produtos, variantes, estoque e mídia.
2. Studio de Aparência com rascunho, preview, publicação e troca de template.
3. Pedidos/orçamentos persistidos, clientes, cupons e notificações.
4. Templates 02, 03 e 04 usando `PublicStoreData` sem alterar o domínio.
5. Migração dos dados e mídia legados, storage, observabilidade e rollout.

## Self-review

- O plano cobre host, contrato único, schema, ModaBella, busca, detalhe, carrinho, WhatsApp e analytics.
- Studio, CRUD admin e os demais templates foram separados porque são subsistemas testáveis independentes.
- Todas as interfaces usam os mesmos nomes entre tarefas e nenhuma etapa aceita `tenantId` público.
- Não há placeholders; cada tarefa possui teste vermelho, implementação, validação e commit.
