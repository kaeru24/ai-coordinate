'use client';

import { useCallback, useRef, useState } from 'react';
import { ClothingCategory } from '@/types';

interface Props {
  onSubmit: (file: File, name: string, category: ClothingCategory) => Promise<void>;
}

/* ─── Crop Modal ─── */
interface CropRect { x: number; y: number; w: number; h: number }

function CropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const dragging = useRef<{ type: 'move' | 'tl' | 'tr' | 'bl' | 'br'; startX: number; startY: number; startCrop: CropRect } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function getRelativePos(e: React.PointerEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function onPointerDown(e: React.PointerEvent, type: 'move' | 'tl' | 'tr' | 'bl' | 'br') {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getRelativePos(e);
    dragging.current = { type, startX: pos.x, startY: pos.y, startCrop: { ...crop } };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragging.current;
    if (!d) return;
    const pos = getRelativePos(e);
    const dx = pos.x - d.startX;
    const dy = pos.y - d.startY;
    const sc = d.startCrop;
    const MIN = 0.05;

    setCrop(() => {
      let { x, y, w, h } = sc;
      switch (d.type) {
        case 'move':
          x = Math.max(0, Math.min(1 - w, sc.x + dx));
          y = Math.max(0, Math.min(1 - h, sc.y + dy));
          break;
        case 'tl':
          x = Math.min(sc.x + sc.w - MIN, Math.max(0, sc.x + dx));
          y = Math.min(sc.y + sc.h - MIN, Math.max(0, sc.y + dy));
          w = sc.w - (x - sc.x);
          h = sc.h - (y - sc.y);
          break;
        case 'tr':
          y = Math.min(sc.y + sc.h - MIN, Math.max(0, sc.y + dy));
          w = Math.max(MIN, Math.min(1 - sc.x, sc.w + dx));
          h = sc.h - (y - sc.y);
          break;
        case 'bl':
          x = Math.min(sc.x + sc.w - MIN, Math.max(0, sc.x + dx));
          w = sc.w - (x - sc.x);
          h = Math.max(MIN, Math.min(1 - sc.y, sc.h + dy));
          break;
        case 'br':
          w = Math.max(MIN, Math.min(1 - sc.x, sc.w + dx));
          h = Math.max(MIN, Math.min(1 - sc.y, sc.h + dy));
          break;
      }
      return { x, y, w, h };
    });
  }

  function onPointerUp() { dragging.current = null; }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    const sx = crop.x * img.naturalWidth;
    const sy = crop.y * img.naturalHeight;
    const sw = crop.w * img.naturalWidth;
    const sh = crop.h * img.naturalHeight;
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onConfirm(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }

  const handleStyle = (top: string, left: string): React.CSSProperties => ({
    position: 'absolute',
    top, left,
    transform: 'translate(-50%, -50%)',
    width: 22, height: 22,
    background: 'white',
    border: '2px solid var(--gold)',
    borderRadius: 6,
    cursor: 'pointer',
    touchAction: 'none',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,25,24,0.9)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm flex flex-col gap-4"
        style={{ background: 'var(--surface)', borderRadius: 24, padding: 20 }}
      >
        <p className="text-center font-bold text-sm" style={{ color: 'var(--ink)' }}>
          切り取り範囲を選ぶ
        </p>

        {/* Image with crop overlay */}
        <div
          ref={containerRef}
          className="relative select-none overflow-hidden rounded-xl"
          style={{ touchAction: 'none', background: 'var(--surface2)' }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="crop"
            draggable={false}
            style={{ display: 'block', width: '100%', maxHeight: '50vh', objectFit: 'contain', userSelect: 'none' }}
          />

          {/* Dark overlay outside crop */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `
              linear-gradient(to bottom,
                rgba(0,0,0,0.55) ${crop.y * 100}%,
                transparent ${crop.y * 100}%,
                transparent ${(crop.y + crop.h) * 100}%,
                rgba(0,0,0,0.55) ${(crop.y + crop.h) * 100}%
              )
            `,
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `
              linear-gradient(to right,
                rgba(0,0,0,0.55) ${crop.x * 100}%,
                transparent ${crop.x * 100}%,
                transparent ${(crop.x + crop.w) * 100}%,
                rgba(0,0,0,0.55) ${(crop.x + crop.w) * 100}%
              )
            `,
          }} />

          {/* Crop rectangle */}
          <div
            className="absolute"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
              border: '2px solid var(--gold)',
              cursor: 'move',
              touchAction: 'none',
              boxSizing: 'border-box',
            }}
            onPointerDown={(e) => onPointerDown(e, 'move')}
          >
            {/* Corner handles */}
            <div style={handleStyle('0%', '0%')} onPointerDown={(e) => onPointerDown(e, 'tl')} />
            <div style={handleStyle('0%', '100%')} onPointerDown={(e) => onPointerDown(e, 'tr')} />
            <div style={handleStyle('100%', '0%')} onPointerDown={(e) => onPointerDown(e, 'bl')} />
            <div style={handleStyle('100%', '100%')} onPointerDown={(e) => onPointerDown(e, 'br')} />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl font-bold text-sm"
            style={{ background: 'var(--surface2)', color: 'var(--ink2)', border: '1px solid var(--border)' }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-2xl font-bold text-sm"
            style={{ background: 'var(--ink)', color: 'var(--bg)' }}
          >
            この範囲で登録
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Form ─── */

export default function UploadForm({ onSubmit }: Props) {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClothingCategory>('top');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawPreviewUrl(ev.target?.result as string);
      setShowCrop(true);
    };
    reader.readAsDataURL(f);
    setRawFile(f);
  }, []);

  function openPicker() { inputRef.current?.click(); }

  function handleCropConfirm(croppedFile: File) {
    const reader = new FileReader();
    reader.onload = (ev) => { setPreviewUrl(ev.target?.result as string); };
    reader.readAsDataURL(croppedFile);
    setFile(croppedFile);
    setShowCrop(false);
    setRawPreviewUrl(null);
    setRawFile(null);
  }

  function handleCropCancel() {
    setShowCrop(false);
    setRawPreviewUrl(null);
    setRawFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      await onSubmit(file, name.trim(), category);
      setDone(true);
      setFile(null);
      setPreviewUrl(null);
      setName('');
      setCategory('top');
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '40px 0' }}>
        <div style={{
          width: 64, height: 64,
          background: 'var(--sage-bg)',
          border: '2px solid var(--sage)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>
          ✓
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            登録しました
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 4 }}>
            クローゼットに追加されました
          </p>
        </div>
        <button onClick={() => setDone(false)} style={btnPrimary(false)}>続けて登録する</button>
      </div>
    );
  }

  return (
    <>
      {showCrop && rawPreviewUrl && (
        <CropModal
          src={rawPreviewUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {/* Photo area */}
        {previewUrl ? (
          <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '2px solid var(--gold)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="preview"
              style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'contain', background: 'var(--surface)' }}
            />
            <button
              type="button"
              onClick={openPicker}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(26,25,24,0.68)',
                backdropFilter: 'blur(4px)',
                color: 'var(--bg)',
                border: 'none', borderRadius: 10, padding: '6px 14px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              変更する
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, minHeight: 160, width: '100%',
              border: '2px dashed var(--border)',
              borderRadius: 20,
              background: 'var(--surface)',
              cursor: 'pointer',
              padding: '32px 0',
            }}
          >
            <div style={{
              width: 52, height: 52,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>
              📷
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>写真を選ぶ</p>
              <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>カメラロール / アルバム</p>
            </div>
          </button>
        )}

        {/* Name input with floating label */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', top: -8, left: 12,
            fontSize: 10, fontWeight: 700,
            color: 'var(--ink2)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: 'var(--bg)',
            padding: '0 4px',
          }}>
            アイテム名 <span style={{ color: 'var(--ink3)', textTransform: 'none', letterSpacing: 0 }}>（任意）</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 白Tシャツ、デニムパンツ"
            style={{
              width: '100%',
              border: '1.5px solid var(--border)',
              borderRadius: 14,
              padding: '13px 16px',
              fontSize: 14,
              fontFamily: 'inherit',
              color: 'var(--ink)',
              background: 'var(--bg)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--gold)';
              e.target.style.boxShadow = '0 0 0 3px var(--gold-soft)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Category buttons */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            カテゴリ
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['top', 'outer', 'bottom'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={catBtn(category === cat, cat)}
              >
                {catLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!file || saving}
          style={btnPrimary(!file || saving)}
        >
          {saving ? '保存中...' : 'クローゼットに追加'}
        </button>
      </form>
    </>
  );
}

function catLabel(cat: 'top' | 'bottom' | 'outer'): string {
  switch (cat) {
    case 'top': return 'トップス';
    case 'bottom': return 'ボトムス';
    case 'outer': return 'アウター';
  }
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '16px 0',
    background: disabled ? 'var(--surface2)' : 'var(--ink)',
    color: disabled ? 'var(--ink3)' : 'var(--bg)',
    border: 'none',
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
  };
}

function catBtn(active: boolean, type: 'top' | 'bottom' | 'outer'): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    top:    { bg: 'var(--sage-bg)',  color: 'var(--sage)',  border: 'var(--sage)' },
    bottom: { bg: 'var(--terra-bg)', color: 'var(--terra)', border: 'var(--terra)' },
    outer:  { bg: 'var(--surface2)', color: 'var(--ink2)',  border: 'var(--ink2)' },
  };
  if (active) {
    const c = colors[type];
    return {
      flex: 1, padding: '12px 0',
      borderRadius: 14,
      fontSize: 13, fontWeight: 700,
      fontFamily: 'inherit',
      cursor: 'pointer',
      border: `1.5px solid ${c.border}`,
      background: c.bg,
      color: c.color,
      transition: 'all 0.15s',
    };
  }
  return {
    flex: 1, padding: '12px 0',
    borderRadius: 14,
    fontSize: 13, fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: '1.5px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--ink2)',
    transition: 'all 0.15s',
  };
}
