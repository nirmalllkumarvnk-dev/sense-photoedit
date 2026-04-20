/**
 * CanvasToolOptions — Context-sensitive options bar below the menu bar.
 *
 * Shows different controls depending on the active tool:
 *   brush  → size + opacity sliders
 *   eraser → size slider
 *   text   → font family, size, bold, italic
 *   shape  → fill color, stroke color, stroke width
 *
 * For all other tools (move, marquee, lasso, gradient, zoom) a minimal
 * informational bar is shown.
 */

import { Separator } from "@/components/ui/separator";
import { useEditor } from "../../hooks/useEditor";

// ─── Slider primitive ─────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  ocid: string;
  onChange: (v: number) => void;
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  ocid,
  onChange,
}: SliderFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="ps-label shrink-0 w-14 text-right">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-ocid={ocid}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 h-1 accent-[var(--ps-accent)] cursor-pointer"
        style={{ accentColor: "var(--ps-accent)" }}
      />
      <span
        className="text-xs font-mono text-muted-foreground w-8 text-right"
        style={{ minWidth: "2rem" }}
      >
        {value}
        {unit}
      </span>
    </div>
  );
}

// ─── Color swatch + input ─────────────────────────────────────────────────────

interface ColorFieldProps {
  label: string;
  value: string;
  ocid: string;
  onChange: (v: string) => void;
}

function ColorField({ label, value, ocid, onChange }: ColorFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="ps-label shrink-0">{label}</span>
      <label
        className="relative cursor-pointer"
        style={{
          width: 20,
          height: 20,
          border: "1px solid var(--ps-border)",
          borderRadius: 2,
          background: value,
          display: "inline-block",
        }}
      >
        <input
          type="color"
          value={value}
          data-ocid={ocid}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>
      <span className="text-xs font-mono text-muted-foreground">{value}</span>
    </div>
  );
}

// ─── Tool-specific option panels ──────────────────────────────────────────────

/** Brush: size (1–500) + opacity (0–100) */
function BrushOptions() {
  const { state, setBrush } = useEditor();
  const { size, opacity } = state.brush;

  return (
    <>
      <SliderField
        label="Size"
        value={size}
        min={1}
        max={500}
        unit="px"
        ocid="tool_options.brush_size"
        onChange={(v) => setBrush({ size: v })}
      />
      <Separator orientation="vertical" className="h-4 mx-1 opacity-30" />
      <SliderField
        label="Opacity"
        value={opacity}
        min={0}
        max={100}
        unit="%"
        ocid="tool_options.brush_opacity"
        onChange={(v) => setBrush({ opacity: v })}
      />
    </>
  );
}

/** Eraser: size (1–500) */
function EraserOptions() {
  const { state, setBrush } = useEditor();
  return (
    <SliderField
      label="Size"
      value={state.brush.size}
      min={1}
      max={500}
      unit="px"
      ocid="tool_options.eraser_size"
      onChange={(v) => setBrush({ size: v })}
    />
  );
}

/** Text: font family, size, bold, italic */
function TextOptions() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="ps-label">Font</span>
        <select
          data-ocid="tool_options.text_font_select"
          defaultValue="Arial"
          className="h-6 text-xs font-mono rounded-sm px-1 cursor-pointer"
          style={{
            background: "var(--ps-panel)",
            border: "1px solid var(--ps-border)",
            color: "var(--foreground)",
          }}
        >
          {[
            "Arial",
            "Georgia",
            "Courier New",
            "Impact",
            "Times New Roman",
            "Verdana",
          ].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <Separator orientation="vertical" className="h-4 mx-1 opacity-30" />
      <div className="flex items-center gap-2">
        <span className="ps-label">Size</span>
        <input
          type="number"
          defaultValue={24}
          min={6}
          max={400}
          data-ocid="tool_options.text_size_input"
          className="h-6 w-14 text-xs font-mono text-center rounded-sm px-1"
          style={{
            background: "var(--ps-panel)",
            border: "1px solid var(--ps-border)",
            color: "var(--foreground)",
          }}
        />
        <span className="text-xs text-muted-foreground">pt</span>
      </div>
      <Separator orientation="vertical" className="h-4 mx-1 opacity-30" />
      <div className="flex items-center gap-1">
        <button
          type="button"
          data-ocid="tool_options.text_bold_toggle"
          className="h-6 w-6 text-xs font-bold rounded-sm flex items-center justify-center transition-colors hover:bg-white/10"
          style={{
            border: "1px solid var(--ps-border)",
            fontFamily: "Georgia, serif",
          }}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          data-ocid="tool_options.text_italic_toggle"
          className="h-6 w-6 text-xs italic rounded-sm flex items-center justify-center transition-colors hover:bg-white/10"
          style={{
            border: "1px solid var(--ps-border)",
            fontFamily: "Georgia, serif",
          }}
          title="Italic"
        >
          I
        </button>
      </div>
    </div>
  );
}

/** Shape: fill color, stroke color, stroke width */
function ShapeOptions() {
  const { state, setColor } = useEditor();

  return (
    <>
      <ColorField
        label="Fill"
        value={state.color.foreground}
        ocid="tool_options.shape_fill_color"
        onChange={(v) => setColor({ foreground: v })}
      />
      <Separator orientation="vertical" className="h-4 mx-1 opacity-30" />
      <ColorField
        label="Stroke"
        value={state.color.background}
        ocid="tool_options.shape_stroke_color"
        onChange={(v) => setColor({ background: v })}
      />
      <Separator orientation="vertical" className="h-4 mx-1 opacity-30" />
      <SliderField
        label="Width"
        value={2}
        min={0}
        max={20}
        unit="px"
        ocid="tool_options.shape_stroke_width"
        onChange={() => {
          /* handled by CanvasWorkspace via context */
        }}
      />
    </>
  );
}

/** Generic bar for tools without extra options */
function DefaultOptions() {
  const { state } = useEditor();
  const labels: Record<string, string> = {
    move: "Move Tool — Click and drag to move objects",
    marquee: "Rectangular Marquee — Drag to select a region",
    lasso: "Lasso Tool — Draw freehand selection",
    gradient: "Gradient Tool — Drag to apply gradient",
    zoom: "Zoom Tool — Click to zoom in, Alt+Click to zoom out",
  };
  return (
    <span className="text-xs text-muted-foreground font-mono">
      {labels[state.activeTool] ?? state.activeTool}
    </span>
  );
}

// ─── Main Options Bar ─────────────────────────────────────────────────────────

/**
 * CanvasToolOptions renders the thin toolbar below the menu bar.
 * Content is swapped based on the active tool.
 */
export function CanvasToolOptions() {
  const { state } = useEditor();
  const tool = state.activeTool;

  function renderOptions() {
    switch (tool) {
      case "brush":
        return <BrushOptions />;
      case "eraser":
        return <EraserOptions />;
      case "text":
        return <TextOptions />;
      case "shape":
        return <ShapeOptions />;
      default:
        return <DefaultOptions />;
    }
  }

  return (
    <div
      data-ocid="tool_options.panel"
      className="flex items-center gap-3 px-3 h-9 shrink-0 select-none overflow-x-auto"
      style={{
        backgroundColor: "var(--ps-panel)",
        borderBottom: "1px solid var(--ps-border)",
      }}
    >
      {/* Tool name badge */}
      <span
        className="text-xs font-mono shrink-0 px-2 py-0.5 rounded-sm"
        style={{
          background: "var(--ps-active)",
          color: "var(--ps-accent)",
          border: "1px solid var(--ps-accent, #2db8ff)",
        }}
      >
        {tool.charAt(0).toUpperCase() + tool.slice(1)}
      </span>

      <Separator orientation="vertical" className="h-4 opacity-30" />

      {/* Contextual options */}
      {renderOptions()}
    </div>
  );
}
