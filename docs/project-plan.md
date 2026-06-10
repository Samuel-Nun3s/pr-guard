# PR-Guard — Resumo Completo & Plano de Implementação

> Documento de referência do projeto. Para o detalhamento original (fluxo de webhook, exemplos de código), veja [project-documentation.md](./project-documentation.md).

---

## 1. Visão Geral

**PR-Guard** é um agente que revisa Pull Requests automaticamente. Instalado como **GitHub App** em um repositório, ele reage à abertura/atualização de PRs, analisa o diff com um LLM e posta comentários inline (bugs, segurança, más práticas, performance) mais um resumo geral.

O diferencial sobre um "bot de review" comum:

- **Self-hosted (BYOK):** roda inteiramente na infra do usuário, com a API key de LLM dele. O código analisado nunca sai para um SaaS de terceiro — argumento decisivo para código privado.
- **Knowledge packs:** o usuário ativa, por checkbox, "livros" de conhecimento (Clean Code, Refactoring, etc.) que o agente passa a aplicar como critério de review.
- **Dashboard com pipeline ao vivo:** uma SPA mostra cada etapa do review acontecendo em tempo real.
- **LLM plugável:** o provedor de LLM é uma abstração — Anthropic é a referência, mas a mesma interface suporta outros.

---

## 2. Decisões de Arquitetura

| Tema | Decisão | Motivo |
|---|---|---|
| Backend | NestJS + TypeScript | Já no escopo; modular, testável, bom para filas e webhooks |
| Frontend | **React + Vite (SPA)** | App separado, leve, consome a API do NestJS |
| Estrutura | **Monorepo (pnpm workspaces)** | `apps/api` + `apps/web` + `packages/shared` (tipos compartilhados) |
| Banco | **PostgreSQL + Prisma** | Config, knowledge packs por repo, histórico de reviews e eventos da pipeline |
| Fila | BullMQ + Redis | Processamento assíncrono — webhook responde rápido, review em background |
| LLM | **Plugável + BYOK** | Usuário escolhe provedor/modelo e fornece a própria API key (criptografada) |
| Deploy | **Self-hosted (Docker Compose)** | Privacidade do código; sem multi-tenancy/billing do lado do mantenedor |
| Tempo real | **SSE** | Fluxo unidirecional (servidor → SPA); mais simples que WebSocket |

### Layout do monorepo

```
pr-guard/
├── apps/
│   ├── api/          # NestJS — webhook, fila, agente, REST + SSE
│   └── web/          # React + Vite — dashboard
├── packages/
│   └── shared/       # tipos TS compartilhados (ReviewComment, PipelineEvent, enums)
├── docker-compose.yml
└── docs/
```

---

## 3. Componentes Principais

### 3.1 Ingestão (GitHub → fila)
- `webhook.controller.ts` recebe o evento, valida assinatura **HMAC-SHA256**, persiste um `ReviewRun` e enfileira o job. Responde em <200ms.
- Autenticação como **GitHub App** via Octokit (`@octokit/app`) — instalável por qualquer repo, escopo de permissões correto.

### 3.2 Camada de LLM plugável (BYOK)
- Interface `LlmProvider`:
  ```ts
  interface LlmProvider {
    reviewFile(filename: string, diff: string, packs: string): Promise<FileReview>;
  }
  ```
- Implementação de referência: `AnthropicProvider`, usando:
  - **Structured outputs** (`output_config.format` com JSON schema) → JSON garantido, sem `JSON.parse()` frágil.
  - **Prompt caching** (`cache_control: ephemeral`) no system prompt → os knowledge packs (prefixo estável) são reaproveitados entre todos os arquivos do mesmo PR. Packs concatenados em **ordem determinística** para o cache bater (~90% economia no contexto repetido).
- Config (provedor, modelo, API key) no Postgres. **API key criptografada em repouso** com AES-256-GCM (chave-mestra no `.env`) — nunca em texto puro.

### 3.3 Knowledge packs (os "livros" por checkbox)
- Cada pack é um arquivo markdown versionado: `knowledge/packs/clean-code.md`, `refactoring.md`, `pragmatic-programmer.md`...
- Contém **princípios destilados em instruções acionáveis de review** — não o texto dos livros (direitos autorais + eficiência de tokens).
- Seed do Prisma registra os packs; a tabela `RepoKnowledgePack` mapeia quais estão ativos por repositório. O frontend só liga/desliga.

### 3.4 Pipeline em tempo real
- Cada etapa do worker grava um `ReviewEvent` (etapa, timestamp, payload) e publica no canal de eventos.
- Endpoint SSE `GET /runs/:id/events` faz streaming para a SPA.
- Etapas: `webhook_recebido → enfileirado → diff_carregado → revisando_arquivo (i/n) → comentarios_postados → concluido`.

### 3.5 Custo & uso de tokens
- Toda resposta de LLM expõe `usage` (input, output, cache read/creation). O `AnthropicProvider` (e cada provider) reporta esses números; o agente os acumula por `ReviewRun`.
- `CostCalculator` converte tokens em custo a partir de uma **tabela de preços por modelo** (`ModelPricing`: input/output/cache por MTok). Como é BYOK e preços mudam, a tabela vem de um seed e é **editável pelo usuário** — assim o número reflete o contrato real dele com o provedor.
- Persistimos o usage em granularidade de `ReviewRun` (suficiente para gráficos por período/repo/modelo) e o custo já calculado.

### 3.6 Dashboard (SPA)
- **Repos:** lista de repositórios instalados + status.
- **RunDetail:** pipeline ao vivo de um review (consumindo SSE) + comentários gerados + custo/tokens daquele review.
- **Custos & Uso:** tela com gráficos — custo total no período, tokens (input/output/cache) ao longo do tempo, breakdown por repo e por modelo, custo médio por PR. Endpoint agregador (`GET /usage?from&to&groupBy`) faz as somatórias no backend; o front só renderiza.
- **Settings:** configuração de LLM (provedor/modelo/API key), tabela de preços por modelo e checkboxes de knowledge packs por repo.

---

## 4. Modelo de Dados (Prisma — esboço)

| Modelo | Campos-chave | Papel |
|---|---|---|
| `Repository` | owner, name, installationId | Repo instalado |
| `LlmConfig` | provider, model, encryptedKey | Config BYOK (key cifrada) |
| `KnowledgePack` | slug, title, description | Catálogo de packs (seed) |
| `RepoKnowledgePack` | repositoryId, packId, enabled | Quais packs ativos por repo |
| `ReviewRun` | prNumber, status, model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, costCents, createdAt | Uma execução de review (base dos gráficos de custo/uso) |
| `ReviewEvent` | runId, step, payload, createdAt | Eventos da pipeline (SSE) |
| `ReviewComment` | runId, path, line, severity, body | Comentários gerados |
| `ModelPricing` | provider, model, inputPerMTok, outputPerMTok, cacheReadPerMTok, cacheWritePerMTok | Tabela de preços (seed, editável) para calcular custo |

---

## 5. Plano de Execução

A ordem é deliberada: as Fases 1–2 entregam um produto funcional **end-to-end via API** (testável instalando no próprio repo), antes do dashboard. **Testes automatizados (unit + integração) são escritos junto de cada fase**, não em uma fase separada — veja a Seção 6.

| Fase | Entrega | Conteúdo |
|---|---|---|
| **0 — Fundação** | Esqueleto rodando | Monorepo pnpm; scaffolding NestJS + Vite; `docker-compose` (postgres/redis); schema Prisma inicial; CI rodando lint + build + **testes** |
| **1 — Ingestão** | PR → fila | Webhook controller + validação HMAC; fila BullMQ; auth GitHub App (Octokit); fetch + parse do diff; `ReviewRun` persistido. **Testes:** HMAC validator, diff parser, webhook → fila |
| **2 — Agente** | **Review funcional** | Interface `LlmProvider` + `AnthropicProvider` (structured outputs + caching); `CostCalculator`; formatação e postagem de comentários inline + resumo no PR. **Testes:** provider (API mockada), cost calculator, comment formatter, crypto service |
| **3 — Knowledge packs** | Reviews guiados | 3–4 packs iniciais em markdown; seed; montagem do prompt com packs ativos; suporte ao `.prreview.json` (ignorar arquivos, severidade mínima). **Testes:** montagem de prompt com packs, parser do `.prreview.json` |
| **4 — Dashboard & Custos** | SPA completa | REST API (repos, runs, packs, config LLM); endpoint agregador de uso (`GET /usage`); SSE de eventos; SPA: lista de repos, pipeline ao vivo, **tela de Custos & Uso (gráficos)**, checkboxes de packs, config de LLM/preços. **Testes:** agregação de uso, componentes-chave da SPA |
| **5 — Self-hosted polish** | Pronto para distribuir | Dockerfiles de produção; GitHub App manifest flow no onboarding; re-review em novo commit; docs de instalação; 2º provider de LLM (prova a abstração) |

### Critérios de "pronto" por fase
- **Fase 1:** abrir um PR gera um `ReviewRun` no banco e um job na fila (sem postar nada ainda).
- **Fase 2:** abrir um PR resulta em comentários inline reais no GitHub.
- **Fase 3:** ativar/desativar um pack muda visivelmente o foco dos comentários.
- **Fase 4:** o dashboard mostra a pipeline progredindo em tempo real; a tela de Custos & Uso exibe gráficos com custo/tokens reais dos reviews já executados.
- **Fase 5:** `docker compose up` em uma máquina limpa sobe tudo e o onboarding cria o GitHub App.

---

## 6. Estratégia de Testes

Foco em **testes unitários e de integração** — **E2E fica fora do escopo por enquanto**. Os testes acompanham cada fase (Seção 5), não são uma etapa final.

### Ferramentas
| Workspace | Runner | Notas |
|---|---|---|
| `apps/api` | **Jest** | Padrão do NestJS; `@nestjs/testing` para módulos/DI |
| `apps/web` | **Vitest** | Nativo do Vite; rápido e com a mesma API do Jest |
| `apps/web` (UI) | **React Testing Library** | Componentes-chave (pipeline ao vivo, gráficos de custo) |

### O que cobrir
- **Unitários (lógica pura, alto valor):**
  - `webhook.validator` — assinatura HMAC válida/inválida, `timingSafeEqual`
  - `diff.parser` — diffs multi-arquivo, renomeações, binários
  - `comment.formatter` — mapeamento severidade → comentário do GitHub
  - `crypto.service` — round-trip de cifra/decifra da API key
  - `cost.calculator` — tokens × `ModelPricing` → custo (incl. cache read/write)
  - montagem de prompt com knowledge packs (ordem determinística p/ cache)
- **Integração (com dependências mockadas/test DB):**
  - webhook controller → enfileiramento (GitHub e fila mockados)
  - `review.processor` — fluxo completo com GitHub API e `LlmProvider` mockados
  - camada Prisma — contra um Postgres de teste (Docker)
  - endpoint agregador `GET /usage` — somatórias por período/repo/modelo

### Convenções
- LLM e GitHub **sempre mockados** nos testes (sem chamadas reais / sem gastar tokens).
- Banco de teste isolado via `docker-compose` (mesmo Postgres, schema efêmero).
- CI roda `lint + build + test` em todo push (Fase 0).
- Meta pragmática de cobertura na lógica de domínio (parsers, crypto, cost, prompt), não 100% global.

---

## 7. Considerações de Segurança

- **HMAC-SHA256** em todo webhook (já previsto), com `timingSafeEqual`.
- **API keys criptografadas** em repouso (AES-256-GCM); nunca logadas nem retornadas pela API em texto puro.
- **Self-hosted** elimina a superfície de "código de terceiros em SaaS".
- Permissões mínimas no GitHub App (apenas `pull_requests: read/write`, `contents: read`).

---

## 8. Diferenciais para Portfolio / Entrevistas

- GitHub App + validação HMAC + processamento assíncrono (<200ms de resposta).
- **Strategy pattern** na camada de LLM (BYOK plugável).
- **Structured outputs + prompt caching** — uso avançado da API do LLM.
- **Observabilidade de custo/tokens** — rastreio de gasto por review com dashboard de gráficos (controle de FinOps de LLM).
- **SSE** para pipeline em tempo real.
- **Monorepo** com tipos compartilhados entre back e front.
- **Cobertura de testes** (unit + integração) com mocks de LLM/GitHub e Postgres de teste.
- **Self-hosted + criptografia em repouso** — narrativa forte de privacidade/segurança.
