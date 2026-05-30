# trove

Trove is an intelligent tax recovery engine built to reclaim excess Tax Deducted at Source (TDS) for Indian freelancers. 

Every year, millions of self-employed gig workers leave ₹15,000–40,000 of hard-earned income with the tax department because filing manually is confusing and hiring a Chartered Accountant (CA) costs more than the refund itself. 

Trove connects directly to tax gateways, parses complex unstructured withholding ledgers, runs agentic compliance analysis to isolate unclaimed refunds, and drafts a ready-to-file, schema-validated ITR-1 tax return.


---


## Architectural Case Study & Learnings

Building Trove was a deep dive into edge compute, serverless transactions, and zero-trust data sandboxing. Here are the core architectural patterns and "Aha!" learning moments that shaped the platform:


### 1. Zero-Trust Client-Side Parsing

We wanted to ensure that sensitive user PII (like PAN cards and tax statement files) never hits our servers unencrypted. 

*   **The Design**: We moved the initial parsing and sanitization to run inside the client's browser sandbox. The frontend processes the document locally, hashes it for deduplication, and redacts PII before sending it downstream.

*   **The Learning**: Client-side sandboxing is not just a privacy win—it also strips the heavy memory load of parsing complex files off our servers, allowing our core services to remain lightweight, highly scalable, and cost-free.


<br />


### 2. State Machine via Cloudflare Workflows & Durable Objects

Tax recovery is a multi-step, asynchronous transaction that can span days (pulling, parsing, auditing, and awaiting manual approval). Maintaining a traditional database polling loop or job queue is both fragile and complex.

*   **The Design**: We modeled the case lifecycle as an event-driven Cloudflare Workflow backed by a per-case Durable Object (`CaseState`). When the agent completes the tax analysis, the workflow halts and suspends its own state using serverless event hooks (`step.waitForEvent`).

*   **The Learning**: Durable Objects act as a localized, extremely low-latency single source of truth at the edge. Since Next.js polls the DO directly to render the real-time timeline, we avoid hammering our relational Postgres database while a scan is running. The workflow sits suspended in memory, consuming zero active compute resources while waiting for the user's secure approval signature.


<br />


### 3. High-Concurrency Go Engine

We needed a service that could handle strict schema validation, heavy numerical computation, and instant JSON compilation of tax returns.

*   **The Design**: We built the core ledger compiler in Go, backed by a serverless Neon Postgres store.

*   **The Learning**: Go's memory efficiency, strict typing, and execution speed made it the perfect choice for the tax return compiler. The Go engine handles standard ITR-1 compilation in single-digit milliseconds, complementing the low-latency edge architecture beautifully.


<br />


```text
Next.js UI  ──>  Cloudflare BFF  ──>  Serverless Workflow [Durable DO]  ──>  Go Ingestion Engine
```


---


## Run

Launch the workspaces concurrently:

```bash
bun run dev                                # frontend & edge workers
cd services/backend && go run ./cmd/server # Go backend engine
```
