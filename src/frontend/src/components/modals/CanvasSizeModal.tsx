/**
 * CanvasSizeModal.tsx — Photoshop-style Canvas Size / New Document dialog.
 *
 * Usage in App.tsx:
 *   import { CanvasSizeModal } from "./components/modals/CanvasSizeModal";
 *   const [showCanvasSizeModal, setShowCanvasSizeModal] = useState(false);
 *   // Add to JSX:
 *   {showCanvasSizeModal && (
 *     <CanvasSizeModal
 *       isOpen={showCanvasSizeModal}
 *       onClose={() => setShowCanvasSizeModal(false)}
 *       onApply={(w, h) => { ... setShowCanvasSizeModal(false); }}
 *     />
 *   )}
 *
 * Open from Image menu > Canvas Size or a dedicated button.
 *
 * Features:
 *   - Preset buttons: A4 Portrait, A4 Landscape, Letter, 1920×1080, 1080×1080, 800×600, Custom
 *   - Width / Height with independent unit dropdowns (px/cm/inch/mm)
 *   - Chain lock icon: maintain aspect ratio when one dimension changes
 *   - Orientation toggle: Portrait / Landscape
 *   - Resolution display: fixed 96 DPI (display only)
 *   - Create / Apply and Cancel buttons
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Link2,
  Link2Off,
  Monitor,
  RotateCcw,
  SquareDashedBottom,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasUnit } from "../../types/editor";

// ─── Constants ────────────────────────────────────────────────────────────────

const DPI = 96; // Base DPI for unit conversion

/** Convert any unit value to pixels */
function convertToPx(value: number, unit: CanvasUnit): number {
  switch (unit) {
    case "px":
      return value;
    case "cm":
      return value * (DPI / 2.54);
    case "inch":
      return value * DPI;
    case "mm":
      return value * (DPI / 25.4);
  }
}

/** Convert pixels to any unit */
function convertFromPx(px: number, unit: CanvasUnit): number {
  switch (unit) {
    case "px":
      return px;
    case "cm":
      return px / (DPI / 2.54);
    case "inch":
      return px / DPI;
    case "mm":
      return px / (DPI / 25.4);
  }
}

/** Format a value based on its unit's display precision */
function formatValue(value: number, unit: CanvasUnit): string {
  switch (unit) {
    case "px":
      return String(Math.round(value));
    case "cm":
      return value.toFixed(2);
    case "inch":
      return value.toFixed(2);
    case "mm":
      return value.toFixed(1);
  }
}

// ─── Presets ──────────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  shortLabel: string;
  widthPx: number;
  heightPx: number;
}

const PRESETS: Preset[] = [
  { label: "A4 Portrait", shortLabel: "A4 ↑", widthPx: 794, heightPx: 1123 },
  { label: "A4 Landscape", shortLabel: "A4 →", widthPx: 1123, heightPx: 794 },
  { label: "Letter", shortLabel: "Letter", widthPx: 816, heightPx: 1056 },
  {
    label: "1920 × 1080 HD",
    shortLabel: "HD",
    widthPx: 1920,
    heightPx: 1080,
  },
  {
    label: "1080 × 1080 Instagram",
    shortLabel: "IG",
    widthPx: 1080,
    heightPx: 1080,
  },
  { label: "800 × 600 Web", shortLabel: "Web", widthPx: 800, heightPx: 600 },
  { label: "Custom", shortLabel: "Custom", widthPx: 0, heightPx: 0 },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CanvasSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with final pixel dimensions when user clicks Create/Apply */
  onApply: (width: number, height: number) => void;
  /** Optional initial dimensions in pixels (defaults to 1920×1080) */
  initialWidth?: number;
  initialHeight?: number;
}

type Orientation = "portrait" | "landscape";

// ─── Sub-component: Unit dropdown ─────────────────────────────────────────────

function UnitSelect({
  value,
  onChange,
  id,
}: {
  value: CanvasUnit;
  onChange: (u: CanvasUnit) => void;
  id: string;
}) {
  const units: CanvasUnit[] = ["px", "cm", "inch", "mm"];
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as CanvasUnit)}
      className="h-7 text-xs rounded-sm px-1.5 appearance-none cursor-pointer transition-colors focus:outline-none"
      style={{
        backgroundColor: "var(--ps-panel-header)",
        border: "1px solid var(--ps-border)",
        color: "var(--ps-accent)",
        minWidth: "56px",
      }}
    >
      {units.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function CanvasSizeModal({
  isOpen,
  onClose,
  onApply,
  initialWidth = 1920,
  initialHeight = 1080,
}: CanvasSizeModalProps) {
  // Internal pixel values (single source of truth)
  const [widthPx, setWidthPx] = useState(initialWidth);
  const [heightPx, setHeightPx] = useState(initialHeight);

  // Display units (can differ between width and height)
  const [widthUnit, setWidthUnit] = useState<CanvasUnit>("px");
  const [heightUnit, setHeightUnit] = useState<CanvasUnit>("px");

  // Display string inputs (may be mid-typing)
  const [widthStr, setWidthStr] = useState(formatValue(initialWidth, "px"));
  const [heightStr, setHeightStr] = useState(formatValue(initialHeight, "px"));

  // Aspect ratio lock
  const [lockAspect, setLockAspect] = useState(false);
  const aspectRatioRef = useRef(initialWidth / initialHeight);

  // Active preset (null = custom)
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Orientation
  const [orientation, setOrientation] = useState<Orientation>(
    initialWidth >= initialHeight ? "landscape" : "portrait",
  );

  // Sync aspect ref whenever dimensions are set from preset/orientation
  useEffect(() => {
    if (widthPx > 0 && heightPx > 0) {
      aspectRatioRef.current = widthPx / heightPx;
    }
  }, [widthPx, heightPx]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Apply pixel dimensions, update all display strings */
  function applyDimensions(newWidthPx: number, newHeightPx: number) {
    const clampedW = Math.max(1, Math.min(10000, Math.round(newWidthPx)));
    const clampedH = Math.max(1, Math.min(10000, Math.round(newHeightPx)));
    setWidthPx(clampedW);
    setHeightPx(clampedH);
    setWidthStr(formatValue(convertFromPx(clampedW, widthUnit), widthUnit));
    setHeightStr(formatValue(convertFromPx(clampedH, heightUnit), heightUnit));
    setOrientation(clampedW >= clampedH ? "landscape" : "portrait");
  }

  // ── Preset handling ───────────────────────────────────────────────────────

  function handlePreset(preset: Preset) {
    if (preset.label === "Custom") {
      setActivePreset("Custom");
      return;
    }
    setActivePreset(preset.label);
    aspectRatioRef.current = preset.widthPx / preset.heightPx;
    applyDimensions(preset.widthPx, preset.heightPx);
  }

  // ── Width input handling ───────────────────────────────────────────────────

  function handleWidthChange(raw: string) {
    setWidthStr(raw);
    setActivePreset("Custom");
    const numeric = Number.parseFloat(raw);
    if (!Number.isNaN(numeric) && numeric > 0) {
      const newWidthPx = convertToPx(numeric, widthUnit);
      setWidthPx(Math.round(newWidthPx));
      if (lockAspect) {
        const newHeightPx = newWidthPx / aspectRatioRef.current;
        const clamped = Math.max(1, Math.min(10000, Math.round(newHeightPx)));
        setHeightPx(clamped);
        setHeightStr(
          formatValue(convertFromPx(clamped, heightUnit), heightUnit),
        );
      }
    }
  }

  function handleWidthBlur() {
    const numeric = Number.parseFloat(widthStr);
    if (Number.isNaN(numeric) || numeric <= 0) {
      // Reset to current valid value
      setWidthStr(formatValue(convertFromPx(widthPx, widthUnit), widthUnit));
    } else {
      const px = Math.max(
        1,
        Math.min(10000, Math.round(convertToPx(numeric, widthUnit))),
      );
      setWidthPx(px);
      setWidthStr(formatValue(convertFromPx(px, widthUnit), widthUnit));
    }
  }

  // ── Height input handling ──────────────────────────────────────────────────

  function handleHeightChange(raw: string) {
    setHeightStr(raw);
    setActivePreset("Custom");
    const numeric = Number.parseFloat(raw);
    if (!Number.isNaN(numeric) && numeric > 0) {
      const newHeightPx = convertToPx(numeric, heightUnit);
      setHeightPx(Math.round(newHeightPx));
      if (lockAspect) {
        const newWidthPx = newHeightPx * aspectRatioRef.current;
        const clamped = Math.max(1, Math.min(10000, Math.round(newWidthPx)));
        setWidthPx(clamped);
        setWidthStr(formatValue(convertFromPx(clamped, widthUnit), widthUnit));
      }
    }
  }

  function handleHeightBlur() {
    const numeric = Number.parseFloat(heightStr);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setHeightStr(
        formatValue(convertFromPx(heightPx, heightUnit), heightUnit),
      );
    } else {
      const px = Math.max(
        1,
        Math.min(10000, Math.round(convertToPx(numeric, heightUnit))),
      );
      setHeightPx(px);
      setHeightStr(formatValue(convertFromPx(px, heightUnit), heightUnit));
    }
  }

  // ── Unit change handling ───────────────────────────────────────────────────

  function handleWidthUnitChange(newUnit: CanvasUnit) {
    setWidthUnit(newUnit);
    setWidthStr(formatValue(convertFromPx(widthPx, newUnit), newUnit));
  }

  function handleHeightUnitChange(newUnit: CanvasUnit) {
    setHeightUnit(newUnit);
    setHeightStr(formatValue(convertFromPx(heightPx, newUnit), newUnit));
  }

  // ── Orientation toggle ────────────────────────────────────────────────────

  function handleOrientation(dir: Orientation) {
    if (dir === orientation) return;
    setOrientation(dir);
    // Swap width and height
    const newW = heightPx;
    const newH = widthPx;
    setWidthPx(newW);
    setHeightPx(newH);
    setWidthStr(formatValue(convertFromPx(newW, widthUnit), widthUnit));
    setHeightStr(formatValue(convertFromPx(newH, heightUnit), heightUnit));
    aspectRatioRef.current = newW / newH;
  }

  // ── Aspect ratio lock toggle ──────────────────────────────────────────────

  function toggleLockAspect() {
    if (!lockAspect) {
      // Store current ratio when locking
      aspectRatioRef.current = widthPx / heightPx;
    }
    setLockAspect((v) => !v);
  }

  // ── Apply / Create ────────────────────────────────────────────────────────

  const handleApply = useCallback(() => {
    const finalW = Math.max(1, Math.min(10000, widthPx));
    const finalH = Math.max(1, Math.min(10000, heightPx));
    onApply(finalW, finalH);
  }, [widthPx, heightPx, onApply]);

  // ── Keyboard support ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") handleApply();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, handleApply]);

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  // Preview aspect ratio indicator
  const aspectW = widthPx;
  const aspectH = heightPx;
  const previewMaxW = 48;
  const previewMaxH = 48;
  const scaleW = previewMaxW / aspectW;
  const scaleH = previewMaxH / aspectH;
  const scale = Math.min(scaleW, scaleH);
  const previewW = Math.max(6, Math.round(aspectW * scale));
  const previewH = Math.max(6, Math.round(aspectH * scale));

  return (
    /* Full-screen overlay */
    <div
      data-ocid="canvas_size.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-xl mx-4 rounded shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--ps-panel)",
          border: "1px solid var(--ps-border-glow)",
          boxShadow:
            "0 0 0 1px var(--ps-border), 0 0 40px rgba(0,212,255,0.15), 0 20px 60px rgba(0,0,0,0.8)",
          animation: "fade-in 0.18s ease",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            backgroundColor: "var(--ps-panel-header)",
            borderBottom: "1px solid var(--ps-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <SquareDashedBottom
              size={15}
              style={{ color: "var(--ps-accent)" }}
            />
            <h2
              className="text-sm font-semibold font-mono tracking-wide"
              style={{ color: "var(--ps-accent)" }}
            >
              Canvas Size
            </h2>
          </div>
          <button
            type="button"
            data-ocid="canvas_size.close_button"
            onClick={onClose}
            aria-label="Close canvas size dialog"
            className="p-1 rounded-sm transition-colors hover:bg-white/10 text-foreground/40 hover:text-foreground focus:outline-none focus-visible:ring-1"
            style={
              { "--tw-ring-color": "var(--ps-accent)" } as React.CSSProperties
            }
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="p-5 space-y-4">
          {/* ── Preset row ─────────────────────────────────────── */}
          <div>
            <p className="ps-label mb-2">Preset Sizes</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => {
                const isActive = activePreset === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    data-ocid={`canvas_size.preset.${preset.shortLabel.toLowerCase().replace(/[^a-z0-9]/g, "_")}`}
                    onClick={() => handlePreset(preset)}
                    title={preset.label}
                    className="px-2.5 py-1 text-xs rounded-sm transition-all focus:outline-none focus-visible:ring-1"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(0,212,255,0.18)"
                        : "var(--ps-panel-header)",
                      border: isActive
                        ? "1px solid rgba(0,212,255,0.7)"
                        : "1px solid var(--ps-border)",
                      color: isActive
                        ? "var(--ps-accent)"
                        : "var(--ps-text-muted)",
                      boxShadow: isActive
                        ? "0 0 8px rgba(0,212,255,0.3)"
                        : "none",
                    }}
                  >
                    {preset.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Dimensions + Lock ──────────────────────────────── */}
          <div className="flex items-start gap-3">
            {/* Left: W + H inputs */}
            <div className="flex-1 space-y-3">
              {/* Width */}
              <div className="space-y-1">
                <Label htmlFor="cs-width" className="ps-label">
                  Width
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="cs-width"
                    data-ocid="canvas_size.width_input"
                    type="number"
                    min={1}
                    max={10000}
                    value={widthStr}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    onBlur={handleWidthBlur}
                    className="h-7 text-xs rounded-sm flex-1 font-mono"
                    style={{
                      backgroundColor: "var(--ps-bg)",
                      border: "1px solid var(--ps-border)",
                      color: "var(--ps-text)",
                    }}
                  />
                  <UnitSelect
                    id="cs-width-unit"
                    value={widthUnit}
                    onChange={handleWidthUnitChange}
                  />
                </div>
              </div>

              {/* Height */}
              <div className="space-y-1">
                <Label htmlFor="cs-height" className="ps-label">
                  Height
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="cs-height"
                    data-ocid="canvas_size.height_input"
                    type="number"
                    min={1}
                    max={10000}
                    value={heightStr}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    onBlur={handleHeightBlur}
                    className="h-7 text-xs rounded-sm flex-1 font-mono"
                    style={{
                      backgroundColor: "var(--ps-bg)",
                      border: "1px solid var(--ps-border)",
                      color: "var(--ps-text)",
                    }}
                  />
                  <UnitSelect
                    id="cs-height-unit"
                    value={heightUnit}
                    onChange={handleHeightUnitChange}
                  />
                </div>
              </div>
            </div>

            {/* Center: lock icon */}
            <div className="flex flex-col items-center justify-center gap-2 pt-5 self-stretch">
              {/* Top connector line */}
              <div
                className="w-px flex-1"
                style={{ backgroundColor: "var(--ps-border)" }}
              />
              <button
                type="button"
                data-ocid="canvas_size.aspect_lock_toggle"
                onClick={toggleLockAspect}
                aria-label={
                  lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"
                }
                title={
                  lockAspect
                    ? "Aspect ratio locked"
                    : "Click to lock aspect ratio"
                }
                className="p-1.5 rounded-sm transition-all focus:outline-none focus-visible:ring-1"
                style={{
                  backgroundColor: lockAspect
                    ? "rgba(0,212,255,0.18)"
                    : "var(--ps-panel-header)",
                  border: lockAspect
                    ? "1px solid rgba(0,212,255,0.6)"
                    : "1px solid var(--ps-border)",
                  color: lockAspect
                    ? "var(--ps-accent)"
                    : "var(--ps-text-muted)",
                  boxShadow: lockAspect
                    ? "0 0 8px rgba(0,212,255,0.4)"
                    : "none",
                }}
              >
                {lockAspect ? <Link2 size={12} /> : <Link2Off size={12} />}
              </button>
              {/* Bottom connector line */}
              <div
                className="w-px flex-1"
                style={{ backgroundColor: "var(--ps-border)" }}
              />
            </div>

            {/* Right: preview + info */}
            <div className="flex flex-col items-center gap-3 pt-1 min-w-[80px]">
              {/* Canvas preview thumbnail */}
              <div
                className="flex items-center justify-center rounded-sm"
                style={{
                  width: previewMaxW + 8,
                  height: previewMaxH + 8,
                  backgroundColor: "var(--ps-bg)",
                  border: "1px solid var(--ps-border)",
                }}
              >
                <div
                  style={{
                    width: previewW,
                    height: previewH,
                    backgroundColor: "rgba(0,212,255,0.15)",
                    border: "1px solid rgba(0,212,255,0.5)",
                    boxShadow: "0 0 6px rgba(0,212,255,0.3)",
                  }}
                />
              </div>

              {/* Pixel dimensions */}
              <div className="text-center">
                <p
                  className="text-xs font-mono leading-tight"
                  style={{ color: "var(--ps-accent)" }}
                >
                  {widthPx} × {heightPx}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--ps-text-muted)" }}
                >
                  px
                </p>
              </div>
            </div>
          </div>

          {/* ── Resolution + Orientation ────────────────────────── */}
          <div className="flex items-end gap-4">
            {/* Resolution: display-only */}
            <div className="flex-1 space-y-1">
              <Label className="ps-label flex items-center gap-1.5">
                <Monitor size={10} />
                Resolution
              </Label>
              <div
                className="h-7 flex items-center px-2.5 rounded-sm text-xs font-mono"
                style={{
                  backgroundColor: "var(--ps-bg)",
                  border: "1px solid var(--ps-border)",
                  color: "var(--ps-text-muted)",
                  cursor: "default",
                }}
              >
                96 DPI (screen)
              </div>
            </div>

            {/* Orientation toggle */}
            <div className="space-y-1">
              <Label className="ps-label flex items-center gap-1.5">
                <RotateCcw size={10} />
                Orientation
              </Label>
              <div
                className="flex gap-0 rounded-sm overflow-hidden"
                style={{ border: "1px solid var(--ps-border)" }}
              >
                <button
                  type="button"
                  data-ocid="canvas_size.orientation_portrait"
                  onClick={() => handleOrientation("portrait")}
                  title="Portrait"
                  className="px-3 py-1 text-xs transition-all focus:outline-none"
                  style={{
                    backgroundColor:
                      orientation === "portrait"
                        ? "rgba(0,212,255,0.2)"
                        : "var(--ps-panel-header)",
                    color:
                      orientation === "portrait"
                        ? "var(--ps-accent)"
                        : "var(--ps-text-muted)",
                    borderRight: "1px solid var(--ps-border)",
                  }}
                >
                  ↑ Portrait
                </button>
                <button
                  type="button"
                  data-ocid="canvas_size.orientation_landscape"
                  onClick={() => handleOrientation("landscape")}
                  title="Landscape"
                  className="px-3 py-1 text-xs transition-all focus:outline-none"
                  style={{
                    backgroundColor:
                      orientation === "landscape"
                        ? "rgba(0,212,255,0.2)"
                        : "var(--ps-panel-header)",
                    color:
                      orientation === "landscape"
                        ? "var(--ps-accent)"
                        : "var(--ps-text-muted)",
                  }}
                >
                  → Landscape
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer / Actions ─────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            backgroundColor: "var(--ps-panel-header)",
            borderTop: "1px solid var(--ps-border)",
          }}
        >
          {/* Dimension summary */}
          <p
            className="text-xs font-mono"
            style={{ color: "var(--ps-text-muted)" }}
          >
            {widthPx} × {heightPx} px &nbsp;·&nbsp; 96 DPI
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-ocid="canvas_size.cancel_button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-sm transition-all focus:outline-none focus-visible:ring-1"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--ps-border)",
                color: "var(--ps-text-muted)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              data-ocid="canvas_size.confirm_button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs rounded-sm font-semibold transition-all focus:outline-none focus-visible:ring-1"
              style={{
                backgroundColor: "var(--ps-accent)",
                border: "1px solid var(--ps-accent)",
                color: "#000",
                boxShadow: "0 0 12px rgba(0,212,255,0.4)",
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
