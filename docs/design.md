# Design: DOCX Style-Family Compositor (v1)

## Scope-first delivery order
1. Engine + CLI (`pnpm cli:generate`)
2. Worker API wrapper
3. Minimal web upload UI

## OpenXML handling contract
- DOCX is processed as an OPC zip package using `JSZip`.
- Generation edits XML **in place** on the chosen skeleton exemplar (no HTML rebuild).
- Required parts:
  - `word/document.xml`
  - `word/styles.xml` (if present)
  - `word/numbering.xml` (if present)
  - `word/header*.xml`, `word/footer*.xml`
  - relationships for part discovery

## Document graph
Per exemplar, construct a graph with:
- Nodes: paragraphs, runs, tables, rows, cells, section breaks (`w:sectPr`), column configs (`w:cols`), header/footer parts.
- Edges:
  - order edges inside each part
  - containment edges (table -> row -> cell -> paragraph)
  - membership edges (document/header/footer)

## Region candidates (supported v1)
1. Every `w:tbl`.
2. Every header/footer part.
3. Paragraph clusters: consecutive paragraphs grouped by style fingerprint and split on boundary fingerprints.

## Block signature
- Structural: table shape, merged-cell hints, shading/borders.
- Style: dominant `pStyle`, run features (size/color/caps).
- Positional: order percentile in part + part type.

## Cross-exemplar alignment
- Use deterministic clustering of block signatures.
- Infer cluster-level region records with confidence and constraints.
- Skeleton selection uses **medoid exemplar** over signature-distance matrix.

## Constraint inference
For each region cluster:
- `maxCharsP90`
- `maxParagraphsP90`
- `minFontSizeHalfPoints` policy by inferred region class

## Generation algorithm
1. Copy medoid exemplar bytes as output base.
2. Map content model fields to region clusters by compatibility + order.
3. Replace only target block text (paragraph/cell scoped).
4. Enforce constraints:
   - attempt font-shrink by editing `w:sz`
   - if still overflowing and no continuation region, warn in `audit.json`
   - never silently truncate by default policy
5. Citation pass: detect `[1]`, `[2–4]`, `(1,2)` and apply run-level superscript + citation color token.

## Required output artifacts
- `OUTPUT.docx`
- `audit.json` including inferred regions, mapping decisions, constraints actions/warnings, citations formatted count, similarity vs skeleton.

## Deferred in v1
- Floating DrawingML text boxes/shapes.
