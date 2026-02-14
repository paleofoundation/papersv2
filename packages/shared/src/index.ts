import { z } from 'zod';

export const RegionTypeSchema = z.enum([
  'TITLE',
  'ABSTRACT',
  'SECTION_HEADER',
  'BODY',
  'REFERENCES',
  'HEADER',
  'FOOTER',
  'TABLE_CONTAINER',
  'UNKNOWN'
]);

export const RegionSchema = z.object({
  id: z.string(),
  type: RegionTypeSchema,
  sourcePart: z.string(),
  confidence: z.number(),
  signatureSummary: z.object({
    dominantStyles: z.array(z.string()),
    hasShading: z.boolean(),
    paragraphCount: z.number(),
    tableShape: z.string().optional()
  }),
  constraints: z.object({
    maxCharsP90: z.number(),
    maxParagraphsP90: z.number(),
    minFontSizeHalfPoints: z.number()
  })
});

export const StyleFamilyModelSchema = z.object({
  version: z.literal('v1'),
  skeletonDocxBase64: z.string(),
  citationColor: z.string(),
  regions: z.array(RegionSchema),
  warnings: z.array(z.string())
});

export const AuditSchema = z.object({
  inferredRegions: z.array(RegionSchema),
  mappingDecisions: z.array(z.object({
    contentField: z.string(),
    regionId: z.string(),
    confidence: z.number(),
    explanation: z.string()
  })),
  constraintActions: z.array(z.object({
    regionId: z.string(),
    action: z.string(),
    detail: z.string()
  })),
  citationsFormattedCount: z.number(),
  unmappedContent: z.array(z.string()),
  warnings: z.array(z.string()),
  similarityScoreVsSkeleton: z.number()
});

export type Region = z.infer<typeof RegionSchema>;
export type StyleFamilyModel = z.infer<typeof StyleFamilyModelSchema>;
export type Audit = z.infer<typeof AuditSchema>;
