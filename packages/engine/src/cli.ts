import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { generateFromFiles } from './index';

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main(): Promise<void> {
  const exemplars = (arg('exemplars') || '').split(',').filter(Boolean);
  const content = arg('content');
  const output = arg('output') || 'OUTPUT.docx';
  const audit = arg('audit') || 'audit.json';

  if (exemplars.length < 3 || exemplars.length > 5 || !content) {
    console.error('Usage: pnpm cli:generate --exemplars a.docx,b.docx,c.docx --content content.docx --output OUTPUT.docx --audit audit.json');
    process.exit(1);
  }

  const outputPath = resolve(output);
  const auditPath = resolve(audit);
  mkdirSync(dirname(outputPath), { recursive: true });
  mkdirSync(dirname(auditPath), { recursive: true });

  await generateFromFiles(exemplars.map(resolve), resolve(content), outputPath, auditPath);
  console.log(JSON.stringify({ outputPath, auditPath }, null, 2));
}

main();
