import { describe, expect, it } from 'vitest';
import { signatureSimilarity } from '../src';

describe('signature similarity', () => {
  it('scores similar blocks higher', () => {
    const a = { dominantStyles: ['Heading1'], hasShading: true, paragraphCount: 2, positionPercentile: 0.2, part: 'document', tableShape: '1x1' };
    const b = { dominantStyles: ['Heading1'], hasShading: true, paragraphCount: 2, positionPercentile: 0.25, part: 'document', tableShape: '1x1' };
    const c = { dominantStyles: ['Footer'], hasShading: false, paragraphCount: 5, positionPercentile: 1, part: 'footer1' };
    expect(signatureSimilarity(a, b)).toBeGreaterThan(signatureSimilarity(a, c));
  });
});
