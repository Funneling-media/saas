# `src/domain`

The pure domain layer for Podcasting.gg. Import from `@/domain` or `@/domain/<module>`.

## What belongs here

- Vocabularies (`vocab.ts`): `as const` tuples, union types, Zod enums, human labels and empty-state hints.
- Business rules: state machines (episodes, guests, opportunities), scoring (guest fit, launch readiness), milestone evaluation, task prioritization and Mission Control ranking.
- Zod schemas for structured AI output and user input (`OpportunityExtractionSchema`, `TaskInputSchema`).

## Rules

1. **Pure.** No React, no Supabase, no network, no filesystem, no `Date.now()` hidden inside logic. Functions that depend on time take `now` as a parameter.
2. **Tested.** Every module ships a `*.test.ts` next to it. Boundary cases are tests, not comments.
3. **Vocab mirrors SQL enums exactly.** The tuples in `vocab.ts` must match the Postgres enum values and order. Changing one requires a migration for the other.
4. **Transparent numbers.** Scores and percents must be explainable from their inputs (breakdowns, criteria lists, missing items). No opaque blended score.
5. **Configurable, not hardcoded.** Milestones, completion requirements, fit-score weights and readiness checks are config arrays that callers can override.
6. **Typed transitions.** Status changes go through `transitionX(from, to)` which returns `{ ok, status } | { ok, reason }`; UI never mutates status strings directly.
