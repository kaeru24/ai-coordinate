'use client';

import { useState } from 'react';
import { useCloset } from '@/hooks/useCloset';
import ClothingCard from '@/components/ClothingCard';
import { ClothingCategory } from '@/types';
import Link from 'next/link';

type Filter = 'all' | ClothingCategory;

function chipStyle(value: Filter, active: Filter): React.CSSProperties {
  if (value !== active) {
    return {
      background: 'var(--surface)',
      color: 'var(--ink2)',
      border: '1.5px solid var(--border)',
    };
  }
  switch (value) {
    case 'all':
      return { background: 'var(--ink)', color: 'var(--bg)', border: '1.5px solid var(--ink)' };
    case 'top':
      return { background: 'var(--sage-bg)', color: 'var(--sage)', border: '1.5px solid var(--sage)' };
    case 'bottom':
      return { background: 'var(--terra-bg)', color: 'var(--terra)', border: '1.5px solid var(--terra)' };
    case 'coordinate':
      return { background: 'var(--lav-bg)', color: 'var(--lav)', border: '1.5px solid var(--lav)' };
  }
}

export default function ClosetPage() {
  const { items, remove, rename } = useCloset();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = filter === 'all' ? items : items.filter((i) => i.category === filter);

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'coordinate', label: 'コーデ' },
    { value: 'top', label: 'トップス' },
    { value: 'bottom', label: 'ボトムス' },
  ];

  return (
    <div className="max-w-sm mx-auto px-4 pt-10 pb-28">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1
            className="text-[22px] font-black"
            style={{ letterSpacing: '-0.03em', color: 'var(--ink)' }}
          >
            クローゼット
          </h1>
          <span
            className="text-[11px] font-bold rounded-full px-2.5 py-0.5"
            style={{ background: 'var(--surface)', color: 'var(--ink2)', border: '1px solid var(--border)' }}
          >
            {items.length}
          </span>
        </div>
        <div className="w-7 h-0.5 rounded-full mt-2" style={{ background: 'var(--gold)' }} />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {filters.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className="flex-shrink-0 rounded-full text-[11px] font-bold transition-all"
            style={{ padding: '7px 14px', ...chipStyle(value, filter) }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            🗂️
          </div>
          <p className="text-sm" style={{ color: 'var(--ink3)' }}>
            {items.length === 0
              ? 'まだ服が登録されていません'
              : 'このカテゴリには服がありません'}
          </p>
          {items.length === 0 && (
            <Link
              href="/register"
              className="rounded-xl px-6 py-2.5 text-sm font-bold transition"
              style={{ background: 'var(--ink)', color: 'var(--bg)' }}
            >
              服を登録する
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {visible.map((item) => (
            <ClothingCard key={item.id} item={item} onDelete={remove} onRename={rename} />
          ))}
        </div>
      )}
    </div>
  );
}
