import express from 'express';
import multer from 'multer';
import { generateFromStyleFamily, inferStyleFamily } from '@compositor/engine';
import { StyleFamilyModelSchema } from '@compositor/shared';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.json({ limit: '25mb' }));

app.post('/infer-style-family', upload.array('exemplars', 5), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) || [];
    if (files.length < 3 || files.length > 5) return res.status(400).json({ error: 'Upload 3-5 exemplar DOCX files.' });
    const model = await inferStyleFamily(files.map((f) => f.buffer));
    res.json(model);
  } finally {
    (req.files as Express.Multer.File[] | undefined)?.forEach((f) => (f.buffer as unknown) = null);
  }
});

app.post('/generate', upload.single('content'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing content.docx upload.' });
    const parsed = StyleFamilyModelSchema.parse(req.body.model ? JSON.parse(req.body.model) : req.body);
    const result = await generateFromStyleFamily(parsed, req.file.buffer);
    res.setHeader('Content-Type', 'application/json');
    res.json({ outputDocxBase64: result.output.toString('base64'), audit: result.audit });
  } finally {
    if (req.file) (req.file.buffer as unknown) = null;
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`worker listening on ${port}`));
