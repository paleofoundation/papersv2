# docx-style-family-compositor

DOCX-only compositor that infers a style family from 3–5 exemplar DOCX files and generates `OUTPUT.docx` by editing OpenXML in-place on a medoid skeleton.

## Non-negotiables implemented
- DOCX only (no `.pages`, no placeholder mail-merge).
- OpenXML package processing (`word/document.xml`, headers/footers, tables, paragraph clusters).
- Skeleton preservation with in-place edits (no HTML reconstruction).
- Citation post-process for `[1]`, `[2–4]`, `(1,2)` as superscript + family color token.
- `audit.json` with inference/mapping/constraint decisions.

## Monorepo
- `packages/engine`: inference + generation core + CLI.
- `packages/shared`: zod schemas.
- `apps/worker`: stateless HTTP wrapper (added after CLI path).
- `apps/web`: minimal upload UI (added after CLI path).
- `scripts/make-fixtures.ts`: runtime DOCX fixture generator for tests.

## Why no DOCX binaries in git
Repository ignores binary document fixtures to keep PR diffs text-only:
- `*.docx`, `*.pages`, `*.pdf`, `*.zip`, `/local-fixtures/`

## Run CLI first
```bash
pnpm install
pnpm fixtures:make
pnpm cli:generate --exemplars local-fixtures/style-1.docx,local-fixtures/style-2.docx,local-fixtures/style-3.docx --content local-fixtures/content.docx --output local-fixtures/OUTPUT.docx --audit local-fixtures/audit.json
```

## Then run API + web
```bash
pnpm dev
```
- web: `http://localhost:3000`
- worker: `http://localhost:4000`

## Test
```bash
pnpm --filter @compositor/engine test
```
Tests generate DOCX fixtures at runtime via `scripts/make-fixtures.ts`; no fixture binaries are committed.

## Notes
- Content controls (SDTs) can help as an optional accelerator, but inference does not require them.
- v1 defers floating DrawingML text boxes/shapes.
- Mammoth is intentionally not used for layout-preserving generation.
