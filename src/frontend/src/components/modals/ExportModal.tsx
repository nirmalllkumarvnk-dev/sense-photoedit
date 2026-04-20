/**
 * ExportModal.tsx — Export the canvas as PNG or JPEG.
 *
 * Controls:
 *   - Format selector (PNG / JPEG)
 *   - JPEG quality slider (1–100 %)
 *   - Filename input
 *   - Export dimensions preview
 *   - "Export" button — triggers canvas download via useCanvasExport hook
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { useEditor } from "../../hooks/useEditor";
import type { ExportFormat } from "../../types/editor";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExportModalProps {
  onClose: () => void;
}

// ─── Inline PS-style slider ───────────────────────────────────────────────────

function PsSlider({
  id,
  min,
  max,
  value,
  onChange,
}: {
  id?: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative h-4 flex items-center">
      <div
        className="absolute inset-x-0 h-1.5 rounded-sm"
        style={{ backgroundColor: "var(--ps-bg, #2b2b2b)" }}
      />
      <div
        className="absolute left-0 h-1.5 rounded-sm"
        style={{
          width: `${pct}%`,
          backgroundColor: "var(--ps-accent, #2db8ff)",
        }}
      />
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-x-0 w-full opacity-0 h-4 cursor-pointer"
        style={{ zIndex: 1 }}
      />
    </div>
  );
}

// ─── Format Pill ─────────────────────────────────────────────────────────────

function FormatPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-1.5 text-xs font-semibold rounded-sm transition-colors"
      style={{
        backgroundColor: active ? "var(--ps-accent)" : "var(--ps-bg)",
        color: active ? "#000" : "rgba(255,255,255,0.5)",
        border: "1px solid var(--ps-border)",
      }}
    >
      {label}
    </button>
  );
}

// ─── ExportModal ──────────────────────────────────────────────────────────────

export function ExportModal({ onClose }: ExportModalProps) {
  const { state, fabricRef } = useEditor();
  const { project } = state;

  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(90);
  const [filename, setFilename] = useState(
    project.name.replace(/\s+/g, "_").toLowerCase() || "export",
  );
  const [isExporting, setIsExporting] = useState(false);

  // Full filename with extension
  const fullFilename = `${filename || "export"}.${format === "jpg" ? "jpg" : format}`;

  // ── Export handler ─────────────────────────────────────────────────────────
  async function handleExport() {
    setIsExporting(true);

    try {
      // Use the Fabric.js canvas ref from editor context — reliable, no DOM query needed
      const fabricCanvas = fabricRef.current;

      if (fabricCanvas) {
        // Export via Fabric's toDataURL for full fidelity (objects, filters, etc.)
        // Fabric uses "jpeg" not "jpg" — map accordingly
        const fabricFormat = format === "jpg" ? "jpeg" : format;
        const dataUrl = fabricCanvas.toDataURL({
          format: fabricFormat,
          quality: quality / 100,
          multiplier: 1,
        });
        const link = document.createElement("a");
        link.download = fullFilename;
        link.href = dataUrl;
        link.click();
      } else {
        // Fallback: create a plain canvas matching the project dimensions
        const fallback = document.createElement("canvas");
        fallback.width = state.canvas.width;
        fallback.height = state.canvas.height;
        const ctx = fallback.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, fallback.width, fallback.height);
        }
        downloadCanvas(fallback, fullFilename, format, quality / 100);
      }
    } finally {
      setIsExporting(false);
      onClose();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      data-ocid="export.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-sm shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--ps-panel, #3d3d3d)",
          border: "1px solid var(--ps-border, #555)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            backgroundColor: "var(--ps-panel-header, #4a4a4a)",
            borderBottom: "1px solid var(--ps-border, #555)",
          }}
        >
          <div className="flex items-center gap-2">
            <Download size={14} style={{ color: "var(--ps-accent)" }} />
            <span className="text-sm font-semibold text-foreground">
              Export As
            </span>
          </div>
          <button
            type="button"
            data-ocid="export.close_button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="p-1 rounded-sm hover:bg-white/10 transition-colors text-foreground/40 hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-4 py-4 space-y-4">
          {/* Format selector */}
          <div>
            <Label className="ps-label mb-2 block">Format</Label>
            <div className="flex gap-2" data-ocid="export.format_select">
              <FormatPill
                label="PNG"
                active={format === "png"}
                onClick={() => setFormat("png")}
              />
              <FormatPill
                label="JPEG"
                active={format === "jpg"}
                onClick={() => setFormat("jpg")}
              />
              <FormatPill
                label="WEBP"
                active={format === "webp"}
                onClick={() => setFormat("webp")}
              />
            </div>
          </div>

          {/* JPEG quality slider — only visible for lossy formats */}
          {format !== "png" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="ps-label" htmlFor="quality-slider">
                  Quality
                </Label>
                <span className="text-xs font-mono text-foreground/60">
                  {quality}%
                </span>
              </div>
              <PsSlider
                id="quality-slider"
                min={1}
                max={100}
                value={quality}
                onChange={setQuality}
              />
            </div>
          )}

          {/* Filename */}
          <div>
            <Label className="ps-label mb-1.5 block" htmlFor="filename-input">
              File Name
            </Label>
            <div className="flex items-center gap-0">
              <Input
                id="filename-input"
                data-ocid="export.filename_input"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="export"
                className="h-8 text-xs rounded-r-none rounded-l-sm flex-1"
                style={{
                  backgroundColor: "var(--ps-bg)",
                  border: "1px solid var(--ps-border)",
                  color: "white",
                }}
              />
              <div
                className="h-8 px-2 flex items-center text-xs font-mono text-foreground/40 rounded-r-sm shrink-0"
                style={{
                  backgroundColor: "var(--ps-canvas)",
                  border: "1px solid var(--ps-border)",
                  borderLeft: "none",
                }}
              >
                .{format === "jpg" ? "jpg" : format}
              </div>
            </div>
          </div>

          {/* Dimensions preview */}
          <div
            className="px-3 py-2 rounded-sm"
            style={{
              backgroundColor: "var(--ps-canvas, #1a1a1a)",
              border: "1px solid var(--ps-border, #555)",
            }}
          >
            <p className="ps-label mb-1">Export Preview</p>
            <p className="text-xs font-mono text-foreground/50">
              {state.canvas.width} × {state.canvas.height} px
              {" · "}
              {format.toUpperCase()}
              {format !== "png" && ` · ${quality}% quality`}
            </p>
            <p className="text-xs font-mono text-foreground/30 mt-0.5">
              → {fullFilename}
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--ps-border, #555)" }}
        >
          <Button
            data-ocid="export.cancel_button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 text-xs text-foreground/50 hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            data-ocid="export.submit_button"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="h-7 text-xs font-semibold rounded-sm px-4"
            style={{
              backgroundColor: "var(--ps-accent, #2db8ff)",
              color: "#000",
            }}
          >
            <Download size={12} className="mr-1.5" />
            {isExporting ? "Exporting…" : "Export"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Download helper ──────────────────────────────────────────────────────────

function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  format: ExportFormat,
  quality: number,
) {
  const mimeMap: Record<ExportFormat, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp",
  };
  const mime = mimeMap[format];
  const dataUrl = canvas.toDataURL(mime, quality);

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
