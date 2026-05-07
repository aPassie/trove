# trove

agent that pulls a freelancer's form 26as, computes the unclaimed tds, and hands back a ready-to-file itr-1.

## why

most indian gig workers leave ₹15k–40k of tds with the tax department every year because filing on their own is too hard and a ca costs more than the refund. v1 doesn't file for them — it gets them to a one-click-away state.

## stack

next.js 16, go on cloudflare containers, workers, workflows, durable objects, postgres on neon.

## layout

- `web` — next.js frontend
- `workers/bff` — edge bff
- `workers/orchestrator` — workflows + durable objects for long-running cases
- `workers/setu-mock` — fake setu api over real https for development
- `services/backend` — go service: parsing, agent analysis, itr-1 drafting, audit
- `services/backend/migrations` — postgres schema

## dev

```
bun install
bun dev
```
