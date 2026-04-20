/**
 * useCanvasFilters — Image filter application for Fabric.js canvas.
 *
 * Provides helpers to apply common image filters to Fabric.js image objects:
 *   - Grayscale
 *   - Blur (0–20)
 *   - Brightness (-1 → +1)
 *   - Contrast (-1 → +1)
 *   - Reset all filters
 */

import type { Canvas as FabricCanvas, FabricImage } from "fabric";
import { filters as FabricFilters } from "fabric";

// ─── Type guard ───────────────────────────────────────────────────────────────

function isFabricImage(obj: unknown): obj is FabricImage {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as FabricImage).applyFilters === "function"
  );
}

function getTargetImages(canvas: FabricCanvas): FabricImage[] {
  const active = canvas.getActiveObject();
  if (active) {
    if (isFabricImage(active)) return [active];
    if (
      "getObjects" in active &&
      typeof (active as { getObjects: () => unknown[] }).getObjects ===
        "function"
    ) {
      const inner = (active as { getObjects: () => unknown[] }).getObjects();
      return inner.filter(isFabricImage);
    }
  }
  return canvas.getObjects().filter(isFabricImage);
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function upsertFilter(img: FabricImage, filterInstance: object): void {
  const ctor = filterInstance.constructor;
  const existing = img.filters as object[];
  const idx = existing.findIndex(
    (f) => f instanceof (ctor as new () => object),
  );
  if (idx >= 0) {
    existing[idx] = filterInstance;
  } else {
    existing.push(filterInstance);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CanvasFilters {
  applyGrayscale: (canvas: FabricCanvas) => void;
  applyBlur: (canvas: FabricCanvas, value: number) => void;
  applyBrightness: (canvas: FabricCanvas, value: number) => void;
  applyContrast: (canvas: FabricCanvas, value: number) => void;
  resetFilters: (canvas: FabricCanvas) => void;
}

export function useCanvasFilters(): CanvasFilters {
  function applyGrayscale(canvas: FabricCanvas): void {
    const images = getTargetImages(canvas);
    for (const img of images) {
      upsertFilter(img, new FabricFilters.Grayscale());
      img.applyFilters();
    }
    canvas.requestRenderAll();
  }

  function applyBlur(canvas: FabricCanvas, value: number): void {
    const clamped = Math.min(20, Math.max(0, value));
    const images = getTargetImages(canvas);
    for (const img of images) {
      const blurFilter = new FabricFilters.Blur({ blur: clamped / 20 });
      upsertFilter(img, blurFilter);
      img.applyFilters();
    }
    canvas.requestRenderAll();
  }

  function applyBrightness(canvas: FabricCanvas, value: number): void {
    const clamped = Math.min(1, Math.max(-1, value));
    const images = getTargetImages(canvas);
    for (const img of images) {
      const f = new FabricFilters.Brightness({ brightness: clamped });
      upsertFilter(img, f);
      img.applyFilters();
    }
    canvas.requestRenderAll();
  }

  function applyContrast(canvas: FabricCanvas, value: number): void {
    const clamped = Math.min(1, Math.max(-1, value));
    const images = getTargetImages(canvas);
    for (const img of images) {
      const f = new FabricFilters.Contrast({ contrast: clamped });
      upsertFilter(img, f);
      img.applyFilters();
    }
    canvas.requestRenderAll();
  }

  function resetFilters(canvas: FabricCanvas): void {
    const images = getTargetImages(canvas);
    for (const img of images) {
      img.filters = [];
      img.applyFilters();
    }
    canvas.requestRenderAll();
  }

  return {
    applyGrayscale,
    applyBlur,
    applyBrightness,
    applyContrast,
    resetFilters,
  };
}
