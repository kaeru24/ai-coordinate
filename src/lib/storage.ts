import { ClothingItem, GeneratedImage } from '@/types';
import { GENERATED_KEY, STORAGE_KEY } from './constants';

export function getItems(): ClothingItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ClothingItem[]) : [];
  } catch {
    return [];
  }
}

export function saveItems(items: ClothingItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addItem(item: ClothingItem): void {
  const items = getItems();
  items.unshift(item);
  saveItems(items);
}

export function deleteItem(id: string): void {
  saveItems(getItems().filter((i) => i.id !== id));
}

export function updateItem(id: string, updates: Partial<import('@/types').ClothingItem>): void {
  saveItems(getItems().map((i) => (i.id === id ? { ...i, ...updates } : i)));
}

export function getGeneratedImages(): GeneratedImage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GENERATED_KEY);
    return raw ? (JSON.parse(raw) as GeneratedImage[]) : [];
  } catch {
    return [];
  }
}

export function addGeneratedImage(img: GeneratedImage): void {
  const images = getGeneratedImages();
  images.unshift(img);
  localStorage.setItem(GENERATED_KEY, JSON.stringify(images));
}

export function deleteGeneratedImage(id: string): void {
  const images = getGeneratedImages().filter((i) => i.id !== id);
  localStorage.setItem(GENERATED_KEY, JSON.stringify(images));
}
