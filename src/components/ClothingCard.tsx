'use client';

import { useEffect, useRef, useState } from 'react';
import { ClothingItem } from '@/types';
import { getImage } from '@/lib/imageDb';
import { blobToObjectUrl } from '@/lib/imageUtils';

interface Props {
  item: ClothingItem;
  onDelete: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  selected?: boolean;
  onClick?: () => void;
}

function categoryLabel(category: ClothingItem['category']) {
  switch (category) {
    case 'top': return 'トップス';
    case 'bottom': return 'ボトムス';
    case 'outer': return 'アウター';
    case 'coordinate': return 'コーデ';
  }
}

function categoryStyle(category: ClothingItem['category']): React.CSSProperties {
  switch (category) {
    case 'top':
      return { background: 'var(--sage-bg)', color: 'var(--sage)' };
    case 'bottom':
      return { background: 'var(--terra-bg)', color: 'var(--terra)' };
    case 'outer':
      return { background: 'var(--surface2)', color: 'var(--ink2)' };
    case 'accessory':
      return { background: 'var(--gold-soft)', color: 'var(--gold)' };
    case 'coordinate':
      return { background: 'var(--lav-bg)', color: 'var(--lav)' };
  }
}

export default function ClothingCard({ item, onDelete, onRename, selected, onClick }: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(item.name);
  const [usedItemUrls, setUsedItemUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    getImage(item.id).then((rec) => {
      if (rec) { objectUrl = blobToObjectUrl(rec.thumbnail); setThumbUrl(objectUrl); }
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.id]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleImageClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!fullUrl) {
      getImage(item.id).then((rec) => {
        if (rec) setFullUrl(blobToObjectUrl(rec.full));
      });
    }
    if (item.usedItemIds && item.usedItemIds.length > 0 && usedItemUrls.length === 0) {
      Promise.all(item.usedItemIds.map((id) => getImage(id))).then((recs) => {
        setUsedItemUrls(recs.map((r) => (r ? blobToObjectUrl(r.thumbnail) : '')).filter(Boolean));
      });
    }
    setShowModal(true);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`「${item.name || 'このアイテム'}」を削除しますか？`)) {
      onDelete(item.id);
    }
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    onRename?.(item.id, nameInput.trim());
    setEditing(false);
  }

  const cardStyle: React.CSSProperties = selected
    ? {
        background: 'var(--surface)',
        border: '2px solid var(--gold)',
        boxShadow: '0 0 0 3px var(--gold-soft), var(--shadow-card)',
        borderRadius: 20,
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        cursor: onClick ? 'pointer' : 'default',
      }
    : {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        borderRadius: 20,
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        cursor: onClick ? 'pointer' : 'default',
      };

  return (
    <>
      <div onClick={onClick} style={cardStyle} className="relative">
        {/* Image area */}
        <div
          className="aspect-square flex items-center justify-center cursor-zoom-in"
          style={{ background: 'var(--surface2)' }}
          onClick={handleImageClick}
        >
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl opacity-20">👕</span>
          )}
          {selected && (
            <span
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--gold)' }}
            >
              ✓
            </span>
          )}
        </div>

        {/* Info area */}
        <div className="p-2 pb-2.5">
          {editing ? (
            <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleRenameSubmit}
                className="w-full text-xs rounded-lg px-1.5 py-1 outline-none"
                style={{ border: '1.5px solid var(--gold)', background: 'var(--bg)' }}
              />
            </form>
          ) : (
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--ink)' }}>
                {item.name || '\u00A0'}
              </p>
              {onRename && (
                <button
                  onClick={(e) => { e.stopPropagation(); setNameInput(item.name); setEditing(true); }}
                  className="flex-shrink-0 text-xs leading-none"
                  style={{ color: 'var(--ink3)' }}
                  aria-label="名前を変更"
                >
                  ✏️
                </button>
              )}
            </div>
          )}
          <span
            className="inline-block text-[10px] font-semibold rounded-full px-2 py-0.5 mt-1"
            style={categoryStyle(item.category)}
          >
            {categoryLabel(item.category)}
          </span>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
          style={{ background: 'var(--surface2)', color: 'var(--ink3)' }}
          aria-label="削除"
        >
          ✕
        </button>
      </div>

      {/* Centered modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,25,24,0.72)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-sm mx-auto"
            style={{
              background: 'var(--surface)',
              borderRadius: 28,
              padding: '24px 20px 28px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div
              className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: 'var(--border)' }}
            />
            {fullUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fullUrl} alt={item.name} className="w-full rounded-2xl shadow-md" />
            ) : (
              <div
                className="w-full aspect-square rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--surface2)' }}
              >
                <span className="text-sm" style={{ color: 'var(--ink3)' }}>読み込み中...</span>
              </div>
            )}
            {item.name && (
              <p className="text-center mt-4 font-bold text-sm" style={{ color: 'var(--ink)' }}>
                {item.name}
              </p>
            )}
            {usedItemUrls.length > 0 && (
              <div className="mt-4">
                <p
                  className="text-xs text-center mb-3 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--ink3)' }}
                >
                  使用したアイテム
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {usedItemUrls.map((u, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={u}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover"
                      style={{ border: '1.5px solid var(--border)' }}
                    />
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors"
              style={{ background: 'var(--surface2)', color: 'var(--ink2)' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
