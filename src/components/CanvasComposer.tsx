'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/lib/constants';

export interface CanvasComposerHandle {
  getBlob: () => Promise<Blob | null>;
}

interface Props {
  topUrl: string | null;
  bottomUrl: string | null;
}

const CanvasComposer = forwardRef<CanvasComposerHandle, Props>(({ topUrl, bottomUrl }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCanvas(canvasRef, topUrl, bottomUrl);

  useImperativeHandle(ref, () => ({
    getBlob: () =>
      new Promise((resolve) => {
        canvasRef.current?.toBlob((blob) => resolve(blob), 'image/png');
        if (!canvasRef.current) resolve(null);
      }),
  }));

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full max-w-xs mx-auto rounded-2xl border border-gray-200 shadow"
      style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
    />
  );
});

CanvasComposer.displayName = 'CanvasComposer';
export default CanvasComposer;
