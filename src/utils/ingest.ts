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
    // HTMLエンティティをより強力にデコード
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    // 残存するHTMLエンティティも強制変換
    .replace(/&([a-z]+);/gi, (match, entity) => {
      const entities: Record<string, string> = {
        'amp': '&',
        'lt': '<',
        'gt': '>',
        'quot': '"',
        'apos': "'",
        'nbsp': ' '
      };
      return entities[entity.toLowerCase()] || match;
    })
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

function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0 || len2 === 0) return 0;
  
  // Simple character-based similarity
  const maxLen = Math.max(len1, len2);
  const minLen = Math.min(len1, len2);
  const ratio = minLen / maxLen;
  
  // Check common substring ratio
  let common = 0;
  const shorter = len1 < len2 ? str1 : str2;
  const longer = len1 < len2 ? str2 : str1;
  
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) common++;
  }
  
  return (common / maxLen + ratio) / 2;
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
  
  // 1. まずフェンス付きコードブロックを抽出
  const fenceRe = /```(\w+)?\n([\s\S]*?)```/g;
  const withoutFences = cleaned.replace(fenceRe, (_m, lang, code) => {
    pushBlock(codeBlocks, code, lang);
    return '';
  });

  // 2. 大きなコードブロック（ファイル全体など）を検出
  const lines = withoutFences.split('\n');
  const processedLines: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // TypeScript/JavaScript ファイルの開始を検出
    if (/^\/\/ \w+\/[\w\.]+\.(ts|js|tsx|jsx)$/.test(line.trim()) || 
        /^export (type|interface|function|const|class)/.test(line.trim())) {
      
      // ファイル全体を1つのコードブロックとして抽出
      const codeStart = i;
      let codeEnd = i;
      let foundNextFile = false;
      
      // 次のファイルまたは明確な区切りを探す
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (/^\/\/ \w+\/[\w\.]+\.(ts|js|tsx|jsx)$/.test(nextLine.trim()) && j > i + 10) {
          codeEnd = j - 1;
          foundNextFile = true;
          break;
        }
      }
      
      if (!foundNextFile) codeEnd = lines.length - 1;
      
      // コードブロックを抽出（説明文を除外）
      const codeLines = lines.slice(codeStart, codeEnd + 1);
      const filteredCodeLines = codeLines.filter(line => {
        const trimmed = line.trim();
        // 明確な説明文のみ除外（コードに関係ない内容）
        if (/^使い方：|^目的：|^ポイント：|^\d+\)\s+/.test(trimmed)) return false;
        if (/^貼り付け受付時に|^を自動生成|^差分ビュー|^言語推定/.test(trimmed)) return false;
        if (/^「[^」]*」タブ/.test(trimmed)) return false;
        return true;
      });
      const codeContent = filteredCodeLines.join('\n').trim();
      
      if (codeContent.length > 50) { // 短すぎるコードは除外
        const lang = guessLang(codeContent);
        pushBlock(codeBlocks, codeContent, lang);
      }
      
      i = codeEnd + 1;
      continue;
    }
    
    // 通常の行は本文として扱う
    processedLines.push(line);
    i++;
  }

  // 3. 残りの小さなコード片を検出（従来のロジック）
  const remainingText = processedLines.join('\n');
  const bodyLines: string[] = [];
  const remainingLines = remainingText.split('\n');
  let buf: string[] = [];
  let mode: 'code' | 'text' = 'text';

  const flush = () => {
    if (!buf.length) return;
    if (mode === 'code') {
      pushBlock(codeBlocks, buf.join('\n'));
    } else {
      bodyLines.push(...buf);
    }
    buf = [];
  };

  for (const line of remainingLines) {
    const isIndented = /^ {4,}|\t/.test(line);
    const looksShell = /^(\$ |> |PS>|# )/.test(line);
    const isEmpty = line.trim() === '';
    const codey = isIndented || looksShell;

    if (codey) {
      if (mode === 'text') { flush(); mode = 'code'; }
      buf.push(line);
    } else if (isEmpty && mode === 'code') {
      buf.push(line);
    } else {
      if (mode === 'code') { flush(); mode = 'text'; }
      buf.push(line);
    }
  }
  flush();

  // 本文の重複除去
  let body = bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  
  // 同じ段落が繰り返されている場合は1つに統合
  const paragraphs = body.split('\n\n');
  const uniqueParagraphs: string[] = [];
  const seenParagraphs = new Set<string>();
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length === 0) continue;
    
    const normalized = trimmed.replace(/\s+/g, ' ').toLowerCase();
    // 短いテキストはそのまま保持、長いテキストのみ重複チェック
    if (normalized.length <= 10 || !seenParagraphs.has(normalized)) {
      if (normalized.length > 10) {
        seenParagraphs.add(normalized);
      }
      uniqueParagraphs.push(trimmed);
    }
  }
  
  body = uniqueParagraphs.join('\n\n').trim();
  
  // 4. 重複除去（より強力な類似度チェック）
  const uniqueCodeBlocks: CodeBlock[] = [];
  
  for (const block of codeBlocks) {
    const normalizedCode = block.code
      .replace(/\s+/g, ' ')  // 空白を正規化
      .trim()
      .toLowerCase();
    
    // 既存のコードと80%以上類似していたら除外
    const isDuplicate = uniqueCodeBlocks.some(existing => {
      const existingNormalized = existing.code
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      
      const similarity = calculateSimilarity(normalizedCode, existingNormalized);
      return similarity > 0.8;
    });
    
    if (!isDuplicate) {
      uniqueCodeBlocks.push(block);
    }
  }
  
  return { body, codeBlocks: uniqueCodeBlocks };
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