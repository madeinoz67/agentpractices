// author: Stephen Eaton
// Split agent-facing Markdown into classifier-sized chunks with line numbers. No ML dependencies, so it is unit-tested at the root.
export interface Chunk { line: number; text: string }

/** Paragraph chunks (blank-line separated, fences kept whole), long ones split at ~maxChars on line boundaries. */
export function chunkMarkdown(text: string, opts: { maxChars?: number; minChars?: number } = {}): Chunk[] {
  const maxChars = opts.maxChars ?? 1500;
  const minChars = opts.minChars ?? 24;
  const lines = text.split(/\r?\n/);
  const out: Chunk[] = [];
  let buf: string[] = [];
  let start = 1;
  let inFence = false;
  const flush = (next: number) => {
    let piece: string[] = [];
    let pieceStart = start;
    const emit = () => {
      const t = piece.join('\n').trim();
      if (t.replace(/[\s\-|#*>`]/g, '').length >= minChars) out.push({ line: pieceStart, text: t });
    };
    buf.forEach((l, i) => {
      if (piece.join('\n').length + l.length > maxChars && piece.length) { emit(); piece = []; pieceStart = start + i; }
      piece.push(l);
    });
    if (piece.length) emit();
    buf = [];
    start = next;
  };
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) inFence = !inFence;
    if (!inFence && /^\s*(---\s*)?$/.test(l)) { flush(i + 2); return; }
    if (!buf.length) start = i + 1;
    buf.push(l);
  });
  flush(lines.length + 1);
  return out;
}
