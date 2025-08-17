export type CodeBlock = { id: string; lang?: string; code: string };
export type Extracted = { body: string; codeBlocks: CodeBlock[] };

const UI_NOISE_PATTERNS = [
  /^(Copy\s+code|Open\s+in\s+\w+|Show\s+raw|Regenerate.*|Share.*|Report.*)$/i,
  /^Edited\s+\d+\s+times?$/i,
  /^\s*▼?\s*引用\s*$/i,
];

export function sanitizeRaw(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((ln) => !UI_NOISE_PATTERNS.some((re) => re.test(ln.trim())))
    .map((ln) => ln.replace(/\u200B/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function guessLang(code: string, hint?: string): string | undefined {
  const h = (hint || '').toLowerCase();
  if (h) return h;
  if (/^\s*<\?php/.test(code)) return 'php';
  if (/^\s*(class|def)\s+\w+\s*\(?.*\)?:/.test(code)) return 'py';
  if (/^\s*(const|let|var)\s+\w+\s*=/.test(code)) return 'js';
  if (/^\s*import\s+.*from\s+['"].+['"]/.test(code)) return 'ts';
  if (/^\s*<[^>]+>/.test(code)) return 'html';
  if (/^\s*\{[\s\S]*\}\s*$/.test(code) && /:\s*/.test(code)) return 'json';
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE)\b/i.test(code)) return 'sql';
  if (/^(\$ |> |PS>|# )/.test(code)) return 'bash';
  return undefined;
}

function pushBlock(blocks: CodeBlock[], buffer: string, langHint?: string) {
  const code = buffer.replace(/^\n+|\n+$/g, '');
  if (!code) return;
  blocks.push({
    id: typeof crypto !== 'undefined' && (crypto as unknown as { randomUUID?: () => string }).randomUUID ? crypto.randomUUID() : String(blocks.length + 1),
    lang: guessLang(code, langHint),
    code,
  });
}

export function extractCodeAndBody(rawInput: string): Extracted {
  const cleaned = sanitizeRaw(rawInput);

  const codeBlocks: CodeBlock[] = [];
  const fenceRe = /```(\w+)?\n([\s\S]*?)```/g;
  const remainder = cleaned.replace(fenceRe, (_m, lang, code) => {
    pushBlock(codeBlocks, code, lang);
    return '\n';
  });

  const lines = remainder.split('\n');
  const bodyLines: string[] = [];
  let buf: string[] = [];
  let mode: 'code' | 'text' = 'text';

  const flush = () => {
    if (!buf.length) return;
    if (mode === 'code') pushBlock(codeBlocks, buf.join('\n'));
    else bodyLines.push(...buf);
    buf = [];
  };

  for (const line of lines) {
    const isIndented = /^ {4,}|\t/.test(line);
    const looksShell = /^(\$ |> |PS>|# )/.test(line);
    const looksCodeBullet = /^(\d+\.\s|[-*]\s)[^\s]/.test(line) && /[{}();=]/.test(line);
    const codey = isIndented || looksShell || looksCodeBullet;

    if (codey) {
      if (mode === 'text') { flush(); mode = 'code'; }
      buf.push(line);
    } else {
      if (mode === 'code') { flush(); mode = 'text'; }
      buf.push(line);
    }
  }
  flush();

  const body = bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { body, codeBlocks };
}

export function toUnifiedMarkdown(extracted: Extracted): string {
  const { body, codeBlocks } = extracted;
  const appendix =
    codeBlocks.length === 0 ? '' :
    [
      '\n\n---\n',
      '## 付録：コード一覧\n',
      ...codeBlocks.map((b, i) => {
        const fenceLang = b.lang ?? '';
        return `\n### コード ${i + 1}${b.lang ? ` (${b.lang})` : ''}\n\`\`\`${fenceLang}\n${b.code}\n\`\`\`\n`;
      }),
    ].join('');

  return [body, appendix].join('').trim();
}