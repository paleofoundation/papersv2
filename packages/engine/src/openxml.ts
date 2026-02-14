import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import xpath from 'xpath';
import type { ParsedDoc } from './types';

const ns = { w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' };
const select = xpath.useNamespaces(ns);

export async function loadZip(buffer: Buffer): Promise<JSZip> {
  return JSZip.loadAsync(buffer);
}

function getTextFromNode(node: Node): string {
  const textNodes = select('.//w:t', node) as Node[];
  return textNodes.map((n) => n.textContent || '').join('');
}

export async function parseDocx(buffer: Buffer): Promise<ParsedDoc> {
  const zip = await loadZip(buffer);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('Missing word/document.xml');
  const doc = new DOMParser().parseFromString(docXml, 'text/xml');

  const bodyParagraphs = (select('//w:body/w:p', doc) as Node[]).map((p) => {
    const style = (select('./w:pPr/w:pStyle/@w:val', p)[0] as Attr | undefined)?.value || 'Normal';
    const hasShading = select('./w:pPr/w:shd', p).length > 0;
    const text = getTextFromNode(p);
    const allCaps = text.length > 0 && text === text.toUpperCase();
    const fontSizeHalfPoints = Number((select('.//w:rPr/w:sz/@w:val', p)[0] as Attr | undefined)?.value || 0) || undefined;
    return { text, style, hasShading, allCaps, fontSizeHalfPoints };
  });

  const tables = (select('//w:tbl', doc) as Node[]).map((tbl) => {
    const rows = select('./w:tr', tbl).length;
    const cols = Math.max(...(select('./w:tr', tbl) as Node[]).map((r) => select('./w:tc', r).length), 0);
    const hasShading = select('.//w:tcPr/w:shd', tbl).length > 0;
    const text = (select('.//w:p', tbl) as Node[]).map(getTextFromNode);
    return { rows, cols, hasShading, text };
  });

  const sectionColumns = (select('//w:sectPr/w:cols/@w:num', doc) as Attr[]).map((a) => Number(a.value || 1));

  const headers: string[] = [];
  const footers: string[] = [];
  await Promise.all(Object.keys(zip.files).map(async (name) => {
    if (/word\/header\d+\.xml/.test(name)) headers.push(await zip.file(name)!.async('string'));
    if (/word\/footer\d+\.xml/.test(name)) footers.push(await zip.file(name)!.async('string'));
  }));

  return { bodyParagraphs, tables, headers, footers, sectionColumns };
}

export async function writeBodyParagraphTexts(docx: Buffer, replacements: Map<number, string>, citationColor: string): Promise<{ buffer: Buffer; citationCount: number }> {
  const zip = await loadZip(docx);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('Missing word/document.xml');
  const doc = new DOMParser().parseFromString(docXml, 'text/xml');
  const paragraphs = select('//w:body/w:p', doc) as Node[];
  let citationCount = 0;

  for (const [index, nextText] of replacements.entries()) {
    const p = paragraphs[index];
    if (!p) continue;
    while (p.firstChild) p.removeChild(p.firstChild);
    const runs = nextText.split(/(\[[^\]]+\]|\([^\)]+\))/).filter(Boolean);
    for (const chunk of runs) {
      const r = doc.createElementNS(ns.w, 'w:r');
      const rPr = doc.createElementNS(ns.w, 'w:rPr');
      const isCitation = /^\[[0-9,\s\-–]+\]$/.test(chunk) || /^\([0-9,\s]+\)$/.test(chunk);
      if (isCitation) {
        citationCount += 1;
        const vertAlign = doc.createElementNS(ns.w, 'w:vertAlign');
        vertAlign.setAttribute('w:val', 'superscript');
        const color = doc.createElementNS(ns.w, 'w:color');
        color.setAttribute('w:val', citationColor.replace('#', ''));
        rPr.appendChild(vertAlign);
        rPr.appendChild(color);
      }
      const t = doc.createElementNS(ns.w, 'w:t');
      t.appendChild(doc.createTextNode(chunk));
      r.appendChild(rPr);
      r.appendChild(t);
      p.appendChild(r);
    }
  }

  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc));
  return { buffer: await zip.generateAsync({ type: 'nodebuffer' }) as Buffer, citationCount };
}
