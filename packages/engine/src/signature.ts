export type BlockSignature = {
  dominantStyles: string[];
  hasShading: boolean;
  paragraphCount: number;
  tableShape?: string;
  positionPercentile: number;
  part: string;
};

export function signatureSimilarity(a: BlockSignature, b: BlockSignature): number {
  const styleOverlap = a.dominantStyles.filter((x) => b.dominantStyles.includes(x)).length / Math.max(a.dominantStyles.length, b.dominantStyles.length, 1);
  const shade = a.hasShading === b.hasShading ? 1 : 0;
  const para = 1 - Math.min(Math.abs(a.paragraphCount - b.paragraphCount) / Math.max(a.paragraphCount, b.paragraphCount, 1), 1);
  const table = a.tableShape === b.tableShape ? 1 : (a.tableShape || b.tableShape ? 0 : 1);
  const pos = 1 - Math.min(Math.abs(a.positionPercentile - b.positionPercentile), 1);
  const part = a.part === b.part ? 1 : 0;
  return Number(((styleOverlap * 0.25) + (shade * 0.15) + (para * 0.2) + (table * 0.15) + (pos * 0.15) + (part * 0.1)).toFixed(4));
}
