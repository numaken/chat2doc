import { describe, it, expect } from 'vitest';
import { extractCodeAndBody, toUnifiedMarkdown } from './ingest';

describe('extractCodeAndBody', () => {
  it('```フェンス付きコード検出', () => {
    const raw = `本文\n\n\`\`\`js\nconst a=1\n\`\`\`\n終わり`;
    const ex = extractCodeAndBody(raw);
    expect(ex.codeBlocks.length).toBe(1);
    expect(ex.body).toContain('本文');
  });

  it('インデント塊をコード扱い', () => {
    const raw = `説明\n    const x=1;\n    console.log(x)`;
    const ex = extractCodeAndBody(raw);
    expect(ex.codeBlocks.length).toBe(1);
  });

  it('UIノイズ除去', () => {
    const raw = `Copy code\n本文\nOpen in Playground\n\`\`\`\ncode\n\`\`\``;
    const ex = extractCodeAndBody(raw);
    expect(ex.body.trim()).toBe('本文');
  });

  it('Markdown整形（付録付与）', () => {
    const raw = `A\n\n\`\`\`py\ndef f():\n  pass\n\`\`\``;
    const md = toUnifiedMarkdown(extractCodeAndBody(raw));
    expect(md).toContain('## 付録：コード一覧');
  });
});