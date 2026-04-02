'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getItems, getGeneratedImages } from '@/lib/storage';

export default function HomePage() {
  const [count, setCount] = useState(0);
  const [genCount, setGenCount] = useState(0);

  useEffect(() => {
    setCount(getItems().length);
    setGenCount(getGeneratedImages().length);
  }, []);

  return (
    <div className="max-w-sm mx-auto px-4 pt-10 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex items-center justify-center text-base font-black"
            style={{
              width: 40, height: 40,
              background: 'var(--ink)',
              color: 'var(--bg)',
              borderRadius: 12,
              letterSpacing: '-0.05em',
              flexShrink: 0,
            }}
          >
            M
          </div>
          <h1
            className="text-[26px] font-black leading-none"
            style={{ letterSpacing: '-0.04em', color: 'var(--ink)' }}
          >
            MyCloset
          </h1>
        </div>
        <p className="text-[12px]" style={{ color: 'var(--ink3)', marginLeft: 52 }}>
          あなたのワードローブ
        </p>
        <div className="w-7 h-0.5 rounded-full mt-3" style={{ background: 'var(--gold)', marginLeft: 52 }} />
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-6">
        <div
          className="flex-1 rounded-[20px] p-4 flex flex-col gap-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <span
            className="font-black leading-none"
            style={{ fontSize: 38, letterSpacing: '-0.04em', color: 'var(--ink)' }}
          >
            {count}
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'var(--ink3)' }}
          >
            アイテム
          </span>
        </div>
        <div
          className="flex-1 rounded-[20px] p-4 flex flex-col gap-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <span
            className="font-black leading-none"
            style={{ fontSize: 38, letterSpacing: '-0.04em', color: 'var(--ink)' }}
          >
            {genCount}
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'var(--ink3)' }}
          >
            コーデ
          </span>
        </div>
      </div>

      {/* Navigation cards */}
      <div className="flex flex-col gap-2.5">
        <Link
          href="/register"
          className="flex items-center gap-3 rounded-[20px] p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="flex items-center justify-center text-lg flex-shrink-0"
            style={{
              width: 44, height: 44,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}
          >
            📷
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold" style={{ letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              アイテムを登録
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink3)' }}>
              服の写真を追加する
            </p>
          </div>
          <span className="text-base" style={{ color: 'var(--ink3)' }}>›</span>
        </Link>

        <Link
          href="/coordinate"
          className="flex items-center gap-3 rounded-[20px] p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="flex items-center justify-center text-lg flex-shrink-0"
            style={{
              width: 44, height: 44,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}
          >
            🪞
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold" style={{ letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              コーデを作る
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink3)' }}>
              AI でコーディネート
            </p>
          </div>
          <span className="text-base" style={{ color: 'var(--ink3)' }}>›</span>
        </Link>

        <Link
          href="/closet"
          className="flex items-center gap-3 rounded-[20px] p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="flex items-center justify-center text-lg flex-shrink-0"
            style={{
              width: 44, height: 44,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}
          >
            🗂️
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold" style={{ letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              クローゼットを見る
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink3)' }}>
              登録済み:{' '}
              <span className="font-bold" style={{ color: 'var(--gold)' }}>
                {count} アイテム
              </span>
            </p>
          </div>
          <span className="text-base" style={{ color: 'var(--ink3)' }}>›</span>
        </Link>

        <Link
          href="/generated"
          className="flex items-center gap-3 rounded-[20px] p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="flex items-center justify-center text-lg flex-shrink-0"
            style={{
              width: 44, height: 44,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}
          >
            ✨
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold" style={{ letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              生成した画像
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink3)' }}>
              {genCount > 0
                ? <><span className="font-bold" style={{ color: 'var(--gold)' }}>{genCount}件</span> の生成コーデ</>
                : 'AI が生成したコーデ画像'}
            </p>
          </div>
          <span className="text-base" style={{ color: 'var(--ink3)' }}>›</span>
        </Link>
      </div>
    </div>
  );
}
