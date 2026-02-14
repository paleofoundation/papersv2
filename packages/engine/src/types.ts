export type ContentModel = {
  title?: string;
  authors?: string[];
  abstract?: string;
  sections: Array<{ heading: string; body: string[] }>;
  references?: string[];
};

export type ParsedDoc = {
  bodyParagraphs: Array<{ text: string; style: string; hasShading: boolean; allCaps: boolean; fontSizeHalfPoints?: number }>;
  tables: Array<{ rows: number; cols: number; hasShading: boolean; text: string[] }>;
  headers: string[];
  footers: string[];
  sectionColumns: number[];
};
