import { createHash } from "node:crypto";
import { INDEX_VERSION, MAX_DOCUMENT_CHARACTERS, RagError, type Chunk } from "./types";

export function contentHash(text: string): string {
  return createHash("sha256").update(INDEX_VERSION).update("\0").update(text).digest("hex");
}

/** Character offsets always refer to the untouched, stored source text. */
export function chunkDocument(text: string, size = 1800, overlap = 240): Chunk[] {
  if (size < 100 || overlap < 0 || overlap >= size / 2) throw new Error("Invalid chunk settings");
  if (text.length > MAX_DOCUMENT_CHARACTERS) {
    throw new RagError("document_too_large", "One of these documents is too long for questions yet. Select a shorter document.");
  }
  const chunks: Chunk[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + size, text.length);
    if (end < text.length) {
      // Prefer a paragraph/sentence boundary; never leave a gap in the source.
      const window = text.slice(cursor, end);
      const boundary = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "));
      if (boundary > size / 2) end = cursor + boundary + 1;
    }
    let start = cursor;
    while (start < end && /\s/.test(text[start])) start++;
    let trimmedEnd = end;
    while (trimmedEnd > start && /\s/.test(text[trimmedEnd - 1])) trimmedEnd--;
    if (trimmedEnd > start) chunks.push({ ordinal: chunks.length, text: text.slice(start, trimmedEnd), start, end: trimmedEnd });
    if (end === text.length) break;
    cursor = end - overlap;
  }
  return chunks;
}
