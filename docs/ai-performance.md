# AI learning and performance audit

Measured on 26 October 2026 with a production build, local PGlite and Google Chrome. Provider responses are simulated; these numbers describe Margin's workflow overhead, not live ChatGPT latency or teaching quality. Tests use temporary libraries and signed test credentials, never the user's account or library.

| Path                                 | Previous implementation                                                      | Implemented behaviour                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Save/open an article                 | Manual analysis; component-local suggestions                                 | Background analysis, persisted by SHA-256 of the article body                           |
| Open a suggestion                    | Another definition request, full source article sent                         | Saved contextual meaning and example; zero inference requests                           |
| Collect a suggestion                 | Definition first, then separate item/highlight saves with full-state reloads | One transactional collection endpoint; updates item, mark and review schedules together |
| Reopen                               | Suggestions lost; analysis could repeat when profile/cache inputs changed    | Persisted suggestions, no model/catalog request or inference                            |
| Concurrent identical generation      | Independent provider requests before cache insertion                         | Shared request with independent cancellation                                            |
| Definition from selected text        | Full article plus selected text                                              | Verified position and at most 600 characters on either side                             |
| Learning history                     | Full saved item records and large answer histories                           | Compact item fields, bounded gaps and recent question prompts                           |
| Learning mutations and AI completion | Full `/api/state` refetch                                                    | Apply returned article/item/annotation/review/set/attempt/settings records directly     |

The browser workflow saved a reading, displayed three verified suggestions, explored one, collected it, marked another known, reopened the reading, marked the last unhelpful and verified collection in the bank:

| Measurement                                                | Observed |
| ---------------------------------------------------------- | -------: |
| Save click → article readable                              |    61 ms |
| Save click → suggestions visible                           | 1,861 ms |
| Suggestion click → meaning visible                         |    17 ms |
| Provider requests for the whole workflow, including reopen |        1 |
| Full-state refetches caused by mutations                   |        0 |

The simulated provider intentionally takes 1,200 ms. Status polling runs every 1,500 ms while analysis is active and stops on success/failure, so display latency includes a polling interval. Reading never waits for analysis. Full page reloads still load the library snapshot once.

A separate generation benchmark, with an already-open local database and 120 ms simulated provider delay, measured 123 ms for three concurrent consumers sharing one request, followed by 1 ms for persistent cache retrieval. The test asserts one provider call, a materially faster cached result and a maximum of two concurrent inferences. Cancelled queued work never reaches the provider.

## Accuracy, persistence and limits

Analysis first interprets the whole article in the same request, then selects language using CEFR level, a bounded selection of collected terms, review aggregates, recent demonstrated gaps and known/unhelpful feedback. The prompt ranks unfamiliarity, everyday usefulness, expressive value and passage relevance. It permits fewer selections or none. Terms and dictionary forms are both considered when filtering saved/known language, including inflections such as “turned a corner” → “turn a corner”. Expressions collected from this reading stay in its Language panel with a Collected state, including after reopening. Collection leaves the current explanation open. The desktop panel scrolls independently with sticky tabs; mobile uses normal page scrolling.

Margin derives UTF-16 highlight offsets from exact, unambiguous source quotations. It drops fabricated quotations, ambiguous repeated uses, fragments inside words, duplicates and overlaps. It rejects an entirely ungrounded nonempty response. Meanings and new examples still depend on the model's semantic judgement; source validation does not prove every interpretation correct.

Analysis uses an article-level database lease and generation uses a shared cache-key request. Completion is conditional on the source body still matching. A body edit starts new analysis; changing metadata or preferences preserves completed work. Existing annotations/questions protect the original source from edits. Collection locks the article and saves the bank entry, annotation and independent review schedules in one transaction, retaining existing notes. Analysis and feedback round-trip in backups; earlier backups remain accepted.

Ordinary failures do not trigger inference retries on reopen. The user can retry deliberately. Stale running leases become recoverable failures, and transient status-transport failures have two bounded retries. Usage-limit errors pause new inference for that account epoch, with a Usage link and explicit resumption; cache hits and saved suggestions stay usable. Restarting the process resets that in-memory usage pause; failed article analyses still remain failed. The OAuth Responses endpoint, model discovery, reasoning preferences, terminal-stream checks and absence of separately billed services are preserved.

Successful generation emits local `metrics` events with total milliseconds, time to first text, actual request bytes, context bytes, output-text bytes and cache status. Analysis persists these metrics in `article_analyses.metrics`; they are available in library exports. No text, credentials or telemetry leave Margin except the necessary OAuth inference request. Failed output never enters the usable analysis/cache.

## Reproduce

```sh
npm run check
npm run test:e2e
npm run test:oauth
npx vitest run tests/ai.test.ts --reporter=verbose --silent=false
```

The browser suite prints the workflow timings and asserts request counts. The OAuth fixture exists only in the test process's `NODE_OPTIONS`; production has no provider override or authentication bypass. Live model latency and semantic quality require a separately chosen real-account session and were not measured here.
