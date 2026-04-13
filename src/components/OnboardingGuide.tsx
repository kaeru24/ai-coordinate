'use client';

import { useState } from 'react';
import { ONBOARDING_KEY } from '@/lib/constants';

const STEPS = [
  {
    icon: '🪡',
    title: 'MyClosetへようこそ',
    description: 'あなたのクローゼットをデジタルで管理し、AIがコーデを提案してくれるアプリです。',
  },
  {
    icon: '📷',
    title: '服を登録する',
    description: 'トップス・ボトムス・アウター・アクセサリーの写真を撮って登録します。クローゼットにアイテムが増えるほど、コーデの幅が広がります。',
  },
  {
    icon: '🪞',
    title: 'コーデを作る',
    description: 'アイテムを選んでAIにコーデ画像を生成してもらいましょう。クローゼットからベストなコーデを自動で提案してもらうこともできます。',
  },
  {
    icon: '✨',
    title: 'さっそく始めよう',
    description: 'まずは服を1枚登録してみましょう。写真を選ぶだけで簡単に追加できます。',
  },
];

interface Props {
  onClose: () => void;
}

export default function OnboardingGuide({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function handleClose() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, '1');
    }
    onClose();
  }

  function handleNext() {
    if (isLast) {
      handleClose();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,25,24,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm flex flex-col items-center"
        style={{
          background: 'var(--surface)',
          borderRadius: 28,
          padding: '36px 24px 28px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Step dots */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? 'var(--gold)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div
          className="flex items-center justify-center mb-6"
          style={{
            width: 80, height: 80,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            fontSize: 36,
          }}
        >
          {current.icon}
        </div>

        {/* Text */}
        <h2
          className="text-center font-black mb-3"
          style={{ fontSize: 20, letterSpacing: '-0.03em', color: 'var(--ink)' }}
        >
          {current.title}
        </h2>
        <p
          className="text-center leading-relaxed mb-8"
          style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7 }}
        >
          {current.description}
        </p>

        {/* Buttons */}
        {isLast ? (
          <button
            onClick={handleClose}
            className="w-full py-4 rounded-2xl font-bold text-sm transition-opacity"
            style={{ background: 'var(--ink)', color: 'var(--bg)', letterSpacing: '-0.01em' }}
          >
            はじめる
          </button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <button
              onClick={handleClose}
              className="text-sm font-semibold py-2 px-4"
              style={{ color: 'var(--ink3)', background: 'transparent', border: 'none' }}
            >
              スキップ
            </button>
            <button
              onClick={handleNext}
              className="py-3 px-6 rounded-2xl font-bold text-sm transition-opacity flex items-center gap-1.5"
              style={{ background: 'var(--ink)', color: 'var(--bg)' }}
            >
              次へ
              <span style={{ color: 'var(--gold)' }}>›</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
