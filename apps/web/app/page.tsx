'use client';

import { useState } from 'react';

const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:4000';

export default function Home() {
  const [model, setModel] = useState<string>('');
  const [audit, setAudit] = useState<string>('');

  async function buildStyleFamily(formData: FormData) {
    const res = await fetch(`${workerUrl}/infer-style-family`, { method: 'POST', body: formData });
    const json = await res.json();
    setModel(JSON.stringify(json, null, 2));
  }

  async function generate(contentFile: File) {
    const fd = new FormData();
    fd.append('content', contentFile);
    fd.append('model', model);
    const res = await fetch(`${workerUrl}/generate`, { method: 'POST', body: fd });
    const json = await res.json();
    setAudit(JSON.stringify(json.audit, null, 2));
    const a = document.createElement('a');
    a.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${json.outputDocxBase64}`;
    a.download = 'OUTPUT.docx';
    a.click();
  }

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 20 }}>
      <h1>DOCX Style Family Compositor</h1>
      <h2>Page 1: Build Style Family</h2>
      <form onSubmit={async (e) => {
        e.preventDefault();
        const input = (e.currentTarget.elements.namedItem('exemplars') as HTMLInputElement);
        const fd = new FormData();
        Array.from(input.files || []).forEach((f) => fd.append('exemplars', f));
        await buildStyleFamily(fd);
      }}>
        <input name="exemplars" type="file" accept=".docx" multiple required />
        <button type="submit">Infer Regions</button>
      </form>
      <p>Save model JSON for reuse:</p>
      <textarea value={model} onChange={(e) => setModel(e.target.value)} rows={12} cols={100} />

      <h2>Page 2: Generate Document</h2>
      <form onSubmit={async (e) => {
        e.preventDefault();
        const input = (e.currentTarget.elements.namedItem('content') as HTMLInputElement);
        if (!input.files?.[0]) return;
        await generate(input.files[0]);
      }}>
        <input name="content" type="file" accept=".docx" required />
        <button type="submit" disabled={!model}>Generate OUTPUT.docx</button>
      </form>
      <h3>Audit report</h3>
      <pre>{audit}</pre>
    </main>
  );
}
