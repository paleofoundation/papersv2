import JSZip from 'jszip';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Paragraph = { text: string; style?: string; shading?: boolean };

type DocSpec = {
  paragraphs: Paragraph[];
  table?: { text: string; shaded?: boolean };
  headerText?: string;
  footerText?: string;
  columns?: number;
};

async function makeDocx(spec: DocSpec): Promise<Buffer> {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`);

  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`);

  const paragraphsXml = spec.paragraphs
    .map((p) => `<w:p><w:pPr>${p.style ? `<w:pStyle w:val="${p.style}"/>` : ''}${p.shading ? '<w:shd w:val="clear" w:fill="EAEAEA"/>' : ''}</w:pPr><w:r><w:t xml:space="preserve">${p.text}</w:t></w:r></w:p>`)
    .join('');

  const tableXml = spec.table
    ? `<w:tbl><w:tr><w:tc><w:tcPr>${spec.table.shaded ? '<w:shd w:val="clear" w:fill="D9E1F2"/>' : ''}</w:tcPr><w:p><w:r><w:t>${spec.table.text}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`
    : '';

  zip.folder('word')?.file('document.xml', `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraphsXml}
    ${tableXml}
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader"/>
      <w:footerReference w:type="default" r:id="rIdFooter"/>
      <w:cols w:num="${spec.columns || 1}"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  zip.folder('word')?.file('header1.xml', `<?xml version="1.0" encoding="UTF-8"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>${spec.headerText || 'Header'}</w:t></w:r></w:p></w:hdr>`);
  zip.folder('word')?.file('footer1.xml', `<?xml version="1.0" encoding="UTF-8"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>${spec.footerText || 'Footer'}</w:t></w:r></w:p></w:ftr>`);

  return (await zip.generateAsync({ type: 'nodebuffer' })) as Buffer;
}

export async function generateFixtureSet(baseDir: string): Promise<Record<string, string>> {
  mkdirSync(baseDir, { recursive: true });
  const defs: Array<[string, DocSpec]> = [
    ['style-1.docx', { paragraphs: [{ text: 'Paper A', style: 'Title' }, { text: 'ABSTRACT', style: 'Heading1', shading: true }, { text: 'Body A' }], table: { text: 'Abstract box A', shaded: true }, columns: 2 }],
    ['style-2.docx', { paragraphs: [{ text: 'Paper B', style: 'Title' }, { text: 'ABSTRACT', style: 'Heading1', shading: true }, { text: 'Body B' }], table: { text: 'Abstract box B', shaded: true }, columns: 2 }],
    ['style-3.docx', { paragraphs: [{ text: 'Paper C', style: 'Title' }, { text: 'ABSTRACT', style: 'Heading1', shading: true }, { text: 'Body C' }], table: { text: 'Abstract box C', shaded: true }, columns: 2 }],
    ['content.docx', { paragraphs: [{ text: 'New Paper', style: 'Title' }, { text: 'INTRODUCTION', style: 'Heading1' }, { text: 'Fresh text [2–4] and (1,2).' }], columns: 1 }]
  ];

  const out: Record<string, string> = {};
  for (const [name, spec] of defs) {
    const buf = await makeDocx(spec);
    const p = join(baseDir, name);
    writeFileSync(p, buf);
    out[name] = p;
  }
  return out;
}

if (require.main === module) {
  const dir = join(process.cwd(), 'local-fixtures');
  generateFixtureSet(dir).then((paths) => {
    console.log(JSON.stringify(paths, null, 2));
  });
}
