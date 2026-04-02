'use client';

import { useCallback, useRef, useState } from 'react';
import { ClothingCategory } from '@/types';

interface Props {
  onSubmit: (file: File, name: string, category: ClothingCategory) => Promise<void>;
}

export default function UploadForm({ onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClothingCategory>('top');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => { setPreviewUrl(ev.target?.result as string); };
    reader.readAsDataURL(f);
    setFile(f);
  }, []);

  function openPicker() { inputRef.current?.click(); }

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
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setCategory('top')}
            style={catBtn(category === 'top', 'top')}
          >
            トップス
          </button>
          <button
            type="button"
            onClick={() => setCategory('bottom')}
            style={catBtn(category === 'bottom', 'bottom')}
          >
            ボトムス
          </button>
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
  );
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

function catBtn(active: boolean, type: 'top' | 'bottom'): React.CSSProperties {
  if (active) {
    return {
      flex: 1, padding: '12px 0',
      borderRadius: 14,
      fontSize: 13, fontWeight: 700,
      fontFamily: 'inherit',
      cursor: 'pointer',
      border: type === 'top' ? '1.5px solid var(--sage)' : '1.5px solid var(--terra)',
      background: type === 'top' ? 'var(--sage-bg)' : 'var(--terra-bg)',
      color: type === 'top' ? 'var(--sage)' : 'var(--terra)',
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
