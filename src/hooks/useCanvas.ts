'use client';

import { RefObject, useEffect } from 'react';
import { CANVAS_HEIGHT, CANVAS_SEAM, CANVAS_WIDTH } from '@/lib/constants';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function useCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  topUrl: string | null,
  bottomUrl: string | null,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;

    async function render() {
      ctx!.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx!.fillStyle = '#f8f8f8';
      ctx!.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (bottomUrl) {
        try {
          const img = await loadImage(bottomUrl);
          if (cancelled) return;
          const scale = CANVAS_WIDTH / img.naturalWidth;
          const drawH = img.naturalHeight * scale;
          ctx!.drawImage(img, 0, CANVAS_SEAM, CANVAS_WIDTH, drawH);
        } catch {
          // skip
        }
      }

      if (topUrl) {
        try {
          const img = await loadImage(topUrl);
          if (cancelled) return;
          const scale = CANVAS_WIDTH / img.naturalWidth;
          const drawH = img.naturalHeight * scale;
          ctx!.drawImage(img, 0, 0, CANVAS_WIDTH, drawH);
        } catch {
          // skip
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [canvasRef, topUrl, bottomUrl]);
}
