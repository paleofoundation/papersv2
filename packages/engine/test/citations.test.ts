import { describe, expect, it } from 'vitest';
import { findCitations } from '../src/citations';

describe('citation parser', () => {
  it('parses ranges and comma variants', () => {
    const found = findCitations('Alpha [2–4], beta (1,2) and [8, 10-12].');
    expect(found.map((f) => f.text)).toEqual(['[2–4]', '(1,2)', '[8, 10-12]']);
  });
});
