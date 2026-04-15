'use client';

import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useCloset } from '@/hooks/useCloset';
import { getImage, saveImage } from '@/lib/imageDb';
import { blobToObjectUrl } from '@/lib/imageUtils';
import { addGeneratedImage, addItem } from '@/lib/storage';
import { ClothingItem } from '@/types';

const PROGRESS_DURATION = 25000;

function ItemThumb({
  item, selected, disabled, onSelect,
}: {
  item: ClothingItem; selected: boolean; disabled: boolean; onSelect: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    getImage(item.id).then((rec) => {
      if (rec) { objectUrl = blobToObjectUrl(rec.thumbnail); setThumbUrl(objectUrl); }
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.id]);

  return (
    <button
      onClick={onSelect}
      disabled={disabled && !selected}
      className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden relative transition-all"
      style={{
        border: selected ? '2px solid var(--gold)' : '1.5px solid var(--border)',
        boxShadow: selected ? '0 0 0 2px var(--gold-soft)' : 'none',
        opacity: disabled && !selected ? 0.35 : 1,
        background: 'var(--surface2)',
      }}
    >
      {thumbUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={thumbUrl} alt={item.name} className="w-full h-full object-cover" />
        : <span className="text-xl flex items-center justify-center h-full opacity-30">
            {item.category === 'top' ? '👕' : '👖'}
          </span>
      }
      {selected && (
        <span
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-white"
          style={{ background: 'var(--gold)' }}
        >
          ✓
        </span>
      )}
    </button>
  );
}

function ProgressBar({ loading }: { loading: boolean }) {
  const [width, setWidth] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading) {
      setWidth(loading ? 100 : 0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    setWidth(0);
    startRef.current = Date.now();
    function tick() {
      const elapsed = Date.now() - (startRef.current ?? Date.now());
      const ratio = elapsed / PROGRESS_DURATION;
      const w = 90 * (1 - Math.exp(-ratio * 2));
      setWidth(Math.min(w, 90));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loading]);

  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${loading ? width : 100}%`,
          background: 'linear-gradient(90deg, var(--gold), #D4B87A)',
        }}
      />
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const mimeType = result.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      resolve({ data: result.split(',')[1], mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function toGarmentInput(item: ClothingItem) {
  const rec = await getImage(item.id);
  if (!rec) return { name: item.name, image: null, mimeType: null };
  const { data, mimeType } = await blobToBase64(rec.full);
  return { name: item.name, image: data, mimeType };
}

async function saveGeneratedBlob(imageData: string, mimeType: string, usedItemIds?: string[]) {
  const byteString = atob(imageData);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const blob = new Blob([ab], { type: mimeType });
  const genId = uuid();
  await saveImage(genId, { thumbnail: blob, full: blob });
  addGeneratedImage({ id: genId, createdAt: new Date().toISOString(), usedItemIds });
  return genId;
}

type AiResult = { url: string; genId: string; name: string; saved: boolean };

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--border)',
  borderRadius: 12,
  padding: '11px 14px',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--ink)',
  background: 'var(--bg)',
  outline: 'none',
  boxSizing: 'border-box',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  color: 'var(--ink3)',
  marginBottom: 8,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 20,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

export default function CoordinatePage() {
  const { tops, bottoms, outers } = useCloset();
  const [selTop, setSelTop] = useState<string | null>(null);
  const [selBottom, setSelBottom] = useState<string | null>(null);
  const [selOuter, setSelOuter] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const selectedIds = [selTop, selBottom, selOuter].filter(Boolean) as string[];
  const hasAnySelected = selectedIds.length > 0;

  function toggleCat(id: string, current: string | null, set: (v: string | null) => void) {
    set(current === id ? null : id);
  }

  async function handleGenerate() {
    if (!hasAnySelected) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const selectedTop = tops.find((t) => t.id === selTop);
      const selectedBottom = bottoms.find((b) => b.id === selBottom);
      const selectedOuter = outers.find((o) => o.id === selOuter);
      const [topsInput, bottomsInput, outersInput] = await Promise.all([
        selectedTop ? Promise.all([toGarmentInput(selectedTop)]) : Promise.resolve([]),
        selectedBottom ? Promise.all([toGarmentInput(selectedBottom)]) : Promise.resolve([]),
        selectedOuter ? Promise.all([toGarmentInput(selectedOuter)]) : Promise.resolve([]),
      ]);
      const res = await fetch('/api/generate-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tops: topsInput, bottoms: bottomsInput, outers: outersInput }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? `HTTP ${res.status}`); }
      const { imageData, mimeType } = await res.json();
      const genId = await saveGeneratedBlob(imageData, mimeType, selectedIds);
      setAiResult({ url: `data:${mimeType};base64,${imageData}`, genId, name: '', saved: false });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : '生成に失敗しました');
    } finally {
      setAiLoading(false);
    }
  }

  function handleSaveToCloset() {
    if (!aiResult) return;
    addItem({ id: aiResult.genId, name: aiResult.name || 'コーデ', category: 'coordinate', createdAt: new Date().toISOString(), usedItemIds: selectedIds });
    setAiResult((prev) => prev ? { ...prev, saved: true } : null);
  }

  return (
    <div className="max-w-sm mx-auto px-4 pt-10 pb-28 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-black" style={{ letterSpacing: '-0.03em', color: 'var(--ink)' }}>
          コーデを作る
        </h1>
        <div className="w-7 h-0.5 rounded-full mt-2" style={{ background: 'var(--gold)' }} />
      </div>

      {/* Item selection */}
      <div style={cardStyle}>
        <p style={sectionLabelStyle}>アイテムを選ぶ（各カテゴリ1枚）</p>

        <div>
          <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>トップス</p>
          {tops.length === 0
            ? <p className="text-xs italic" style={{ color: 'var(--ink3)' }}>登録されていません</p>
            : <div className="flex gap-2 overflow-x-auto pb-1">
                {tops.map((item) => (
                  <ItemThumb key={item.id} item={item}
                    selected={selTop === item.id}
                    disabled={false}
                    onSelect={() => toggleCat(item.id, selTop, setSelTop)}
                  />
                ))}
              </div>
          }
        </div>

        {outers.length > 0 && (
          <div>
            <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>アウター</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {outers.map((item) => (
                <ItemThumb key={item.id} item={item}
                  selected={selOuter === item.id}
                  disabled={false}
                  onSelect={() => toggleCat(item.id, selOuter, setSelOuter)}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>ボトムス</p>
          {bottoms.length === 0
            ? <p className="text-xs italic" style={{ color: 'var(--ink3)' }}>登録されていません</p>
            : <div className="flex gap-2 overflow-x-auto pb-1">
                {bottoms.map((item) => (
                  <ItemThumb key={item.id} item={item}
                    selected={selBottom === item.id}
                    disabled={false}
                    onSelect={() => toggleCat(item.id, selBottom, setSelBottom)}
                  />
                ))}
              </div>
          }
        </div>
      </div>

      {/* AI generation card */}
      <div style={cardStyle}>
        <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
          AI でコーデ画像を生成
        </p>

        <button
          onClick={handleGenerate}
          disabled={!hasAnySelected || aiLoading}
          className="rounded-[18px] px-6 py-5 font-bold text-base transition flex items-center justify-center gap-2"
          style={{
            background: !hasAnySelected || aiLoading ? 'var(--surface2)' : 'var(--ink)',
            color: !hasAnySelected || aiLoading ? 'var(--ink3)' : 'var(--bg)',
          }}
        >
          <span style={{ color: !hasAnySelected || aiLoading ? 'var(--ink3)' : 'var(--gold)' }}>✦</span>
          {aiLoading ? '生成中...' : 'AI でコーデ画像を生成'}
        </button>

        {aiLoading && (
          <div className="flex flex-col gap-2">
            <ProgressBar loading={aiLoading} />
            <p className="text-xs text-center" style={{ color: 'var(--ink3)' }}>画像を生成しています...</p>
            <div
              className="rounded-xl p-3 text-xs text-center leading-relaxed"
              style={{ background: 'var(--surface2)', color: 'var(--ink2)' }}
            >
              生成には10秒ほど時間がかかります。<br />
              完了するまでブラウザを閉じたり<br />
              前のページに戻らないでください。
            </div>
          </div>
        )}

        {aiError && <p className="text-xs" style={{ color: '#DC2626' }}>{aiError}</p>}

        {aiResult && !aiLoading && (
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={aiResult.url}
              alt="AIが生成したコーデ"
              className="w-full rounded-xl shadow-sm"
              style={{ border: '1px solid var(--border)' }}
            />
            <p className="text-xs text-center" style={{ color: 'var(--ink3)' }}>
              生成された画像はイメージであり、実際と異なる場合があります
            </p>
            {aiResult.saved ? (
              <p className="text-xs text-center font-semibold" style={{ color: 'var(--gold)' }}>
                ✓ クローゼットに追加しました
              </p>
            ) : (
              <>
                <input
                  type="text"
                  value={aiResult.name}
                  onChange={(e) => setAiResult((prev) => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="コーデ名（任意）"
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px var(--gold-soft)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  onClick={handleSaveToCloset}
                  className="rounded-xl px-6 py-2.5 font-bold text-sm transition"
                  style={{ background: 'var(--ink)', color: 'var(--bg)' }}
                >
                  クローゼットのコーデに追加
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
