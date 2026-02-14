import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inferStyleFamily } from '../src';
import { runtimeFixtures } from './helpers';

describe('deterministic clustering + medoid skeleton', () => {
  it('is stable across repeated inference runs', async () => {
    const fixtures = await runtimeFixtures();
    const exemplars = ['style-1.docx', 'style-2.docx', 'style-3.docx'].map((f) => readFileSync(fixtures[f]));
    const a = await inferStyleFamily(exemplars);
    const b = await inferStyleFamily(exemplars);
    expect(a.regions.map((r) => r.id)).toEqual(b.regions.map((r) => r.id));
    expect(a.skeletonDocxBase64).toEqual(b.skeletonDocxBase64);
  });
});
