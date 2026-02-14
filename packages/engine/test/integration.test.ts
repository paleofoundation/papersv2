import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AuditSchema } from '@compositor/shared';
import { generateFromStyleFamily, inferStyleFamily } from '../src';
import { runtimeFixtures } from './helpers';

describe('integration', () => {
  it('generates output and validates audit schema with runtime fixtures', async () => {
    const fixtures = await runtimeFixtures();
    const exemplars = ['style-1.docx', 'style-2.docx', 'style-3.docx'].map((f) => readFileSync(fixtures[f]));
    const content = readFileSync(fixtures['content.docx']);
    const model = await inferStyleFamily(exemplars);
    const out = await generateFromStyleFamily(model, content);
    expect(out.output.byteLength).toBeGreaterThan(100);
    expect(() => AuditSchema.parse(out.audit)).not.toThrow();
  });
});
