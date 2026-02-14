import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateFromStyleFamily, inferStyleFamily } from '../src';
import { runtimeFixtures } from './helpers';

describe('constraints', () => {
  it('adds overflow warnings without truncating silently', async () => {
    const fixtures = await runtimeFixtures();
    const exemplars = ['style-1.docx', 'style-2.docx', 'style-3.docx'].map((f) => readFileSync(fixtures[f]));
    const model = await inferStyleFamily(exemplars);

    const content = readFileSync(fixtures['content.docx']);
    const out = await generateFromStyleFamily(model, content);
    expect(out.audit.warnings.length).toBeGreaterThan(0);
  });
});
