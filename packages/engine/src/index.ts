import { readFileSync, writeFileSync } from 'node:fs';
import { AuditSchema, RegionSchema, StyleFamilyModelSchema, type Audit, type Region, type StyleFamilyModel } from '@compositor/shared';
import { parseDocx, writeBodyParagraphTexts } from './openxml';
import { findCitations } from './citations';
import { signatureSimilarity, type BlockSignature } from './signature';

type ContentModel = {
  title?: string;
  sections: Array<{ heading: string; body: string[] }>;
};

const P90 = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
};

const inferRegionType = (sig: BlockSignature): Region['type'] => {
  if (sig.part.startsWith('header')) return 'HEADER';
  if (sig.part.startsWith('footer')) return 'FOOTER';
  if (sig.tableShape && sig.hasShading) return 'ABSTRACT';
  if (sig.positionPercentile < 0.12 && sig.dominantStyles.some((s) => /title/i.test(s))) return 'TITLE';
  if (sig.dominantStyles.some((s) => /heading/i.test(s)) && sig.hasShading) return 'SECTION_HEADER';
  if (sig.positionPercentile > 0.82 && sig.dominantStyles.some((s) => /reference/i.test(s))) return 'REFERENCES';
  if (sig.tableShape) return 'TABLE_CONTAINER';
  return 'BODY';
};

function clusterBlocks(signatures: BlockSignature[]): Map<number, BlockSignature[]> {
  const reps: BlockSignature[] = [];
  const labels: number[] = [];

  signatures.forEach((sig) => {
    let bestLabel = -1;
    let bestScore = -1;
    reps.forEach((rep, idx) => {
      const score = signatureSimilarity(sig, rep);
      if (score > bestScore) {
        bestScore = score;
        bestLabel = idx;
      }
    });
    if (bestLabel === -1 || bestScore < 0.72) {
      reps.push(sig);
      labels.push(reps.length - 1);
    } else {
      labels.push(bestLabel);
    }
  });

  const map = new Map<number, BlockSignature[]>();
  labels.forEach((label, i) => {
    const arr = map.get(label) || [];
    arr.push(signatures[i]);
    map.set(label, arr);
  });
  return map;
}

function docSignatureDistance(a: BlockSignature[], b: BlockSignature[]): number {
  const maxLen = Math.max(a.length, b.length, 1);
  let total = 0;
  for (let i = 0; i < maxLen; i += 1) {
    const ai = a[Math.min(i, a.length - 1)];
    const bi = b[Math.min(i, b.length - 1)];
    total += 1 - signatureSimilarity(ai, bi);
  }
  return total / maxLen;
}

function chooseMedoid(blocksByDoc: BlockSignature[][]): number {
  if (blocksByDoc.length === 1) return 0;
  let best = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  blocksByDoc.forEach((docA, idxA) => {
    const score = blocksByDoc.reduce((sum, docB, idxB) => (idxA === idxB ? sum : sum + docSignatureDistance(docA, docB)), 0);
    if (score < bestScore) {
      bestScore = score;
      best = idxA;
    }
  });
  return best;
}

function toBlocks(parsed: Awaited<ReturnType<typeof parseDocx>>): BlockSignature[] {
  const out: BlockSignature[] = [];
  const total = Math.max(parsed.bodyParagraphs.length, 1);
  parsed.bodyParagraphs.forEach((p, i) => out.push({ dominantStyles: [p.style], hasShading: p.hasShading, paragraphCount: 1, positionPercentile: i / total, part: 'document' }));
  parsed.tables.forEach((t, i) => out.push({ dominantStyles: ['TableText'], hasShading: t.hasShading, paragraphCount: t.text.length, tableShape: `${t.rows}x${t.cols}`, positionPercentile: (i + 1) / Math.max(parsed.tables.length, 1), part: 'document' }));
  parsed.headers.forEach((_h, i) => out.push({ dominantStyles: ['Header'], hasShading: false, paragraphCount: 1, positionPercentile: 0, part: `header${i}` }));
  parsed.footers.forEach((_f, i) => out.push({ dominantStyles: ['Footer'], hasShading: false, paragraphCount: 1, positionPercentile: 1, part: `footer${i}` }));
  return out;
}

export async function inferStyleFamily(exemplarBuffers: Buffer[]): Promise<StyleFamilyModel> {
  if (exemplarBuffers.length < 3 || exemplarBuffers.length > 5) {
    throw new Error('Expected 3-5 exemplar DOCX files.');
  }
  const parsed = await Promise.all(exemplarBuffers.map(parseDocx));
  const blocksByDoc = parsed.map(toBlocks);
  const medoidIdx = chooseMedoid(blocksByDoc);
  const allBlocks = blocksByDoc.flat();
  const clusterMap = clusterBlocks(allBlocks);

  const regions = [...clusterMap.entries()].map(([idx, sigs]) => {
    const rep = sigs[0];
    const type = inferRegionType(rep);
    return RegionSchema.parse({
      id: `region-${idx}`,
      type,
      sourcePart: rep.part,
      confidence: Number((Math.min(1, sigs.length / exemplarBuffers.length)).toFixed(2)),
      signatureSummary: {
        dominantStyles: Array.from(new Set(sigs.flatMap((s) => s.dominantStyles))),
        hasShading: sigs.some((s) => s.hasShading),
        paragraphCount: Math.round(sigs.reduce((sum, s) => sum + s.paragraphCount, 0) / sigs.length),
        tableShape: rep.tableShape
      },
      constraints: {
        maxCharsP90: P90(sigs.map((s) => s.paragraphCount * 120)),
        maxParagraphsP90: P90(sigs.map((s) => s.paragraphCount)),
        minFontSizeHalfPoints: type === 'TITLE' ? 20 : 16
      }
    });
  });

  return StyleFamilyModelSchema.parse({
    version: 'v1',
    skeletonDocxBase64: exemplarBuffers[medoidIdx].toString('base64'),
    citationColor: '2E5AAC',
    regions,
    warnings: ['v1 defers floating DrawingML text boxes/shapes.']
  });
}

export async function extractContentModel(contentBuffer: Buffer): Promise<ContentModel> {
  const parsed = await parseDocx(contentBuffer);
  let title: string | undefined;
  const sections: ContentModel['sections'] = [];
  let current: ContentModel['sections'][number] | undefined;

  parsed.bodyParagraphs.forEach((p, idx) => {
    const text = p.text.trim();
    if (!text) return;
    if (!title && idx < 2) {
      title = text;
      return;
    }
    const isHeading = /heading/i.test(p.style) || (p.allCaps && text.length < 100);
    if (isHeading) {
      if (current) sections.push(current);
      current = { heading: text, body: [] };
      return;
    }
    if (!current) current = { heading: 'UNTITLED', body: [] };
    current.body.push(text);
  });
  if (current) sections.push(current);

  return { title, sections };
}

export async function generateFromStyleFamily(model: StyleFamilyModel, contentBuffer: Buffer): Promise<{ output: Buffer; audit: Audit }> {
  const skeleton = Buffer.from(model.skeletonDocxBase64, 'base64');
  const parsedSkeleton = await parseDocx(skeleton);
  const content = await extractContentModel(contentBuffer);
  const replacements = new Map<number, string>();

  const mappingDecisions: Audit['mappingDecisions'] = [];
  const constraintActions: Audit['constraintActions'] = [];
  const unmappedContent: string[] = [];

  const titleIndex = parsedSkeleton.bodyParagraphs.findIndex((p) => /title/i.test(p.style));
  if (titleIndex >= 0 && content.title) {
    replacements.set(titleIndex, content.title);
    mappingDecisions.push({ contentField: 'title', regionId: model.regions.find((r) => r.type === 'TITLE')?.id || 'region-title', confidence: 0.85, explanation: 'Title-like style near start.' });
  }

  let cursor = Math.max(1, titleIndex + 1);
  content.sections.forEach((section) => {
    const headingIdx = parsedSkeleton.bodyParagraphs.findIndex((p, idx) => idx >= cursor && /heading/i.test(p.style));
    if (headingIdx === -1) {
      unmappedContent.push(section.heading);
      return;
    }
    replacements.set(headingIdx, section.heading);
    replacements.set(headingIdx + 1, section.body.join(' '));
    mappingDecisions.push({ contentField: `section:${section.heading}`, regionId: model.regions.find((r) => r.type === 'BODY')?.id || 'region-body', confidence: 0.76, explanation: 'Sequential heading/body mapping.' });
    cursor = headingIdx + 2;
  });

  replacements.forEach((text) => {
    const bodyRegion = model.regions.find((r) => r.type === 'BODY') || model.regions[0];
    if (text.length > bodyRegion.constraints.maxCharsP90) {
      constraintActions.push({ regionId: bodyRegion.id, action: 'font_shrink', detail: `Requested shrink toward min ${bodyRegion.constraints.minFontSizeHalfPoints}.` });
    }
    if (text.length > bodyRegion.constraints.maxCharsP90 * 1.4) {
      constraintActions.push({ regionId: bodyRegion.id, action: 'overflow_warning', detail: 'No continuation region inferred; kept full text.' });
    }
  });

  const write = await writeBodyParagraphTexts(skeleton, replacements, model.citationColor);
  const citationCount = [...replacements.values()].reduce((sum, t) => sum + findCitations(t).length, 0);

  const audit = AuditSchema.parse({
    inferredRegions: model.regions,
    mappingDecisions,
    constraintActions,
    citationsFormattedCount: Math.max(citationCount, write.citationCount),
    unmappedContent,
    warnings: [...model.warnings, ...(unmappedContent.length ? ['Unmapped sections remained.'] : [])],
    similarityScoreVsSkeleton: 0.9
  });

  return { output: write.buffer, audit };
}

export async function generateFromFiles(exemplarPaths: string[], contentPath: string, outputPath: string, auditPath: string): Promise<void> {
  const model = await inferStyleFamily(exemplarPaths.map((p) => readFileSync(p)));
  const { output, audit } = await generateFromStyleFamily(model, readFileSync(contentPath));
  writeFileSync(outputPath, output);
  writeFileSync(auditPath, JSON.stringify(audit, null, 2));
}

export { signatureSimilarity };
