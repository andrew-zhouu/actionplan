export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
export const INDEX_VERSION = `${EMBEDDING_MODEL}:${EMBEDDING_DIMENSIONS}:chunks-v1`;
export const MAX_DOCUMENTS = 5;
export const MAX_DOCUMENT_CHARACTERS = 80_000;
export const MAX_REQUEST_CHUNKS = 160;

export type DocumentSource = {
  id: string;
  title: string;
  text: string;
};

export type Chunk = {
  ordinal: number;
  text: string;
  start: number;
  end: number;
};

export type RetrievedSource = Chunk & {
  sourceId: string;
  documentId: string;
  documentTitle: string;
  similarity: number;
};

export type Citation = {
  sourceId: string;
  documentId: string;
  documentTitle: string;
  quote: string;
  start: number;
  end: number;
};

export type Answer = {
  answerable: boolean;
  claims: { text: string; citations: Citation[] }[];
  message?: string;
};

export type Embedder = (texts: string[], task: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") => Promise<number[][]>;
export type Generator = (question: string, sources: RetrievedSource[]) => Promise<string>;

export class RagError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "RagError";
  }
}
