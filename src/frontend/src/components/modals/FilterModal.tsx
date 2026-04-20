/**
 * FilterModal.tsx — Apply image filters to the canvas.
 *
 * Controls:
 *   - Grayscale toggle
 *   - Blur   (0–20)
 *   - Brightness  (-100 to +100)
 *   - Contrast    (-100 to +100)
 *
 * Uses useCanvasFilters hook for applying filters to Fabric.js objects.
 * Supports live preview and Apply/Cancel actions.
 */

import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useEditor } from "../../hooks/useEditor";

// ─── Props ────────────────────────────────────────────────────────────────────

import type { Canvas } from "fabric";

interface FilterModalProps {
  onClose: () => void;
  canvas?: Canvas | null;
}

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterValues {
  grayscale: boolean;
  blur: number;
  brightness: number;
  contrast: number;
}

// ─── Reusable PS-style slider row ─────────────────────────────────────────────

function FilterSlider({
  label,
  min,
  max,
  value,
  onChange,
  ocid,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  ocid: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const displayVal = value >= 0 ? `+${value}` : String(value);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="ps-label">{label}</span>
        <span
          className="text-xs font-mono w-10 text-right"
          style={{ color: "var(--ps-accent)" }}
        >
          {displayVal}
        </span>
      </div>
      <div className="relative h-4 flex items-center">
        {/* Track */}
        <div
          className="absolute inset-x-0 h-1.5 rounded-sm"
          style={{ backgroundColor: "var(--ps-bg)" }}
        />
        {/* Fill — split at center for bipolar sliders */}
        {min < 0 ? (
          <>
            <div
              className="absolute h-1.5"
              style={{
                left: "50%",
                width: `${Math.abs(value) * 0.5}%`,
                transform: value >= 0 ? "none" : "translateX(-100%)",
                backgroundColor: "var(--ps-accent, #2db8ff)",
              }}
            />
          </>
        ) : (
          <div
            className="absolute left-0 h-1.5 rounded-sm"
            style={{
              width: `${pct}%`,
              backgroundColor: "var(--ps-accent, #2db8ff)",
            }}
          />
        )}
        <input
          data-ocid={ocid}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full opacity-0 h-4 cursor-pointer"
          style={{ zIndex: 1 }}
          aria-label={label}
        />
      </div>
    </div>
  );
}

// ─── FilterModal ──────────────────────────────────────────────────────────────

export function FilterModal({ onClose, canvas: _canvas }: FilterModalProps) {
  const { state, setFilters } = useEditor();

  // Initialise from current editor filter state
  const [values, setValues] = useState<FilterValues>({
    grayscale: state.filters.grayscale,
    blur: state.filters.blur,
    brightness: state.filters.brightness,
    contrast: state.filters.contrast,
  });
  const [livePreview, setLivePreview] = useState(true);

  // ── Live preview: apply to editor state as user drags ─────────────────────
  useEffect(() => {
    if (!livePreview) return;
    setFilters({
      grayscale: values.grayscale,
      blur: values.blur,
      brightness: values.brightness,
      contrast: values.contrast,
    });
  }, [values, livePreview, setFilters]);

  // ── Apply button — commit permanently ─────────────────────────────────────
  function handleApply() {
    setFilters({
      grayscale: values.grayscale,
      blur: values.blur,
      brightness: values.brightness,
      contrast: values.contrast,
    });
    onClose();
  }

  // ── Cancel — revert to original ───────────────────────────────────────────
  function handleCancel() {
    // Revert filter state to what it was before this modal opened
    setFilters({
      grayscale: state.filters.grayscale,
      blur: state.filters.blur,
      brightness: state.filters.brightness,
      contrast: state.filters.contrast,
    });
    onClose();
  }

  // ── Reset to zero ─────────────────────────────────────────────────────────
  function handleReset() {
    const reset: FilterValues = {
      grayscale: false,
      blur: 0,
      brightness: 0,
      contrast: 0,
    };
    setValues(reset);
  }

  function set<K extends keyof FilterValues>(key: K, val: FilterValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      data-ocid="filter.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleCancel();
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
            <SlidersHorizontal
              size={14}
              style={{ color: "var(--ps-accent)" }}
            />
            <span className="text-sm font-semibold text-foreground">
              Filters
            </span>
          </div>
          <button
            type="button"
            data-ocid="filter.close_button"
            onClick={handleCancel}
            aria-label="Close filter dialog"
            className="p-1 rounded-sm hover:bg-white/10 transition-colors text-foreground/40 hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-4 py-4 space-y-5">
          {/* Grayscale toggle */}
          <div className="flex items-center justify-between">
            <span className="ps-label">Grayscale</span>
            <button
              type="button"
              data-ocid="filter.grayscale_toggle"
              role="switch"
              aria-checked={values.grayscale}
              onClick={() => set("grayscale", !values.grayscale)}
              className="relative w-9 h-5 rounded-full transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              style={{
                backgroundColor: values.grayscale
                  ? "var(--ps-accent)"
                  : "var(--ps-bg)",
                border: "1px solid var(--ps-border)",
              }}
            >
              <span
                className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-transform"
                style={{
                  backgroundColor: "white",
                  left: "2px",
                  transform: values.grayscale
                    ? "translateX(16px)"
                    : "translateX(0)",
                }}
              />
            </button>
          </div>

          {/* Blur slider */}
          <FilterSlider
            label="Blur"
            min={0}
            max={20}
            value={values.blur}
            onChange={(v) => set("blur", v)}
            ocid="filter.blur_slider"
          />

          {/* Brightness slider */}
          <FilterSlider
            label="Brightness"
            min={-100}
            max={100}
            value={values.brightness}
            onChange={(v) => set("brightness", v)}
            ocid="filter.brightness_slider"
          />

          {/* Contrast slider */}
          <FilterSlider
            label="Contrast"
            min={-100}
            max={100}
            value={values.contrast}
            onChange={(v) => set("contrast", v)}
            ocid="filter.contrast_slider"
          />

          {/* Live preview toggle */}
          <div
            className="flex items-center gap-2 pt-1"
            style={{ borderTop: "1px solid var(--ps-border)" }}
          >
            <input
              type="checkbox"
              id="filter-live-preview"
              data-ocid="filter.live_preview_toggle"
              checked={livePreview}
              onChange={() => setLivePreview((p) => !p)}
              className="w-3.5 h-3.5 rounded-sm shrink-0 cursor-pointer accent-[var(--ps-accent)]"
              aria-label="Live preview"
            />
            <label
              htmlFor="filter-live-preview"
              className="text-xs text-foreground/50 cursor-pointer select-none"
            >
              Live Preview
            </label>

            {/* Reset */}
            <button
              type="button"
              data-ocid="filter.reset_button"
              onClick={handleReset}
              className="ml-auto text-xs text-foreground/40 hover:text-foreground transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--ps-border, #555)" }}
        >
          <Button
            data-ocid="filter.cancel_button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-7 text-xs text-foreground/50 hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            data-ocid="filter.confirm_button"
            size="sm"
            onClick={handleApply}
            className="h-7 text-xs font-semibold rounded-sm px-4"
            style={{
              backgroundColor: "var(--ps-accent, #2db8ff)",
              color: "#000",
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
