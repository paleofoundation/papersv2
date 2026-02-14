import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateFixtureSet } from '../../../scripts/make-fixtures';

export async function runtimeFixtures(): Promise<Record<string, string>> {
  const dir = mkdtempSync(join(tmpdir(), 'docx-family-'));
  return generateFixtureSet(dir);
}
