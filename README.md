# trove

agent that pulls a freelancer's form 26as, computes the unclaimed tds, and hands back a ready-to-file itr-1.

## why

most indian gig workers leave ₹15k–40k of tds with the tax department every year because filing on their own is too hard and a ca costs more than the refund. v1 doesn't file for them — it gets them to a one-click-away state.

## stack

next.js 16, go on cloudflare containers, workers, workflows, durable objects, postgres on neon, gemini via cloudflare ai gateway.

## layout

- `web` — next.js frontend
- `workers/bff` — edge bff
- `workers/orchestrator` — workflows + durable objects for long-running cases
- `workers/setu-mock` — fake setu api over real https for development
- `services/backend` — go service: parsing, agent analysis, itr-1 drafting, audit
- `services/backend/migrations` — postgres schema

## dev

copy `.env.example` to `.env` and fill in what you have. anything blank degrades gracefully — no gemini key means the agent uses a deterministic summary; no postgres means the audit log fails silently.

```
bun install
```

then in four shells:

```
cd workers/setu-mock     && bun run dev    # :8788
cd workers/orchestrator  && bun run dev    # :8787-orchestrator
cd workers/bff           && bun run dev    # :8787-bff
cd services/backend      && go run ./cmd/server   # :8787 (set PORT to move it)
cd web                   && bun run dev    # :3000
```

(or `bun --filter='*' dev` from the root if you want them parallel in one terminal.)

## the loop

a case is a cloudflare workflow with four real steps and a pause:

```
pull 26as  →  parse  →  analyse (gemini)  →  awaiting-approval  →  draft itr-1
```

the orchestrator updates a per-case durable object at every step boundary. the browser polls `/api/cases/:id` to render the timeline. when the user clicks approve, the bff posts `/api/cases/:id/approve`, which sends the `user-approval` event to the paused workflow and it resumes.

## deploy

1. neon — create a project, copy the connection string into `NEON_DATABASE_URL`, run `psql $NEON_DATABASE_URL -f services/backend/migrations/0001_init.sql`
2. cloudflare ai gateway — create a gateway, pass `gemini-2.5-flash` requests through it, copy the gateway url into `GEMINI_GATEWAY_URL` and your google ai studio key into `GEMINI_API_KEY`
3. backend — `cd services/backend && docker build -t trove-backend .`, push to wherever (cloudflare containers, fly, render). expose `:8787`. set `NEON_DATABASE_URL` + `GEMINI_*` env vars.
4. workers — `cd workers/setu-mock && bun run deploy`, same for `orchestrator` and `bff`. set the orchestrator's `BACKEND_URL` var to your deployed backend's url.
5. web — `cd web && vercel --prod`. set `AUTH_*` env vars and point the bff fetcher at your bff worker.
