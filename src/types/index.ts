export type ClothingCategory = 'top' | 'bottom' | 'outer' | 'accessory' | 'coordinate';

export interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  createdAt: string;
  usedItemIds?: string[];
}

export interface GeneratedImage {
  id: string;
  createdAt: string;
  usedItemIds?: string[];
}

export interface ImageRecord {
  thumbnail: Blob;
  full: Blob;
}
