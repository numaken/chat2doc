'use client';
import React, { useMemo, useState } from 'react';
import { extractCodeAndBody, toUnifiedMarkdown, type CodeBlock } from '@/utils/ingest';

export default function PasteIngestor() {
  const [raw, setRaw] = useState('');
  const [extracted, setExtracted] = useState<{ body: string; codeBlocks: CodeBlock[] } | null>(null);
  const [tab, setTab] = useState<'preview'|'body'|'code'>('preview');

  const decodeHtmlEntities = (text: string): string => {
    return text
      .replace(/&gt;/gi, '>')
      .replace(/&lt;/gi, '<')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;/gi, "'")
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&([a-z]+);/gi, (match, entity) => {
        const entities: Record<string, string> = {
          'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'", 'nbsp': ' '
        };
        return entities[entity.toLowerCase()] || match;
      });
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    let text = e.clipboardData.getData('text/plain');
    text = decodeHtmlEntities(text);
    
    requestAnimationFrame(() => {
      const newValue = text;
      setRaw(newValue);
      setExtracted(extractCodeAndBody(newValue));
      setTab('preview');
    });
  };

  const unified = useMemo(() => (extracted ? toUnifiedMarkdown(extracted) : ''), [extracted]);

  const copy = async (txt: string) => {
    try { await navigator.clipboard.writeText(txt); alert('コピーしました'); }
    catch { window.prompt('以下をコピーしてください', txt); }
  };

  return (
    <div className="ingest-wrap">
      <label className="ingest-label">ここに全部ペースト（本文＋コード混在OK）</label>
      <textarea
        className="ingest-textarea"
        placeholder="長押し → ペースト（スマホOK）"
        onPaste={onPaste}
        value={raw}
        onChange={(e) => {
          let value = e.target.value;
          // HTMLエンティティを即座にデコード
          value = decodeHtmlEntities(value);
          setRaw(value);
          if (value.trim()) {
            setExtracted(extractCodeAndBody(value));
          }
        }}
        rows={10}
      />

      <div className="tabs">
        <button className={tab==='preview'?'active':''} onClick={()=>setTab('preview')}>整形プレビュー</button>
        <button className={tab==='body'?'active':''} onClick={()=>setTab('body')}>本文のみ</button>
        <button className={tab==='code'?'active':''} onClick={()=>setTab('code')}>コード（{extracted?.codeBlocks.length ?? 0}）</button>
      </div>

      {tab==='preview' && (
        <section className="preview">
          {!extracted ? <p className="muted">ペーストすると本文/コードを自動分離します。</p> : (
            <>
              <div className="preview-body">
                <h3>本文（整形後）</h3>
                <pre>{extracted.body || '（本文なし）'}</pre>
              </div>
              <div className="preview-codes">
                <h3>コード付録（{extracted.codeBlocks.length}）</h3>
                {extracted.codeBlocks.length===0 && <p className="muted">検出なし</p>}
                {extracted.codeBlocks.map((b, i)=>(
                  <details key={b.id} className="code-item">
                    <summary>コード {i+1}{b.lang?` (${b.lang})`:''}</summary>
                    <pre>{`~~~${b.lang ?? ''}\n${b.code}\n~~~`}</pre>
                    <div className="code-actions"><button onClick={()=>copy(b.code)}>このコードをコピー</button></div>
                  </details>
                ))}
                {extracted.codeBlocks.length>0 && (
                  <div className="group-actions">
                    <button onClick={()=>copy(unified)}>本文＋付録をMarkdownでコピー</button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {tab==='body' && (
        <section className="preview">
          <pre>{extracted?.body ?? ''}</pre>
          <div className="group-actions"><button onClick={()=>copy(extracted?.body ?? '')}>本文をコピー</button></div>
        </section>
      )}

      {tab==='code' && (
        <section className="preview">
          {(extracted?.codeBlocks ?? []).map((b,i)=>(
            <details key={b.id} className="code-item">
              <summary>コード {i+1}{b.lang?` (${b.lang})`:''}</summary>
              <pre>{`~~~${b.lang ?? ''}\n${b.code}\n~~~`}</pre>
              <div className="code-actions"><button onClick={()=>copy(b.code)}>コピー</button></div>
            </details>
          ))}
          {(extracted?.codeBlocks.length ?? 0)>0 && (
            <div className="group-actions"><button onClick={()=>copy(unified)}>本文＋付録をMarkdownでコピー</button></div>
          )}
        </section>
      )}

      <style jsx>{`
        .ingest-wrap { display: grid; gap: 12px; }
        .ingest-label { font-weight: 600; }
        .ingest-textarea {
          width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 14px; padding: 12px; border-radius: 8px; border: 1px solid #ddd;
        }
        .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .tabs button { padding: 8px 12px; border-radius: 999px; border: 1px solid #ddd; background: #fff; }
        .tabs button.active { background: #111; color: #fff; border-color: #111; }
        .preview { display: grid; gap: 16px; }
        .preview pre { white-space: pre-wrap; word-break: break-word; background:#f7f7f8; padding:12px; border-radius:8px; }
        .code-item { border: 1px dashed #e5e5e9; border-radius: 8px; padding: 6px 8px; }
        .code-actions, .group-actions { display: flex; gap: 8px; margin-top: 8px; }
        .muted { color: #777; }
        @media (max-width: 640px) { .ingest-textarea { font-size: 13px; } }
      `}</style>
    </div>
  );
}