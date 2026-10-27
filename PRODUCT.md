# Margin

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

User-specified Next.js, React, TypeScript, PostgreSQL. Local PGlite first, optional Neon. Runs locally on a Mac mini.

## Users

One person improving their English through their own reading and deliberate practice.

## Product Purpose

An enjoyable personal tutor that connects reading, collecting language, comprehension, practice, and long-term retention.

## Operating Context

Personal, locally hosted application. Reading material is supplied by the user. AI generates learning content on demand and useful outputs are cached. Recognition and natural production are tracked separately.

## Capabilities and Constraints

Official Sign in with ChatGPT, OAuth-based Responses API, account-specific model discovery. No paid API keys or fallback billing. Persistent PostgreSQL, export/import backups. No preloaded articles. Fixed grammar curriculum must remain empty; infrastructure only.

## Brand Commitments

Name: Margin. The user-supplied [design.md](design.md) is the visual source of truth. Use a white editorial canvas, near-black ink, restrained blue accents, Plus Jakarta Sans for headings and interface text, and JetBrains Mono for annotations and data. Fine rules, meaningful view indexes, restrained controls, and task-focused layouts connect the screens. Apply only the components needed for reading, collecting, practising, reviewing, and settings. Keep light and dark themes, responsive layouts, readable text, keyboard access, and reduced motion consistent with this system.

## Evidence on Hand

User-supplied screenshots. No articles, testimonials, statistics, or learning records exist initially.

## Product Principles

- Reading and practice form one continuous learning loop.
- Explain mistakes in context.
- Keep credentials on the backend.
- Persist useful work and make recovery straightforward.
