'use client';
import dynamic from 'next/dynamic';

const PasteIngestor = dynamic(() => import('@/components/PasteIngestor'), { ssr: false });

export default function ImportPage() {
  return (
    <main style={{ padding: '24px', maxWidth: 940, margin: '0 auto' }}>
      <h1>チャットを貼り付けて整形</h1>
      <p>本文とコードを自動で分離し、引継ぎ用Markdownに整えます。</p>
      <PasteIngestor />
    </main>
  );
}