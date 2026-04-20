/**
 * PropertiesPanel — shows properties of the selected Fabric.js object.
 *
 * When an object is selected in the canvas:
 *   - Position (X, Y)
 *   - Size (Width, Height) with lock aspect toggle
 *   - Rotation with visual dial
 *   - Opacity slider
 *   - Fill color swatch
 *   - Stroke color swatch + width
 *
 * When nothing is selected: shows canvas dimensions and zoom.
 */

import type { FabricObject } from "fabric";
import { Lock, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import { useEditor } from "../../hooks/useEditor";

// ─── Number field ─────────────────────────────────────────────────────────────

interface NumFieldProps {
  id: string;
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  ocid: string;
  onChange: (v: number) => void;
  readOnly?: boolean;
}

function NumField({
  id,
  label,
  value,
  unit = "",
  min,
  max,
  step = 1,
  ocid,
  onChange,
  readOnly,
}: NumFieldProps) {
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(Math.round(value * 100) / 100));
  }, [value, focused]);

  return (
    <div className="flex items-center gap-1.5">
      <label
        htmlFor={id}
        className="text-[10px] font-mono uppercase text-foreground/35 w-5 shrink-0"
      >
        {label}
      </label>
      <div
        className="flex-1 flex items-center gap-0.5 px-1.5 h-6 rounded-sm border"
        style={{
          backgroundColor: readOnly
            ? "transparent"
            : "var(--ps-canvas,#1a1a1a)",
          borderColor: focused
            ? "var(--ps-accent,#2db8ff)"
            : "var(--ps-border,#555)",
        }}
      >
        <input
          id={id}
          data-ocid={ocid}
          type="number"
          value={focused ? draft : String(Math.round(value * 100) / 100)}
          min={min}
          max={max}
          step={step}
          readOnly={readOnly}
          className="flex-1 text-xs font-mono bg-transparent focus:outline-none text-foreground/80 min-w-0"
          onFocus={() => {
            setFocused(true);
            setDraft(String(Math.round(value * 100) / 100));
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => {
            setFocused(false);
            const n = Number.parseFloat(e.target.value);
            if (!Number.isNaN(n)) onChange(n);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = Number.parseFloat(draft);
              if (!Number.isNaN(n)) onChange(n);
              e.currentTarget.blur();
            }
          }}
        />
        {unit && (
          <span className="text-[10px] font-mono text-foreground/25 shrink-0">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Rotation Dial ────────────────────────────────────────────────────────────

interface RotationDialProps {
  angle: number;
  onChange: (a: number) => void;
}

function RotationDial({ angle, onChange }: RotationDialProps) {
  const rad = (angle * Math.PI) / 180;
  const tickX = 50 + 35 * Math.cos(rad - Math.PI / 2);
  const tickY = 50 + 35 * Math.sin(rad - Math.PI / 2);

  return (
    <button
      type="button"
      data-ocid="properties.rotation_dial"
      aria-label={`Rotation angle: ${angle} degrees`}
      className="cursor-pointer shrink-0 p-0 bg-transparent border-0"
      style={{
        width: 36,
        height: 36,
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onChange((angle + 1) % 360);
        if (e.key === "ArrowLeft") onChange((angle - 1 + 360) % 360);
      }}
      onMouseDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        function onMove(ev: MouseEvent) {
          const dx = ev.clientX - cx;
          const dy = ev.clientY - cy;
          const a =
            Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
          onChange(a);
        }
        function onUp() {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        }
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      }}
    >
      <svg viewBox="0 0 100 100" width={36} height={36} aria-hidden="true">
        {/* Outer ring */}
        <circle
          cx={50}
          cy={50}
          r={45}
          fill="var(--ps-canvas,#1a1a1a)"
          stroke="var(--ps-border,#555)"
          strokeWidth={2}
        />
        {/* Tick marks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((t) => {
          const tr = (t * Math.PI) / 180;
          return (
            <line
              key={t}
              x1={50 + 38 * Math.cos(tr - Math.PI / 2)}
              y1={50 + 38 * Math.sin(tr - Math.PI / 2)}
              x2={50 + 44 * Math.cos(tr - Math.PI / 2)}
              y2={50 + 44 * Math.sin(tr - Math.PI / 2)}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
          );
        })}
        {/* Needle */}
        <line
          x1={50}
          y1={50}
          x2={tickX}
          y2={tickY}
          stroke="var(--ps-accent,#2db8ff)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={50} cy={50} r={4} fill="var(--ps-accent,#2db8ff)" />
      </svg>
    </button>
  );
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────

interface ColorSwatchProps {
  label: string;
  inputId: string;
  color: string;
  ocid: string;
  onChange?: (hex: string) => void;
}

function ColorSwatch({
  label,
  inputId,
  color,
  ocid,
  onChange,
}: ColorSwatchProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={inputId}
        className="text-[10px] font-mono uppercase text-foreground/35 w-10 shrink-0"
      >
        {label}
      </label>
      <div
        data-ocid={ocid}
        className="w-8 h-5 rounded-sm border overflow-hidden relative"
        style={{ borderColor: "var(--ps-border,#555)" }}
      >
        <div className="w-full h-full" style={{ backgroundColor: color }} />
        {onChange && (
          <input
            id={inputId}
            type="color"
            value={color.startsWith("#") ? color : "#000000"}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            title={color}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {!onChange && (
          <input id={inputId} type="hidden" value={color} readOnly />
        )}
      </div>
      <span className="text-[10px] font-mono text-foreground/40 uppercase">
        {color.replace("#", "")}
      </span>
    </div>
  );
}

// ─── Fabric object extended interface ────────────────────────────────────────

type FabricObjectExtended = FabricObject & {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  angle?: number;
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: number;
  scaleX?: number;
  scaleY?: number;
};

interface ObjectPropsState {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

// ─── SelectedObjectProps ──────────────────────────────────────────────────────

function SelectedObjectProps({ obj }: { obj: FabricObjectExtended }) {
  const [lockAspect, setLockAspect] = useState(false);
  const [props, setProps] = useState<ObjectPropsState>({
    x: Math.round(obj.left ?? 0),
    y: Math.round(obj.top ?? 0),
    width: Math.round((obj.width ?? 0) * (obj.scaleX ?? 1)),
    height: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1)),
    angle: Math.round(obj.angle ?? 0),
    opacity: Math.round((obj.opacity ?? 1) * 100),
    fill: typeof obj.fill === "string" ? obj.fill : "#000000",
    stroke: obj.stroke ?? "transparent",
    strokeWidth: obj.strokeWidth ?? 0,
  });

  function applyToObj(updates: Partial<ObjectPropsState>) {
    const next = { ...props, ...updates };
    setProps(next);

    const widthBase = obj.width ?? 1;
    const heightBase = obj.height ?? 1;
    const scaleX = next.width / (widthBase === 0 ? 1 : widthBase);
    const scaleY = next.height / (heightBase === 0 ? 1 : heightBase);
    obj.set({
      left: next.x,
      top: next.y,
      scaleX,
      scaleY,
      angle: next.angle,
      opacity: next.opacity / 100,
      fill: next.fill,
      stroke: next.stroke,
      strokeWidth: next.strokeWidth,
    });
    obj.canvas?.requestRenderAll();
  }

  function handleWidthChange(w: number) {
    if (lockAspect && props.height > 0) {
      const ratio = w / props.width;
      applyToObj({ width: w, height: Math.round(props.height * ratio) });
    } else {
      applyToObj({ width: w });
    }
  }

  function handleHeightChange(h: number) {
    if (lockAspect && props.width > 0) {
      const ratio = h / props.height;
      applyToObj({ height: h, width: Math.round(props.width * ratio) });
    } else {
      applyToObj({ height: h });
    }
  }

  return (
    <div className="p-3 space-y-3">
      {/* Position */}
      <div>
        <p className="text-[10px] font-mono uppercase text-foreground/30 mb-1.5 tracking-wider">
          Position
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            id="prop-x"
            label="X"
            value={props.x}
            unit="px"
            ocid="properties.x_input"
            onChange={(v) => applyToObj({ x: v })}
          />
          <NumField
            id="prop-y"
            label="Y"
            value={props.y}
            unit="px"
            ocid="properties.y_input"
            onChange={(v) => applyToObj({ y: v })}
          />
        </div>
      </div>

      {/* Size */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-mono uppercase text-foreground/30 tracking-wider">
            Size
          </p>
          <button
            type="button"
            data-ocid="properties.lock_aspect_toggle"
            onClick={() => setLockAspect((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-mono text-foreground/40 hover:text-foreground transition-colors"
            title={lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"}
          >
            {lockAspect ? (
              <Lock size={10} className="text-primary" />
            ) : (
              <Unlock size={10} />
            )}
            <span>{lockAspect ? "Locked" : "Free"}</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            id="prop-w"
            label="W"
            value={props.width}
            unit="px"
            min={1}
            ocid="properties.width_input"
            onChange={handleWidthChange}
          />
          <NumField
            id="prop-h"
            label="H"
            value={props.height}
            unit="px"
            min={1}
            ocid="properties.height_input"
            onChange={handleHeightChange}
          />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <p className="text-[10px] font-mono uppercase text-foreground/30 mb-1.5 tracking-wider">
          Transform
        </p>
        <div className="flex items-center gap-3">
          <RotationDial
            angle={props.angle}
            onChange={(a) => applyToObj({ angle: a })}
          />
          <div className="flex-1">
            <NumField
              id="prop-angle"
              label="°"
              value={props.angle}
              min={0}
              max={360}
              unit="°"
              ocid="properties.rotation_input"
              onChange={(a) => applyToObj({ angle: ((a % 360) + 360) % 360 })}
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <p className="text-[10px] font-mono uppercase text-foreground/30 mb-1.5 tracking-wider">
          Opacity
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="prop-opacity" className="sr-only">
            Opacity
          </label>
          <input
            id="prop-opacity"
            data-ocid="properties.opacity_slider"
            type="range"
            min={0}
            max={100}
            value={props.opacity}
            onChange={(e) => applyToObj({ opacity: Number(e.target.value) })}
            className="flex-1 h-2 appearance-none rounded-full cursor-pointer"
            style={{ accentColor: "#2db8ff" }}
          />
          <span className="text-xs font-mono text-foreground/60 w-8 text-right shrink-0">
            {props.opacity}%
          </span>
        </div>
      </div>

      {/* Colors */}
      <div>
        <p className="text-[10px] font-mono uppercase text-foreground/30 mb-1.5 tracking-wider">
          Appearance
        </p>
        <div className="space-y-1.5">
          <ColorSwatch
            label="Fill"
            inputId="prop-fill"
            color={props.fill}
            ocid="properties.fill_swatch"
            onChange={(c) => applyToObj({ fill: c })}
          />
          <div className="flex items-center gap-2">
            <ColorSwatch
              label="Stroke"
              inputId="prop-stroke"
              color={props.stroke === "transparent" ? "#000000" : props.stroke}
              ocid="properties.stroke_swatch"
              onChange={(c) => applyToObj({ stroke: c })}
            />
            <div className="flex-1">
              <NumField
                id="prop-sw"
                label="W"
                value={props.strokeWidth}
                min={0}
                step={0.5}
                unit="px"
                ocid="properties.stroke_width_input"
                onChange={(v) => applyToObj({ strokeWidth: v })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Canvas Props (nothing selected) ─────────────────────────────────────────

function CanvasProps() {
  const { state, setZoom } = useEditor();
  const { width, height, zoom } = state.canvas;

  return (
    <div className="p-3 space-y-3">
      <div>
        <p className="text-[10px] font-mono uppercase text-foreground/30 mb-1.5 tracking-wider">
          Canvas
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            id="canvas-w"
            label="W"
            value={width}
            unit="px"
            ocid="properties.canvas_width"
            readOnly
            onChange={() => {}}
          />
          <NumField
            id="canvas-h"
            label="H"
            value={height}
            unit="px"
            ocid="properties.canvas_height"
            readOnly
            onChange={() => {}}
          />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase text-foreground/30 mb-1.5 tracking-wider">
          View
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="view-zoom" className="sr-only">
            Zoom
          </label>
          <input
            id="view-zoom"
            data-ocid="properties.zoom_slider"
            type="range"
            min={10}
            max={800}
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="flex-1 h-2 appearance-none rounded-full cursor-pointer"
            style={{ accentColor: "#2db8ff" }}
          />
          <span className="text-xs font-mono text-foreground/60 w-10 text-right shrink-0">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
      <p className="text-xs font-mono text-foreground/20 text-center py-2">
        Select an object to edit its properties
      </p>
    </div>
  );
}

// ─── PropertiesPanel ──────────────────────────────────────────────────────────

export function PropertiesPanel() {
  const { fabricRef } = useEditor();
  const [selectedObj, setSelectedObj] = useState<FabricObjectExtended | null>(
    null,
  );

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    function onSelect(e: { selected?: FabricObject[] }) {
      const obj = e.selected?.[0] ?? null;
      setSelectedObj(obj as FabricObjectExtended | null);
    }
    function onDeselect() {
      setSelectedObj(null);
    }
    function onModified() {
      const active = canvas?.getActiveObject();
      if (active) setSelectedObj({ ...active } as FabricObjectExtended);
    }

    canvas.on("selection:created", onSelect as (e: object) => void);
    canvas.on("selection:updated", onSelect as (e: object) => void);
    canvas.on("selection:cleared", onDeselect);
    canvas.on("object:modified", onModified);

    return () => {
      canvas.off("selection:created", onSelect as (e: object) => void);
      canvas.off("selection:updated", onSelect as (e: object) => void);
      canvas.off("selection:cleared", onDeselect);
      canvas.off("object:modified", onModified);
    };
  }, [fabricRef]);

  return selectedObj ? (
    <SelectedObjectProps obj={selectedObj} />
  ) : (
    <CanvasProps />
  );
}
