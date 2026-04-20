/**
 * useCanvasExport — Export helpers for the Fabric.js canvas.
 *
 * Provides:
 *   exportAsPNG(canvas, filename)          — download canvas as PNG
 *   exportAsJPG(canvas, filename, quality) — download canvas as JPEG
 *   getCanvasDataURL(canvas, format, quality) — return raw data URL
 *
 * Uses Fabric's built-in toDataURL() which renders the full canvas including
 * all layers at actual resolution.
 */

import type { Canvas as FabricCanvas } from "fabric";

export type ExportFormat = "png" | "jpeg";

// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Build a data URL from the Fabric canvas at the requested format.
 * Ensures the export is at the natural canvas resolution (multiplier 1).
 */
function buildDataURL(
  canvas: FabricCanvas,
  format: ExportFormat,
  quality = 0.92,
): string {
  return canvas.toDataURL({
    format,
    quality,
    multiplier: 1,
  });
}

/**
 * Trigger a browser download with the given data URL.
 * Creates a hidden <a> element, clicks it, then removes it.
 */
function triggerDownload(dataURL: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CanvasExport {
  /**
   * Download the canvas as a PNG file.
   * @param canvas   Fabric.js canvas instance
   * @param filename Target filename (without extension is fine — .png appended)
   */
  exportAsPNG: (canvas: FabricCanvas, filename?: string) => void;

  /**
   * Download the canvas as a JPEG file.
   * @param canvas   Fabric.js canvas instance
   * @param filename Target filename
   * @param quality  0–1 JPEG quality (default 0.92)
   */
  exportAsJPG: (
    canvas: FabricCanvas,
    filename?: string,
    quality?: number,
  ) => void;

  /**
   * Return the raw data URL without triggering a download.
   * @param format   "png" or "jpeg"
   * @param quality  0–1 (only relevant for jpeg)
   */
  getCanvasDataURL: (
    canvas: FabricCanvas,
    format?: ExportFormat,
    quality?: number,
  ) => string;
}

export function useCanvasExport(): CanvasExport {
  function exportAsPNG(canvas: FabricCanvas, filename = "canvas-export"): void {
    const name = filename.endsWith(".png") ? filename : `${filename}.png`;
    const dataURL = buildDataURL(canvas, "png", 1);
    triggerDownload(dataURL, name);
  }

  function exportAsJPG(
    canvas: FabricCanvas,
    filename = "canvas-export",
    quality = 0.92,
  ): void {
    const name =
      filename.endsWith(".jpg") || filename.endsWith(".jpeg")
        ? filename
        : `${filename}.jpg`;
    const dataURL = buildDataURL(canvas, "jpeg", quality);
    triggerDownload(dataURL, name);
  }

  function getCanvasDataURL(
    canvas: FabricCanvas,
    format: ExportFormat = "png",
    quality = 0.92,
  ): string {
    return buildDataURL(canvas, format, quality);
  }

  return { exportAsPNG, exportAsJPG, getCanvasDataURL };
}
