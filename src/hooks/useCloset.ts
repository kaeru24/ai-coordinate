'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClothingItem } from '@/types';
import { addItem, deleteItem, getItems, updateItem } from '@/lib/storage';
import { deleteImage, saveImage } from '@/lib/imageDb';
import { compressImage } from '@/lib/imageUtils';
import { FULL_MAX, THUMB_MAX } from '@/lib/constants';

export function useCloset() {
  const [items, setItems] = useState<ClothingItem[]>([]);

  useEffect(() => {
    setItems(getItems());
    function onFocus() { setItems(getItems()); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const add = useCallback(async (item: ClothingItem, file: File) => {
    const [thumbnail, full] = await Promise.all([
      compressImage(file, THUMB_MAX),
      compressImage(file, FULL_MAX),
    ]);
    await saveImage(item.id, { thumbnail, full });
    addItem(item);
    setItems(getItems());
  }, []);

  const remove = useCallback(async (id: string) => {
    deleteItem(id);
    await deleteImage(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const rename = useCallback((id: string, name: string) => {
    updateItem(id, { name });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)));
  }, []);

  const tops = useMemo(() => items.filter((i) => i.category === 'top'), [items]);
  const bottoms = useMemo(() => items.filter((i) => i.category === 'bottom'), [items]);

  return { items, tops, bottoms, add, remove, rename };
}
