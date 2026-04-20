/**
 * ColorPanel — Photoshop-style color picker.
 *
 * Layout:
 *   1. Foreground/background color swatches with swap button
 *   2. Square hue/saturation gradient picker
 *   3. Hue bar slider
 *   4. RGB sliders (interactive, colored track)
 *   5. Hex input
 *   6. Opacity slider
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "../../hooks/useEditor";
import type { HSBColor, RGBColor } from "../../types/editor";

// ─── Color Conversion Utilities ───────────────────────────────────────────────

function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace("#", "").padEnd(6, "0");
  const n = Number.parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }: RGBColor): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function rgbToHsb({ r, g, b }: RGBColor): HSBColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const bv = max;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    b: Math.round(bv * 100),
  };
}

function hsbToRgb({ h, s, b }: HSBColor): RGBColor {
  const hn = h / 360;
  const sn = s / 100;
  const bn = b / 100;
  const i = Math.floor(hn * 6);
  const f = hn * 6 - i;
  const p = bn * (1 - sn);
  const q = bn * (1 - f * sn);
  const t = bn * (1 - (1 - f) * sn);
  const rTable = [bn, t, p, p, q, bn];
  const gTable = [q, bn, bn, t, p, p];
  const bTable = [p, p, q, bn, bn, t];
  return {
    r: Math.round(rTable[i % 6] * 255),
    g: Math.round(gTable[i % 6] * 255),
    b: Math.round(bTable[i % 6] * 255),
  };
}

// Pure hue color for a given hue angle
function hueToHex(h: number): string {
  return rgbToHex(hsbToRgb({ h, s: 100, b: 100 }));
}

// ─── Gradient Picker (square saturation/brightness) ──────────────────────────

interface GradientPickerProps {
  hue: number;
  saturation: number;
  brightness: number;
  onChange: (s: number, b: number) => void;
}

function GradientPicker({
  hue,
  saturation,
  brightness,
  onChange,
}: GradientPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const posFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      onChange(Math.round(x * 100), Math.round((1 - y) * 100));
    },
    [onChange],
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragging.current) posFromEvent(e);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [posFromEvent]);

  const hueHex = hueToHex(hue);
  const cx = `${saturation}%`;
  const cy = `${100 - brightness}%`;

  return (
    <div
      ref={ref}
      data-ocid="color.gradient_picker"
      role="slider"
      aria-label="Color gradient picker"
      aria-valuenow={saturation}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className="relative cursor-crosshair rounded-sm overflow-hidden"
      style={{ width: "100%", height: 160 }}
      onMouseDown={(e) => {
        dragging.current = true;
        posFromEvent(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight")
          onChange(Math.min(100, saturation + 1), brightness);
        if (e.key === "ArrowLeft")
          onChange(Math.max(0, saturation - 1), brightness);
        if (e.key === "ArrowUp")
          onChange(saturation, Math.min(100, brightness + 1));
        if (e.key === "ArrowDown")
          onChange(saturation, Math.max(0, brightness - 1));
      }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: hueHex }} />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, #fff 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, #000 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none"
        style={{
          left: cx,
          top: cy,
          transform: "translate(-50%, -50%)",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.3)",
        }}
      />
    </div>
  );
}

// ─── Hue Slider ───────────────────────────────────────────────────────────────

interface HueSliderProps {
  hue: number;
  onChange: (h: number) => void;
}

function HueSlider({ hue, onChange }: HueSliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const posFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onChange(Math.round(x * 360));
    },
    [onChange],
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragging.current) posFromEvent(e);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [posFromEvent]);

  return (
    <div
      ref={ref}
      data-ocid="color.hue_slider"
      role="slider"
      aria-label="Hue"
      aria-valuenow={hue}
      aria-valuemin={0}
      aria-valuemax={360}
      tabIndex={0}
      className="relative h-4 rounded-sm cursor-pointer overflow-hidden"
      style={{
        background:
          "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
      }}
      onMouseDown={(e) => {
        dragging.current = true;
        posFromEvent(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onChange(Math.min(360, hue + 1));
        if (e.key === "ArrowLeft") onChange(Math.max(0, hue - 1));
      }}
    >
      <div
        className="absolute top-0 bottom-0 w-2 rounded-sm border border-white/80 pointer-events-none"
        style={{
          left: `${(hue / 360) * 100}%`,
          transform: "translateX(-50%)",
          backgroundColor: hueToHex(hue),
          boxShadow: "0 0 2px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}

// ─── RGB Slider ───────────────────────────────────────────────────────────────

interface RgbSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  fromColor: string;
  toColor: string;
}

function RgbSlider({
  label,
  value,
  onChange,
  color,
  fromColor,
  toColor,
}: RgbSliderProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono w-3 shrink-0" style={{ color }}>
        {label}
      </span>
      <div
        role="slider"
        aria-label={`${label} channel`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={255}
        tabIndex={0}
        className="flex-1 relative h-3 rounded-full overflow-hidden cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${fromColor}, ${toColor})`,
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.max(
            0,
            Math.min(1, (e.clientX - rect.left) / rect.width),
          );
          onChange(Math.round(x * 255));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onChange(Math.min(255, value + 1));
          if (e.key === "ArrowLeft") onChange(Math.max(0, value - 1));
        }}
      >
        <div
          className="absolute top-0 bottom-0 w-2 rounded-full border border-white/80 pointer-events-none"
          style={{
            left: `${(value / 255) * 100}%`,
            transform: "translateX(-50%)",
            backgroundColor: "rgba(255,255,255,0.9)",
            boxShadow: "0 0 2px rgba(0,0,0,0.5)",
          }}
        />
      </div>
      <input
        data-ocid={`color.${label.toLowerCase()}_input`}
        type="number"
        min={0}
        max={255}
        value={value}
        onChange={(e) =>
          onChange(Math.max(0, Math.min(255, Number(e.target.value))))
        }
        className="w-10 text-right text-xs font-mono bg-transparent border-b focus:outline-none focus:border-primary text-foreground/70"
        style={{ borderColor: "var(--ps-border, #555)" }}
      />
    </div>
  );
}

// ─── Opacity Slider ───────────────────────────────────────────────────────────

interface OpacitySliderProps {
  opacity: number;
  color: string;
  onChange: (v: number) => void;
}

function OpacitySlider({ opacity, color, onChange }: OpacitySliderProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono w-3 shrink-0 text-foreground/40">
        A
      </span>
      <div
        role="slider"
        aria-label="Opacity"
        aria-valuenow={opacity}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        className="flex-1 relative h-3 rounded-full overflow-hidden cursor-pointer"
        style={{
          background: `linear-gradient(to right, transparent, ${color}), repeating-conic-gradient(#888 0% 25%, #aaa 0% 50%) 0 0 / 8px 8px`,
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.max(
            0,
            Math.min(1, (e.clientX - rect.left) / rect.width),
          );
          onChange(Math.round(x * 100));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onChange(Math.min(100, opacity + 1));
          if (e.key === "ArrowLeft") onChange(Math.max(0, opacity - 1));
        }}
      >
        <div
          className="absolute top-0 bottom-0 w-2 rounded-full border border-white/80 pointer-events-none"
          style={{
            left: `${opacity}%`,
            transform: "translateX(-50%)",
            backgroundColor: "rgba(255,255,255,0.9)",
            boxShadow: "0 0 2px rgba(0,0,0,0.5)",
          }}
        />
      </div>
      <input
        data-ocid="color.opacity_input"
        type="number"
        min={0}
        max={100}
        value={opacity}
        onChange={(e) =>
          onChange(Math.max(0, Math.min(100, Number(e.target.value))))
        }
        className="w-10 text-right text-xs font-mono bg-transparent border-b focus:outline-none focus:border-primary text-foreground/70"
        style={{ borderColor: "var(--ps-border, #555)" }}
      />
    </div>
  );
}

// ─── ColorPanel ───────────────────────────────────────────────────────────────

export function ColorPanel() {
  const { state, setColor, swapColors } = useEditor();
  const { foreground, background } = state.color;

  const rgb = hexToRgb(foreground);
  const hsb = rgbToHsb(rgb);

  const [opacity, setOpacity] = useState(100);
  const [hexInput, setHexInput] = useState(
    foreground.replace("#", "").toUpperCase(),
  );
  const [hexFocused, setHexFocused] = useState(false);

  useEffect(() => {
    if (!hexFocused) setHexInput(foreground.replace("#", "").toUpperCase());
  }, [foreground, hexFocused]);

  const updateFromRgb = useCallback(
    (newRgb: RGBColor) => {
      setColor({ foreground: rgbToHex(newRgb) });
    },
    [setColor],
  );

  const updateFromHsb = useCallback(
    (newHsb: HSBColor) => {
      setColor({ foreground: rgbToHex(hsbToRgb(newHsb)) });
    },
    [setColor],
  );

  function handleHexCommit(raw: string) {
    const clean = raw.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    if (clean.length === 6) setColor({ foreground: `#${clean}` });
    setHexFocused(false);
  }

  return (
    <div className="p-3 space-y-3">
      {/* ── Swatches row ── */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
          {/* BG swatch */}
          <button
            type="button"
            data-ocid="color.background_swatch"
            className="absolute bottom-0 right-0 w-7 h-7 border cursor-pointer rounded-sm"
            style={{
              backgroundColor: background,
              borderColor: "var(--ps-border,#555)",
              zIndex: 1,
            }}
            title="Background color (click to swap)"
            onClick={() =>
              setColor({ foreground: background, background: foreground })
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              setColor({ foreground: background, background: foreground })
            }
            aria-label="Background color — click to swap"
          />
          {/* FG swatch */}
          <div
            data-ocid="color.foreground_swatch"
            className="absolute top-0 left-0 w-7 h-7 border-2 rounded-sm"
            style={{
              backgroundColor: foreground,
              borderColor: "#fff",
              zIndex: 2,
            }}
            title="Foreground color"
          />
          {/* Swap arrow */}
          <button
            type="button"
            data-ocid="color.swap_button"
            onClick={swapColors}
            onKeyDown={(e) => e.key === "Enter" && swapColors()}
            title="Swap foreground/background (X)"
            aria-label="Swap foreground and background colors"
            className="absolute -bottom-1 -right-2 text-[11px] text-foreground/40 hover:text-foreground/90 transition-colors leading-none"
            style={{ zIndex: 3 }}
          >
            ⇄
          </button>
        </div>

        {/* Hue slider */}
        <div className="flex-1">
          <HueSlider
            hue={hsb.h}
            onChange={(h) => updateFromHsb({ h, s: hsb.s, b: hsb.b })}
          />
          <div className="mt-1.5 text-[10px] font-mono text-foreground/30 flex justify-between">
            <span>H {hsb.h}°</span>
            <span>S {hsb.s}%</span>
            <span>B {hsb.b}%</span>
          </div>
        </div>
      </div>

      {/* ── Gradient square picker ── */}
      <GradientPicker
        hue={hsb.h}
        saturation={hsb.s}
        brightness={hsb.b}
        onChange={(s, b) => updateFromHsb({ h: hsb.h, s, b })}
      />

      {/* ── RGB sliders ── */}
      <div className="space-y-2 pt-1">
        <RgbSlider
          label="R"
          value={rgb.r}
          color="#ff5555"
          fromColor="#000"
          toColor={`rgb(255,${rgb.g},${rgb.b})`}
          onChange={(v) => updateFromRgb({ ...rgb, r: v })}
        />
        <RgbSlider
          label="G"
          value={rgb.g}
          color="#55cc55"
          fromColor="#000"
          toColor={`rgb(${rgb.r},255,${rgb.b})`}
          onChange={(v) => updateFromRgb({ ...rgb, g: v })}
        />
        <RgbSlider
          label="B"
          value={rgb.b}
          color="#5588ff"
          fromColor="#000"
          toColor={`rgb(${rgb.r},${rgb.g},255)`}
          onChange={(v) => updateFromRgb({ ...rgb, b: v })}
        />
      </div>

      {/* ── Hex input ── */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
        style={{
          backgroundColor: "var(--ps-canvas,#1a1a1a)",
          border: "1px solid var(--ps-border,#555)",
        }}
      >
        <span
          className="text-xs font-mono text-foreground/30"
          aria-hidden="true"
        >
          #
        </span>
        <input
          data-ocid="color.hex_input"
          type="text"
          value={
            hexFocused ? hexInput : foreground.replace("#", "").toUpperCase()
          }
          onFocus={() => {
            setHexFocused(true);
            setHexInput(foreground.replace("#", "").toUpperCase());
          }}
          onChange={(e) =>
            setHexInput(
              e.target.value
                .replace(/[^0-9a-fA-F]/g, "")
                .slice(0, 6)
                .toUpperCase(),
            )
          }
          onBlur={(e) => handleHexCommit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleHexCommit(hexInput)}
          maxLength={6}
          className="flex-1 text-xs font-mono bg-transparent focus:outline-none text-foreground/80"
          aria-label="Foreground color hex value"
          spellCheck={false}
        />
        <div
          className="w-4 h-4 rounded-sm shrink-0 border"
          style={{
            backgroundColor: foreground,
            borderColor: "var(--ps-border,#555)",
          }}
          aria-hidden="true"
        />
      </div>

      {/* ── Opacity ── */}
      <OpacitySlider
        opacity={opacity}
        color={foreground}
        onChange={setOpacity}
      />
    </div>
  );
}
