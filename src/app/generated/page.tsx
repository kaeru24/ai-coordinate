'use client';

import { useEffect, useState } from 'react';
import { GeneratedImage } from '@/types';
import { getGeneratedImages, deleteGeneratedImage, addItem } from '@/lib/storage';
import { getImage } from '@/lib/imageDb';
import { blobToObjectUrl } from '@/lib/imageUtils';

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 12,
  fontFamily: 'inherit',
  color: 'var(--ink)',
  background: 'var(--bg)',
  outline: 'none',
  boxSizing: 'border-box',
};

function GeneratedImageCard({
  img,
  onDelete,
}: {
  img: GeneratedImage;
  onDelete: (id: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    getImage(img.id).then((rec) => {
      if (rec) { objectUrl = blobToObjectUrl(rec.full); setUrl(objectUrl); }
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [img.id]);

  function handleSave() {
    addItem({
      id: img.id,
      name: name.trim() || 'コーデ',
      category: 'coordinate',
      createdAt: new Date().toISOString(),
      usedItemIds: img.usedItemIds,
    });
    setSaved(true);
  }

  const dateStr = new Date(img.createdAt).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  });

  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Image with date badge overlay */}
      <div className="relative" style={{ aspectRatio: '3/4', overflow: 'hidden' }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="生成コーデ" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'var(--surface2)' }}
          >
            <span className="text-xs" style={{ color: 'var(--ink3)' }}>読み込み中...</span>
          </div>
        )}
        {/* Date stamp */}
        <div
          className="absolute top-2 left-2"
          style={{
            background: 'rgba(253,252,248,0.88)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            borderRadius: 8,
            padding: '3px 8px',
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {dateStr}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-1.5 p-2.5">
        {saved ? (
          <p
            className="text-xs font-semibold text-center py-1"
            style={{ color: 'var(--gold)' }}
          >
            ✓ コーデに追加しました
          </p>
        ) : (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="コーデ名（任意）"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 2px var(--gold-soft)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              onClick={handleSave}
              className="w-full py-2 rounded-lg text-[11px] font-bold transition"
              style={{ background: 'var(--ink)', color: 'var(--bg)' }}
            >
              コーデに追加
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(img.id)}
          className="w-full py-2 rounded-lg text-[11px] font-semibold transition"
          style={{
            background: 'transparent',
            color: 'var(--ink3)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--ink2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          削除
        </button>
      </div>
    </div>
  );
}

export default function GeneratedPage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    setImages(getGeneratedImages());
  }, []);

  function handleDelete(id: string) {
    deleteGeneratedImage(id);
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  return (
    <div className="max-w-sm mx-auto px-4 pt-10 pb-28">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h1
            className="text-[22px] font-black"
            style={{ letterSpacing: '-0.03em', color: 'var(--ink)' }}
          >
            生成した画像
          </h1>
          {images.length > 0 && (
            <span
              className="text-[11px] font-bold rounded-full px-2.5 py-0.5"
              style={{ background: 'var(--surface)', color: 'var(--ink2)', border: '1px solid var(--border)' }}
            >
              {images.length}
            </span>
          )}
        </div>
        <div className="w-7 h-0.5 rounded-full mt-2" style={{ background: 'var(--gold)' }} />
      </div>

      {images.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            ✨
          </div>
          <p className="text-sm" style={{ color: 'var(--ink3)' }}>
            まだ生成した画像がありません
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {images.map((img) => (
            <GeneratedImageCard key={img.id} img={img} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
