# Margin

A local English learning space built with Next.js, React, TypeScript, and PostgreSQL. Add your own readings, collect language in context, and practise with your ChatGPT account.

## Run on your Mac

Requires Node.js **22.12 or newer** and npm. Dependencies and fonts are already included in this checkout's setup; for a fresh clone:

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:3000**. Margin binds to loopback. `localhost` redirects to `127.0.0.1` so OAuth cookies and callbacks use one host.

For the production build:

```sh
npm run build
npm start
```

Run **one instance** against a local PGlite directory at a time. Stop development before starting production. To use another port, run `npm run dev -- --port 3001` or `npm start -- --port 3001`. The OAuth callback uses that port automatically. If `MARGIN_ORIGIN` is configured, update it to match. A legacy `http://localhost:<port>` setting is accepted as an alias, but all emitted URLs use `http://127.0.0.1:<port>`. Other hosts, schemes, credentials, URL paths, and mismatched ports are rejected.

## Connect ChatGPT

Open **Settings → Continue with ChatGPT**. Authorise Margin and grant permission to use your ChatGPT plan. The browser returns to `http://127.0.0.1:<port>/auth/callback`. Margin dynamically registers its public OAuth client; no client secret or API key is required.

The integration follows the official [registration guide](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [account/session guide](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions), and [model/inference guide](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference):

- Stable host ID; fresh state, nonce, and PKCE for each browser-bound sign-in attempt.
- Issued client IDs retained per verified account and reused for reconnection. Multiple account registrations stay separate.
- ID-token signature, issuer, audience, expiry, and nonce are validated with OpenAI's JWKS.
- Rotating refresh tokens are refreshed serially and replaced atomically.
- Model choices come from `GET https://api.openai.com/v1/models` using the selected account. Visible catalog order is retained, with the first available model as the default.
- Inference uses only `POST https://api.openai.com/v1/responses`, with OAuth bearer authentication, `store: false`, and `stream: true`. No ChatGPT internal endpoints or API-key billing fallback exist.
- Only `response.completed` finishes a request successfully. Interrupted streams, incomplete responses, usage limits, and late stream errors are handled separately. No automatic repeated inference or paid fallback occurs.

Account eligibility, serving-region restrictions, rollout availability, and limits are controlled by OpenAI. See [current limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations). In [ChatGPT Settings → Usage](https://chatgpt.com/settings/usage), keep extra credit use **disabled** if you want subscription-only use; Margin cannot override that account setting. Usage-limit errors pause the affected request and expose recovery links.

**Live account verification:** OAuth security, model selection, and Responses behavior have automated tests using local signed tokens and simulated streams. A real browser authorisation and a live inference must be completed using your own ChatGPT account; no account credentials were used during development.

### Redirect recovery

If sign-in previously sent you to `localhost`, open `http://127.0.0.1:<port>/?view=settings`. A successful authorization may already have saved your account before the old post-login redirect failed. Reconnect only if Settings still needs it. Restart the server after configuration changes, and begin a fresh sign-in if an in-progress transaction expired during the restart.

The canonical origin comes from the validated `Host` header (and optional `MARGIN_ORIGIN` port constraint), never Next.js's normalized request origin or forwarded headers. It is used for authorization, the exact code-exchange URI, host-only cookies, and both success and error redirects. Proxy alias requests are internally rewritten to `/auth/canonical`, which emits an absolute redirect while preserving the path and query; this avoids Next.js relativizing a proxy redirect against the server's bound IP. Callback validation additionally checks the pending transaction's original port.

Settings → Your tutor provides independent **Everyday reasoning** (Light / API `low`) and **Advanced reasoning** (Medium) preferences. Definitions and daily discoveries use Everyday; comprehension, writing evaluation, article analysis, mixed practice, and advanced grammar use Advanced. Available efforts come from the connected account’s model catalog; unsupported or unverified settings block requests with a clear error. The request sends `reasoning.effort`, and AI cache keys include the selected reasoning configuration. Old preferences acquire the defaults automatically.

## A connected learning workflow

1. **Readings:** paste an article or passage; optional author and source URL. No reading material is preloaded. Articles remain plain text, which preserves exact source positions and avoids running pasted HTML.
2. **Notice language:** saving or opening an unanalyzed article starts analysis in the background. Selective, personalised suggestions appear as dotted teal underlines; your saved highlights remain peach. Open a suggestion for its contextual meaning and one example, or collect it immediately. Mark suggestions **Already known** or **Unhelpful** to guide future selection. You can also select text yourself and choose **Explore** or **Highlight**. Collected expressions retain source context; highlights support editable notes.
3. **Between the lines:** generate questions beneath the original reading. Choose difficulty, type, and count; generate more without repeating existing questions. Questions and evaluations must contain exact source evidence before saving.
4. **Language bank:** search meanings, terms, notes, or collocations; add manually or with AI. Explore usage, register, collocations, related expressions, and source context. Browser speech synthesis can pronounce expressions.
5. **Practice:** generate grammar, vocabulary, comprehension, sentence, writing, and word-choice tasks. Saved language, recent mistakes, previous questions, and skill performance inform new sets. Open tasks are evaluated with explanations and improved answers; unfinished sessions resume.
6. **Review:** recognition uses honest self-rating; production asks for your own sentence and AI feedback. The schedules are independent. A failed recall returns after 10 minutes; successful reviews expand intervals up to a year. This is a transparent, SM-2-inspired scheduler, not FSRS.
7. **Today:** generate an idiom, related discoveries, and a short writing prompt. Outputs persist for the selected local day. Previously saved language and recent readings are surfaced without fabricated activity.
8. **Progress:** real activity, answer quality by skill, recorded misunderstandings, and independent recognition/production retention. Seven-day review intervals are a practice signal, not a fluency claim.

Use **⌘K** (Ctrl+K on other platforms) to find readings and expressions. Reading controls change type size; Settings offers daylight/after-hours themes. Anonymous Pro, Literata, and Inter are self-hosted with their OFL licenses.

The **fixed grammar curriculum is intentionally empty**. `curriculum_units` establishes a versioned integration point; no curriculum has been generated or seeded. On-demand grammar practice works independently.

## Storage and recovery

By default, persistent PGlite PostgreSQL lives in `.margin/data/`. There is no separate database service to install.

```text
.margin/
  data/                 # PostgreSQL data; one server process at a time
  private/accounts.json # Owner-only OAuth credentials and host identity
  backups/              # Automatic snapshots made before imports
```

The private directory uses mode `0700`; credential files use `0600`, atomic replacement, and fsync. Tokens never enter browser storage or learning backups. `.margin/` and `.env*` are ignored by Git. The app has no telemetry, external font requests, or third-party browser scripts. The local app trusts the owner of this Mac; it is not a multi-user internet service.

Use **Settings → Export library** regularly. The portable JSON export contains every learning table, settings, useful AI caches, its format version, export time, and a SHA-256 checksum. It excludes credentials. Export is read in a database transaction.

**Import backup** accepts files up to 250 MB and validates the checksum, schema, record uniqueness, and source references before changing any data. Choose **Merge** to add records and update matching IDs, or **Replace** to restore the exact exported library (requires typing `REPLACE`). Both create an automatic pre-import snapshot and apply data in one transaction. A failed import rolls back. Conflicting expression IDs from another library are rejected during Merge; export your current library and use Replace if that is the desired restore.

To recover a pre-import state, import a JSON file from `.margin/backups/` with Replace. Your ChatGPT connection remains separate. To move to another Mac, export/import learning data and sign in again there so the new host receives its own identity. Avoid copying a live PGlite directory; use JSON export or stop the server first.

### Optional Neon / PostgreSQL

Copy `.env.example` to `.env.local` and set:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

Margin uses the same SQL schema through `pg` against PostgreSQL, including Neon. TLS follows the connection string; do not disable certificate validation. **Export your local library before switching**, restart with `DATABASE_URL`, then import the backup into the empty remote database. Data is not moved automatically. ChatGPT credentials still remain local. This adapter has not been tested against a live Neon account.

Optional environment variables:

- `MARGIN_DATA_DIR`: absolute directory for local storage, credentials, and snapshots.
- `MARGIN_ORIGIN`: exact loopback origin, e.g. `http://127.0.0.1:3000`; adds host enforcement.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:oauth
```

The browser test launches an isolated production server on port 3007 and uses installed Google Chrome. Test content lives in a temporary database, never your library. Install Chrome or change the Playwright project channel if needed. It checks adding/reading/highlighting/annotating, collection, independent review states, saved preferences, export/import, disconnected-AI recovery, keyboard search, and mobile navigation.

The dedicated OAuth browser suite runs the production app on ports 3008 and 3009 with isolated temporary libraries. It executes the real proxy, start/callback routes, code exchange, JWT verification, cookies, persistence, and post-login UI, replacing only the external provider boundary with signed test credentials. Its provider verifies the exact redirect URI and PKCE challenge. It covers success, denial, token exchange failures, bad nonce/state, missing cookies, callback replay, localhost aliases, start failures, and a legacy localhost origin configuration. It also exercises automatic analysis on creation/opening, exact article marks, immediate exploration, collection, feedback, reopening, failed inference, deliberate retry and content edits against a simulated Responses stream. The server-side provider fixture is loaded only through the test process’s `NODE_OPTIONS`; no production auth bypass or configurable provider endpoint exists. These deterministic tests do not substitute for authorizing your real ChatGPT account.

Unit and integration tests cover OAuth security with genuinely signed local test tokens, terminal stream handling, grounding validation, transaction rollback, deduplication, independent scheduling, and backup corruption/referential checks. The repository contains no seeded learning records or test authentication bypass.

### AI failure diagnostics

Responses failures preserve the provider’s code, original message, parameter, request ID, and response ID. Margin handles documented flat `error` events and `response.failed` response errors, plus nested error envelopes from the transport. The error panel shows actionable guidance, the code and request ID; **Provider details** reveals the original provider message when it differs from that guidance.

Streaming can open with HTTP 200 and fail later. `transportStatus` retains that actual HTTP status; `providerStatus` is present only when the provider supplies an error status. The error payload’s `status` is Margin’s application error status, which may be 502 when no provider error status exists. Margin does not invent a provider HTTP 503 based on an event code.

The server console emits structured `margin.ai.failure` records containing only a diagnostic ID, action, bounded error identifiers, status fields, and provider request/response IDs. It never logs provider messages, request/response bodies, article text, headers, OAuth tokens, credentials, or stack traces. A local diagnostic reference is shown when no provider request ID is available. Failed or interrupted results do not become lessons or AI cache entries. Retries remain deliberate user actions; there is no automatic inference retry or billing fallback.

## Architecture

- `src/app/api`: Node.js backend with bounded input validation and same-origin/loopback enforcement.
- `src/lib/auth.ts`: protected credential vault, OAuth lifecycle, account-specific catalogs, provider errors.
- `src/lib/ai.ts`: streamed Responses client, level-aware tutoring tasks, JSON and evidence validation, persistent caching.
- `src/lib/article-analysis.ts`: background analysis leases, source grounding, compact learner profiles, feedback and transactional collection.
- `src/lib/ai-runtime.ts`: shared generation, independent cancellation, two-request inference queue and usage-limit pause.
- `src/lib/client-state.ts`: targeted updates after learning actions, without full-library refetches.
- `src/lib/db.ts`: PGlite/`pg` adapter and versioned initial SQL migration.
- `src/lib/store.ts`, `scheduler.ts`, `backup.ts`: learning persistence, independent review schedules, transactional backups.
- `src/components`: shared task-focused UI. `DESIGN.md` and `PRODUCT.md` record product and design decisions.

AI results are validated for shape, source quotations, exercise counts, option consistency, and valid saved-item references. Semantic accuracy still benefits from human judgement. Invalid or incomplete generated output is not saved as a usable lesson; useful validated output is cached to reduce repeated requests.

Article analysis and feedback are included in portable backups; earlier version-1 backups remain importable. Completed analysis is keyed to the exact article body, so title, progress, profile and model changes do not spend another request on the same reading. New analysis uses the current learner profile. Failed requests stay paused until a deliberate retry; interrupted jobs have an expiring lease. Completed suggestions remain available without a ChatGPT connection. Definitions default to one short meaning and one example; **Explain more** requests a separately cached, optional explanation. Existing saved explanations are preserved.

See [the AI performance audit](docs/ai-performance.md) for measured workflows, cache behaviour and reproduction commands.
