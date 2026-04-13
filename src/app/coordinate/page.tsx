'use client';

import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useCloset } from '@/hooks/useCloset';
import { getImage, saveImage } from '@/lib/imageDb';
import { blobToObjectUrl } from '@/lib/imageUtils';
import { addGeneratedImage, addItem } from '@/lib/storage';
import { ClothingItem } from '@/types';

const MAX_SINGLE = 8;
const MAX_WARDROBE = 20;
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

type Gender = 'male' | 'female';
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
  const { tops, bottoms, outers, accessories, items } = useCloset();
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [gender, setGender] = useState<Gender>('female');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const selectedTops = tops.filter((t) => selectedIds.includes(t.id));
  const selectedBottoms = bottoms.filter((b) => selectedIds.includes(b.id));
  const selectedItems = items.filter((i) => selectedIds.includes(i.id));

  function toggleSingle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id)
        : prev.length < MAX_SINGLE ? [...prev, id] : prev
    );
  }

  async function handleGenerateSingle() {
    if (selectedIds.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const [topsInput, bottomsInput] = await Promise.all([
        Promise.all(selectedTops.map(toGarmentInput)),
        Promise.all(selectedBottoms.map(toGarmentInput)),
      ]);
      const outersInput = await Promise.all(outers.filter((o) => selectedIds.includes(o.id)).map(toGarmentInput));
      const accessoriesInput = await Promise.all(accessories.filter((a) => selectedIds.includes(a.id)).map(toGarmentInput));
      const res = await fetch('/api/generate-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tops: topsInput, bottoms: bottomsInput, outers: outersInput, accessories: accessoriesInput, gender }),
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

  function handleSaveAiToCloset() {
    if (!aiResult) return;
    addItem({ id: aiResult.genId, name: aiResult.name || 'コーデ', category: 'coordinate', createdAt: new Date().toISOString(), usedItemIds: selectedIds });
    setAiResult((prev) => prev ? { ...prev, saved: true } : null);
  }

const [wardrobeIds, setWardrobeIds] = useState<string[]>([]);
  const [numOutfits, setNumOutfits] = useState(3);
  const [multiResults, setMultiResults] = useState<AiResult[]>([]);
  const [multiLoading, setMultiLoading] = useState(false);
  const [multiError, setMultiError] = useState<string | null>(null);
  const [multiProgress, setMultiProgress] = useState(0);

  const wardrobeItems = items.filter((i) => wardrobeIds.includes(i.id) && i.category !== 'coordinate');

  function toggleWardrobe(id: string) {
    setWardrobeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id)
        : prev.length < MAX_WARDROBE ? [...prev, id] : prev
    );
  }

  async function handleGenerateMulti() {
    if (wardrobeIds.length === 0) return;
    setMultiLoading(true);
    setMultiError(null);
    setMultiResults([]);
    setMultiProgress(0);
    try {
      const wardrobeInput = await Promise.all(wardrobeItems.map(toGarmentInput));
      const results: AiResult[] = [];
      for (let i = 0; i < numOutfits; i++) {
        const res = await fetch('/api/generate-outfit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wardrobe: wardrobeInput, gender, variationIndex: i }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? `HTTP ${res.status}`); }
        const { imageData, mimeType } = await res.json();
        const genId = await saveGeneratedBlob(imageData, mimeType, wardrobeIds);
        results.push({ url: `data:${mimeType};base64,${imageData}`, genId, name: '', saved: false });
        setMultiResults([...results]);
        setMultiProgress(i + 1);
      }
    } catch (err) {
      setMultiError(err instanceof Error ? err.message : '生成に失敗しました');
    } finally {
      setMultiLoading(false);
    }
  }

  function handleSaveMultiToCloset(idx: number) {
    const r = multiResults[idx];
    if (!r) return;
    addItem({ id: r.genId, name: r.name || 'コーデ', category: 'coordinate', createdAt: new Date().toISOString(), usedItemIds: wardrobeIds });
    setMultiResults((prev) => prev.map((x, i) => i === idx ? { ...x, saved: true } : x));
  }

  const allSelectableItems = [...tops, ...bottoms, ...outers, ...accessories];
  const atMaxSingle = selectedIds.length >= MAX_SINGLE;
  const atMaxWardrobe = wardrobeIds.length >= MAX_WARDROBE;

  return (
    <div className="max-w-sm mx-auto px-4 pt-10 pb-28 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-black" style={{ letterSpacing: '-0.03em', color: 'var(--ink)' }}>
          コーデを作る
        </h1>
        <div className="w-7 h-0.5 rounded-full mt-2" style={{ background: 'var(--gold)' }} />
      </div>

      {/* Gender selector */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-[11px] font-semibold self-center px-2" style={{ color: 'var(--ink3)' }}>
          マネキンを選ぶ
        </p>
        {(['female', 'male'] as Gender[]).map((g) => (
          <button
            key={g}
            onClick={() => setGender(g)}
            className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all"
            style={
              gender === g
                ? { background: 'var(--ink)', color: 'var(--bg)' }
                : { background: 'transparent', color: 'var(--ink2)' }
            }
          >
            {g === 'female' ? '女性' : '男性'}
          </button>
        ))}
      </div>

      {/* Mode tabs (underline style) */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex">
          {(['single', 'multi'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2.5 text-[12px] font-bold transition-all"
              style={{
                color: mode === m ? 'var(--ink)' : 'var(--ink3)',
                marginBottom: -1,
                background: 'transparent',
                border: 'none',
                borderBottom: mode === m ? '2px solid var(--gold)' : '2px solid transparent',
              } as React.CSSProperties}
            >
              {m === 'single' ? '自分でコーデする' : 'AIにコーデしてもらう'}
            </button>
          ))}
        </div>
      </div>

      {/* Single mode */}
      {mode === 'single' && (
        <>
          <div style={cardStyle}>
            <p style={sectionLabelStyle}>
              アイテムを選ぶ（最大{MAX_SINGLE}枚）
              {selectedIds.length > 0 && (
                <span className="ml-1.5 font-bold" style={{ color: 'var(--gold)' }}>
                  {selectedIds.length}/{MAX_SINGLE}
                </span>
              )}
            </p>

            <div>
              <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>トップス</p>
              {tops.length === 0
                ? <p className="text-xs italic" style={{ color: 'var(--ink3)' }}>登録されていません</p>
                : <div className="flex gap-2 overflow-x-auto pb-1">
                    {tops.map((item) => (
                      <ItemThumb key={item.id} item={item}
                        selected={selectedIds.includes(item.id)}
                        disabled={atMaxSingle && !selectedIds.includes(item.id)}
                        onSelect={() => toggleSingle(item.id)}
                      />
                    ))}
                  </div>
              }
            </div>

            <div>
              <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>ボトムス</p>
              {bottoms.length === 0
                ? <p className="text-xs italic" style={{ color: 'var(--ink3)' }}>登録されていません</p>
                : <div className="flex gap-2 overflow-x-auto pb-1">
                    {bottoms.map((item) => (
                      <ItemThumb key={item.id} item={item}
                        selected={selectedIds.includes(item.id)}
                        disabled={atMaxSingle && !selectedIds.includes(item.id)}
                        onSelect={() => toggleSingle(item.id)}
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
                      selected={selectedIds.includes(item.id)}
                      disabled={atMaxSingle && !selectedIds.includes(item.id)}
                      onSelect={() => toggleSingle(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {accessories.length > 0 && (
              <div>
                <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>アクセサリー</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {accessories.map((item) => (
                    <ItemThumb key={item.id} item={item}
                      selected={selectedIds.includes(item.id)}
                      disabled={atMaxSingle && !selectedIds.includes(item.id)}
                      onSelect={() => toggleSingle(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* AI generation card */}
          <div style={cardStyle}>
            <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
              AI でコーデ画像を生成
            </p>

            <button
              onClick={handleGenerateSingle}
              disabled={selectedIds.length === 0 || aiLoading}
              className="rounded-[18px] px-6 py-5 font-bold text-base transition flex items-center justify-center gap-2"
              style={{
                background: selectedIds.length === 0 || aiLoading ? 'var(--surface2)' : 'var(--ink)',
                color: selectedIds.length === 0 || aiLoading ? 'var(--ink3)' : 'var(--bg)',
              }}
            >
              <span style={{ color: selectedIds.length === 0 || aiLoading ? 'var(--ink3)' : 'var(--gold)' }}>✦</span>
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
                      onClick={handleSaveAiToCloset}
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
        </>
      )}

      {/* Multi mode */}
      {mode === 'multi' && (
        <>
          <div style={cardStyle}>
            <p style={sectionLabelStyle}>
              服を選ぶ（最大{MAX_WARDROBE}枚）
              {wardrobeIds.length > 0 && (
                <span className="ml-1.5 font-bold" style={{ color: 'var(--gold)' }}>
                  {wardrobeIds.length}/{MAX_WARDROBE}
                </span>
              )}
            </p>
            {allSelectableItems.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--ink3)' }}>服が登録されていません</p>
            ) : (
              <div className="flex flex-col gap-3">
                {tops.length > 0 && (
                  <div>
                    <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>トップス</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {tops.map((item) => (
                        <ItemThumb key={item.id} item={item}
                          selected={wardrobeIds.includes(item.id)}
                          disabled={atMaxWardrobe && !wardrobeIds.includes(item.id)}
                          onSelect={() => toggleWardrobe(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {bottoms.length > 0 && (
                  <div>
                    <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>ボトムス</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {bottoms.map((item) => (
                        <ItemThumb key={item.id} item={item}
                          selected={wardrobeIds.includes(item.id)}
                          disabled={atMaxWardrobe && !wardrobeIds.includes(item.id)}
                          onSelect={() => toggleWardrobe(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {outers.length > 0 && (
                  <div>
                    <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>アウター</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {outers.map((item) => (
                        <ItemThumb key={item.id} item={item}
                          selected={wardrobeIds.includes(item.id)}
                          disabled={atMaxWardrobe && !wardrobeIds.includes(item.id)}
                          onSelect={() => toggleWardrobe(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {accessories.length > 0 && (
                  <div>
                    <p style={{ ...sectionLabelStyle, marginBottom: 6 }}>アクセサリー</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {accessories.map((item) => (
                        <ItemThumb key={item.id} item={item}
                          selected={wardrobeIds.includes(item.id)}
                          disabled={atMaxWardrobe && !wardrobeIds.includes(item.id)}
                          onSelect={() => toggleWardrobe(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>生成枚数</p>
                <span className="font-black text-lg" style={{ color: 'var(--gold)' }}>{numOutfits}枚</span>
              </div>
              <input
                type="range" min={1} max={10} step={1}
                value={numOutfits}
                onChange={(e) => setNumOutfits(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--gold)' }}
              />
              <div className="flex justify-between text-xs px-0.5" style={{ color: 'var(--ink3)' }}>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => <span key={n}>{n}</span>)}
              </div>
            </div>

            <button
              onClick={handleGenerateMulti}
              disabled={wardrobeIds.length === 0 || multiLoading}
              className="rounded-[18px] px-6 py-5 font-bold text-base transition flex items-center justify-center gap-2"
              style={{
                background: wardrobeIds.length === 0 || multiLoading ? 'var(--surface2)' : 'var(--ink)',
                color: wardrobeIds.length === 0 || multiLoading ? 'var(--ink3)' : 'var(--bg)',
              }}
            >
              <span style={{ color: wardrobeIds.length === 0 || multiLoading ? 'var(--ink3)' : 'var(--gold)' }}>✦</span>
              {multiLoading ? `生成中 ${multiProgress}/${numOutfits}...` : 'AI にコーデしてもらう'}
            </button>

            {multiLoading && (
              <div className="flex flex-col gap-2">
                <ProgressBar loading={multiLoading} />
                <p className="text-xs text-center" style={{ color: 'var(--ink3)' }}>
                  {multiProgress}/{numOutfits} 完了
                </p>
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

            {multiError && <p className="text-xs" style={{ color: '#DC2626' }}>{multiError}</p>}
          </div>

          {multiResults.length > 0 && (
            <div className="flex flex-col gap-4">
              {multiResults.map((result, idx) => (
                <div key={result.genId} style={cardStyle}>
                  <p style={sectionLabelStyle}>コーデ {idx + 1}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.url}
                    alt={`コーデ${idx + 1}`}
                    className="w-full rounded-xl shadow-sm"
                    style={{ border: '1px solid var(--border)' }}
                  />
                  <p className="text-xs text-center" style={{ color: 'var(--ink3)' }}>
                    生成された画像はイメージであり、実際と異なる場合があります
                  </p>
                  {result.saved ? (
                    <p className="text-xs text-center font-semibold" style={{ color: 'var(--gold)' }}>
                      ✓ クローゼットに追加しました
                    </p>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={result.name}
                        onChange={(e) => setMultiResults((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                        placeholder="コーデ名（任意）"
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--gold)'; e.target.style.boxShadow = '0 0 0 3px var(--gold-soft)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                      />
                      <button
                        onClick={() => handleSaveMultiToCloset(idx)}
                        className="rounded-xl px-6 py-2.5 font-bold text-sm transition"
                        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
                      >
                        クローゼットのコーデに追加
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
