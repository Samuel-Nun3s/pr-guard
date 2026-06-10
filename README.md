# PR-Guard

> Automated PR code review agent — self-hosted, pluggable LLM, real-time dashboard.

PR-Guard is a GitHub App that reviews Pull Requests automatically. When a PR is opened or updated, it analyzes the diff with an LLM and posts inline comments — flagging bugs, security issues, bad practices and performance problems — plus an overall summary.

---

## Features

- **Inline review comments** — pinned to the exact diff line, with `ERROR / WARNING / SUGGESTION` severity labels
- **Knowledge packs** — activate curated review guidelines (Clean Code, Refactoring, Pragmatic Programmer, Design Patterns) per repository via dashboard checkboxes
- **Pluggable LLM (BYOK)** — bring your own API key; supports Anthropic Claude and OpenAI GPT. The Strategy pattern makes adding new providers trivial
- **Prompt caching** — knowledge packs are loaded into the system prompt with `cache_control: ephemeral` and concatenated in deterministic order, reusing the prefix across all files in the same PR (~90% token savings on repeated context)
- **Structured outputs** — uses `output_config.format` with JSON schema, guaranteeing valid output without fragile `JSON.parse` on free-form text
- **Live pipeline dashboard** — Server-Sent Events stream each review step to the SPA in real time (queued → diff loaded → reviewing file N/M → completed)
- **Cost & token tracking** — every review records input/output/cache tokens and cost in cents. Dashboard charts show cost over time, by model and by repository
- **`.prreview.json`** — per-repo config file to ignore files (glob patterns) and set a minimum severity threshold
- **Re-review on new commit** — handles `pull_request.synchronize` events automatically
- **Self-hosted** — runs entirely on your infrastructure via Docker Compose. Analyzed code never leaves your environment. LLM API keys are encrypted at rest (AES-256-GCM)

---

## Architecture

```
┌─ Monorepo (npm workspaces) ──────────────────────────────────┐
│  apps/api        → NestJS (webhook, queue, agent, REST/SSE)  │
│  apps/web        → React + Vite SPA (dashboard)              │
│  packages/shared → shared TypeScript types                    │
└──────────────────────────────────────────────────────────────┘

[PR opened / new commit pushed on GitHub]
         ↓
[Webhook → NestJS — validates HMAC-SHA256 signature]
  - Persists ReviewRun (Postgres)
  - Publishes job to BullMQ (Redis)
  - Responds in <200ms
         ↓
[Queue Worker — BullMQ]
  1. Fetch PR diff via Octokit (GitHub App auth)
  2. Load active knowledge packs for repo (Postgres → markdown files)
  3. Fetch .prreview.json config (ignore patterns, min severity)
  4. Build system prompt (packs in deterministic order + cache_control)
  5. Call LlmProvider per file (structured outputs + prompt caching)
  6. Filter comments by severity threshold
  7. Post inline review + summary to GitHub API
  8. Store token usage, calculate cost, update ReviewRun
  → Publish ReviewEvent at each step (live pipeline via EventBus → SSE)
         ↓
[GitHub PR — inline review comments]   [SPA — live pipeline + cost data]
```

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/Samuel-Nun3s/pr-guard.git
cd pr-guard
cp .env.example .env
```

Fill in `.env`:

```env
# Generate a 32-byte hex key: openssl rand -hex 32
ENCRYPTION_KEY=<64-char-hex>

# From your GitHub App settings
GITHUB_APP_ID=<your-app-id>
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET=<your-webhook-secret>
```

### 2. Create a GitHub App

Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App** and configure:

| Field | Value |
|---|---|
| Homepage URL | `http://localhost` |
| Webhook URL | Your public URL + `/api/webhook/github` (use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or [Smee.io](https://smee.io) for local dev) |
| Webhook secret | Same value as `GITHUB_WEBHOOK_SECRET` |
| Permissions | `Pull requests: Read & Write`, `Contents: Read` |
| Subscribe to events | `Pull request` |

Download the private key and paste it (with `\n` line breaks) into `GITHUB_APP_PRIVATE_KEY`.

### 3. Start

```bash
docker compose up -d
```

Open **http://localhost** — the dashboard is ready.

### 4. Configure your LLM

Go to **Settings → LLM Configuration**, select your provider (Anthropic or OpenAI), enter your API key, and save. The key is encrypted with AES-256-GCM before storage.

### 5. Install the GitHub App on a repository

Go to your GitHub App settings → **Install App** and select the repositories to monitor. PR-Guard will start reviewing PRs automatically.

---

## Development Setup

```bash
# Install dependencies
npm install

# Start infrastructure (Postgres + Redis only)
docker compose -f docker-compose.dev.yml up -d

# Copy and fill in env vars
cp .env.example .env

# Run database migrations and seed
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api

# Start API and web in parallel
npm run dev
```

- API: http://localhost:3000
- Dashboard: http://localhost:5173 (Vite proxies `/api` to the NestJS server)

---

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript |
| Queue | BullMQ + Redis |
| Database | PostgreSQL + Prisma |
| LLM | Pluggable (BYOK) — Anthropic Claude & OpenAI GPT |
| Frontend | React + Vite + Recharts |
| Real-time | Server-Sent Events (SSE) |
| Deploy | Docker Compose (self-hosted) |
| Tests | Jest (API) · Vitest + React Testing Library (web) |

---

## Knowledge Packs

Packs live in [`knowledge/packs/`](knowledge/packs/) as plain markdown files with actionable review instructions distilled from engineering books. They are NOT the books themselves — just the principles, phrased as review criteria.

| Pack | Based on |
|---|---|
| `clean-code` | *Clean Code* — Robert C. Martin |
| `refactoring` | *Refactoring* — Martin Fowler |
| `pragmatic-programmer` | *The Pragmatic Programmer* — Hunt & Thomas |
| `design-patterns` | *Design Patterns* (GoF) + SOLID principles |

Enable them per repository in **Settings → Knowledge Packs**.

---

## `.prreview.json`

Add this file to the root of any repository to customize the review:

```json
{
  "ignoreFiles": ["*.test.ts", "**/__tests__/**", "docs/**"],
  "minSeverity": "warning"
}
```

| Field | Default | Description |
|---|---|---|
| `ignoreFiles` | `[]` | Glob patterns for files to skip |
| `minSeverity` | `"suggestion"` | Minimum severity to post (`"suggestion"`, `"warning"`, `"error"`) |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/webhook/github` | GitHub webhook receiver |
| `GET` | `/api/repos` | Installed repositories with latest run |
| `GET` | `/api/repos/:id/runs` | Run history for a repository |
| `GET` | `/api/runs` | All recent runs |
| `GET` | `/api/runs/:id` | Run detail with comments and events |
| `GET` | `/api/runs/:id/events` | SSE stream for live pipeline |
| `GET` | `/api/usage` | Token and cost aggregation (`?groupBy=day\|repo\|model&from=&to=`) |
| `GET` | `/api/config/llm` | Current LLM config (key masked) |
| `POST` | `/api/config/llm` | Save/update LLM config (encrypts key) |
| `GET` | `/api/config/packs` | All knowledge packs |
| `GET` | `/api/config/repos/:id/packs` | Packs with enabled status for a repo |
| `PUT` | `/api/config/repos/:id/packs/:packId` | Toggle a pack |
| `GET` | `/api/config/pricing` | Model pricing table |
| `PUT` | `/api/config/pricing/:id` | Update pricing entry |

---

## Testing

```bash
# API unit + integration tests (Jest)
npm test --workspace=apps/api

# SPA component tests (Vitest + RTL)
npm test --workspace=apps/web

# All tests
npm test
```

Test conventions:
- LLM and GitHub API are **always mocked** — no real calls, no token spend
- Prisma layer tested against a real Postgres instance (Docker)
- CI runs lint + build + test on every push

---

## Security

- **HMAC-SHA256** webhook validation with `timingSafeEqual` (timing-safe comparison)
- **AES-256-GCM** encryption for LLM API keys at rest — keys are never logged or returned in plaintext
- **Minimum GitHub App permissions** — only `pull_requests: read/write` and `contents: read`
- **Self-hosted** — your code never reaches a third-party SaaS

---

## Technical Highlights (for interviews)

- **GitHub App** (not OAuth) — correct permission scope, installable per repo
- **Async processing** — webhook responds in <200ms; review runs in background via BullMQ
- **Strategy pattern** — `LlmProvider` interface decouples the agent from any specific LLM. Adding a new provider requires one class and one line in the factory
- **Structured outputs** — `output_config.format` with JSON schema guarantees valid output, eliminating a whole class of parsing errors
- **Prompt caching** — knowledge packs in system prompt with `cache_control: ephemeral`; deterministic pack ordering ensures cache prefix matches across all files in the same PR
- **SSE + EventBus** — in-memory RxJS Subject per run merges historical events (Postgres) with live stream so the dashboard works for both in-progress and completed runs
- **Cost/token observability** — every review records granular token usage and computes cost from a user-editable pricing table (essential for BYOK — users pay their own LLM bills)
- **Self-hosted + AES-256-GCM** — strong privacy story for teams that can't send code to third-party SaaS

---

## License

MIT
