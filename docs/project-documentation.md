# Projeto 2 — GitHub PR Review Agent
**Agente que revisa Pull Requests automaticamente com comentários inline**

## O que é
GitHub App que monitora repositórios. Quando um PR é aberto ou atualizado, o agente analisa o diff do código e posta comentários inline — apontando bugs potenciais, más práticas, problemas de segurança e melhorias de performance.

**Uso real:** instalar no próprio repositório dos projetos do portfolio. O agente vira uma ferramenta de uso diário, não só demo.

---

## Arquitetura

```
┌─ Monorepo (pnpm workspaces) ──────────────────────────────┐
│  apps/api        → NestJS (webhook, fila, agente, REST/SSE)│
│  apps/web        → React + Vite SPA (dashboard)            │
│  packages/shared → tipos: ReviewComment, PipelineEvent...  │
└────────────────────────────────────────────────────────────┘

[PR aberto/atualizado no GitHub]
         ↓
[Webhook → NestJS endpoint]
  - Valida assinatura (HMAC-SHA256)
  - Persiste ReviewRun (Postgres) + publica na fila
         ↓
[Queue Worker — BullMQ/Redis]
  1. Busca o diff completo via GitHub API (Octokit)
  2. Carrega knowledge packs ativos do repo (Postgres)
  3. Monta prompt (packs em ordem fixa + prompt caching)
  4. Chama LlmProvider (BYOK — provedor/modelo/key do usuário)
  5. LLM retorna comentários (structured outputs, JSON validado)
  → grava ReviewEvent a cada etapa (pipeline em tempo real)
         ↓
[GitHub API — Post Comments]            [SSE → SPA: pipeline ao vivo]
  - Comentários inline (linha exata)
  - Resumo geral como comentário principal
         ↓
[PR com review do agente]
```

> **Self-hosted:** todo o fluxo roda na infra do usuário (Docker Compose). O código analisado nunca sai para um SaaS de terceiro — a API key do LLM é do próprio usuário (BYOK).

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| GitHub App | Octokit (@octokit/app) |
| Fila | BullMQ + Redis |
| LLM | Plugável (BYOK) — usuário escolhe provedor/modelo e fornece a própria API key. Anthropic Claude como referência (`claude-opus-4-8` / `claude-sonnet-4-6`) |
| Frontend | React + Vite (SPA) — dashboard com pipeline ao vivo e seleção de knowledge packs |
| Banco | PostgreSQL + Prisma (config, knowledge packs por repo, histórico de reviews) |
| Deploy | **Self-hosted** via Docker Compose (api, web, postgres, redis). O código nunca sai da infra do usuário |
| Config | Smee.io ou Cloudflare Tunnel (proxy para URL pública em desenvolvimento local) |

---

## Estrutura de Módulos (NestJS)

```
apps/api/src/
├── github/
│   ├── github.module.ts
│   ├── webhook.controller.ts      # recebe eventos do GitHub
│   ├── webhook.validator.ts       # valida assinatura HMAC
│   ├── github-api.service.ts      # wrapper do Octokit
│   └── diff.parser.ts             # parseia o diff em estrutura usável
│
├── review/
│   ├── review.module.ts
│   ├── review.processor.ts        # worker da fila — orquestra o review
│   ├── review.agent.ts            # monta prompt e chama o LlmProvider
│   ├── comment.formatter.ts       # formata os comentários para o GitHub
│   └── events.publisher.ts        # grava ReviewEvent (pipeline em tempo real)
│
├── llm/                           # camada plugável (BYOK)
│   ├── llm-provider.interface.ts  # reviewFile(diff, ctx, packs): FileReview
│   ├── anthropic.provider.ts      # implementação de referência
│   └── crypto.service.ts          # cifra/decifra API keys (AES-256-GCM)
│
├── knowledge/
│   ├── knowledge.service.ts       # carrega packs ativos por repo
│   └── packs/                     # *.md — princípios destilados de livros
│
├── dashboard/                     # API consumida pela SPA
│   ├── repos.controller.ts
│   ├── runs.controller.ts         # inclui GET /runs/:id/events (SSE)
│   └── config.controller.ts       # LLM config + seleção de packs
│
├── queue/
│   └── pr-review.queue.ts
└── prisma/
    └── schema.prisma              # Repository, LlmConfig, KnowledgePack,
                                   # RepoKnowledgePack, ReviewRun, ReviewEvent,
                                   # ReviewComment

apps/web/src/                      # React + Vite SPA
├── pages/  (Repos, RunDetail, Settings)
└── features/pipeline/             # view da pipeline ao vivo (SSE)
```

---

## Fluxo de Código Principal

### 1. Validação do webhook
```typescript
// webhook.validator.ts
validateSignature(payload: Buffer, signature: string): boolean {
  const hmac = createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
```

### 2. Prompt de review para o LLM (structured outputs + prompt caching)

Em vez de pedir "retorne SOMENTE um JSON" e fazer `JSON.parse()` (frágil), usamos **structured outputs** (`output_config.format`), que garante JSON válido conforme o schema. Os **knowledge packs** ativos vão no system prompt com `cache_control` para reaproveitamento entre arquivos do mesmo PR.

```typescript
// review.agent.ts — implementação de referência do LlmProvider para Anthropic
async reviewFile(filename: string, diff: string, packs: string): Promise<FileReview> {
  const response = await this.claude.messages.create({
    model: this.config.model,            // ex.: 'claude-opus-4-8' (BYOK)
    max_tokens: 4096,
    // System prompt = persona + knowledge packs. cache_control reaproveita
    // o prefixo em todos os arquivos do mesmo PR (~90% de economia de tokens).
    // Packs concatenados em ordem determinística para o cache bater.
    system: [{
      type: 'text',
      text: `Você é um code reviewer sênior.\n\n${packs}`,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{
      role: 'user',
      content: `Arquivo: ${filename}\n\nDiff:\n${diff}`,
    }],
    // Structured outputs: a API garante este shape — sem JSON.parse manual.
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            comments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  line: { type: 'integer' },
                  severity: { type: 'string', enum: ['error', 'warning', 'suggestion'] },
                  body: { type: 'string' },
                },
                required: ['line', 'severity', 'body'],
                additionalProperties: false,
              },
            },
            summary: { type: 'string' },
          },
          required: ['comments', 'summary'],
          additionalProperties: false,
        },
      },
    },
  });

  const text = response.content.find(b => b.type === 'text')!.text;
  return JSON.parse(text); // JSON já validado pelo schema
}
```

> O método faz parte da interface `LlmProvider` — outros provedores (OpenAI, Gemini, modelos locais) implementam a mesma assinatura. A seleção de provedor/modelo e a API key vêm da config do usuário (criptografada no banco).

### 3. Postagem de comentários inline
```typescript
// github-api.service.ts
async postReviewComments(owner: string, repo: string, pullNumber: number, comments: ReviewComment[]) {
  await this.octokit.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    event: 'COMMENT',
    comments: comments.map(c => ({
      path: c.filename,
      line: c.line,
      body: `**[${c.severity.toUpperCase()}]** ${c.body}`,
    })),
  });
}
```

---

## Features para o Portfolio

- [ ] Review automático ao abrir PR
- [ ] Comentários inline na linha exata do problema
- [ ] Severidades: error, warning, suggestion
- [ ] Resumo geral do PR como comentário principal
- [ ] Suporte a múltiplos repositórios
- [ ] Arquivo `.prreview.json` no repo para configurar regras (ignorar arquivos, focar em segurança, etc.)
- [ ] Re-review ao receber novo commit no PR
- [ ] **Dashboard (SPA) com pipeline de review em tempo real (SSE)**
- [ ] **Knowledge packs ativáveis por checkbox** — princípios de livros (Clean Code, Refactoring, etc.) que o agente aplica no review
- [ ] **LLM plugável (BYOK)** — usuário escolhe provedor/modelo e fornece a própria API key (criptografada)
- [ ] **Rastreio de custo e tokens** — tela com gráficos de gasto e uso por período, repo e modelo
- [ ] **Testes automatizados** (unit + integração) com mocks de LLM/GitHub
- [ ] **Deploy self-hosted** via Docker Compose — código nunca sai da infra do usuário

---

## Diferencial Técnico para Mencionar em Entrevistas
- **GitHub App vs OAuth App** — escopo de permissões correto, instalável por qualquer repo
- **Validação HMAC** — segurança no recebimento de webhooks
- **Processamento assíncrono** — webhook responde em <200ms, review em background
- **Comentários inline** — não só um comentário geral, linha a linha
- **Arquitetura plugável (Strategy pattern)** — interface `LlmProvider` desacopla o agente do provedor de LLM (BYOK)
- **Structured outputs + prompt caching** — JSON garantido por schema e reaproveitamento de prefixo entre arquivos (~90% economia de tokens)
- **Streaming de eventos (SSE)** — pipeline de review em tempo real no dashboard
- **Self-hosted / privacidade** — código analisado nunca sai da infra do cliente; segredos criptografados em repouso (AES-256-GCM)