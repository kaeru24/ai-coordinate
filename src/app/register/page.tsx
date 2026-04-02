'use client';

import { v4 as uuid } from 'uuid';
import { useCloset } from '@/hooks/useCloset';
import UploadForm from '@/components/UploadForm';
import { ClothingCategory } from '@/types';

export default function RegisterPage() {
  const { add } = useCloset();

  async function handleSubmit(file: File, name: string, category: ClothingCategory) {
    await add(
      {
        id: uuid(),
        name,
        category,
        createdAt: new Date().toISOString(),
      },
      file,
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 pt-10 pb-28">
      <div className="mb-6">
        <h1
          className="text-[22px] font-black"
          style={{ letterSpacing: '-0.03em', color: 'var(--ink)' }}
        >
          新しいアイテム
        </h1>
        <p className="text-[12px] mt-1" style={{ color: 'var(--ink3)' }}>
          服の写真を登録してください
        </p>
        <div className="w-7 h-0.5 rounded-full mt-2" style={{ background: 'var(--gold)' }} />
      </div>
      <UploadForm onSubmit={handleSubmit} />
    </div>
  );
}
