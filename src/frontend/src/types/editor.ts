/**
 * Core TypeScript types for the Sense PhotoEdit editor.
 * These types mirror the backend LayerData and Project structures
 * while adding frontend-specific state types.
 */

// ─── Tool Types ───────────────────────────────────────────────────────────────

/** All available tools in the left toolbar */
export type ToolId =
  | "move"
  | "marquee"
  | "lasso"
  | "brush"
  | "eraser"
  | "text"
  | "shape"
  | "gradient"
  | "zoom";

export interface ToolDefinition {
  id: ToolId;
  label: string;
  icon: string; // lucide icon name or emoji fallback
  shortcut: string;
  cursor: string;
}

// ─── Layer Types ──────────────────────────────────────────────────────────────

/** Frontend layer representation (mirrors backend LayerData) */
export interface Layer {
  id: number;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  fabricJson: string; // serialized Fabric.js objects for this layer
  thumbnail?: string; // base64 PNG thumbnail
}

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

// ─── Canvas State ─────────────────────────────────────────────────────────────

/** Unit of measurement for canvas dimension display */
export type CanvasUnit = "px" | "cm" | "inch" | "mm";

export interface CanvasState {
  width: number;
  height: number;
  zoom: number; // 0.1 → 8.0 (10% → 800%)
  panX: number; // horizontal pan offset in pixels
  panY: number; // vertical pan offset in pixels
  backgroundColor: string;
  /** Current display unit for width/height inputs — default 'px' */
  canvasUnit: CanvasUnit;
}

export const DEFAULT_CANVAS_STATE: CanvasState = {
  width: 1920,
  height: 1080,
  zoom: 1,
  panX: 0,
  panY: 0,
  backgroundColor: "#ffffff",
  canvasUnit: "px",
};

// ─── Filter Settings ──────────────────────────────────────────────────────────

export interface FilterSettings {
  brightness: number; // -100 → +100, default 0
  contrast: number; // -100 → +100, default 0
  saturation: number; // -100 → +100, default 0
  hue: number; // 0 → 360, default 0
  blur: number; // 0 → 100, default 0
  grayscale: boolean;
  invert: boolean;
  sepia: boolean;
}

export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  grayscale: false,
  invert: false,
  sepia: false,
};

// ─── Color Types ──────────────────────────────────────────────────────────────

export interface HSBColor {
  h: number; // 0–360
  s: number; // 0–100
  b: number; // 0–100
}

export interface RGBColor {
  r: number; // 0–255
  g: number; // 0–255
  b: number; // 0–255
}

export interface EditorColor {
  foreground: string; // hex color
  background: string; // hex color
}

// ─── Brush Settings ───────────────────────────────────────────────────────────

export interface BrushSettings {
  size: number; // 1 → 500
  hardness: number; // 0 → 100
  opacity: number; // 0 → 100
  flow: number; // 0 → 100
  smoothing: number; // 0 → 100
}

export const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  size: 20,
  hardness: 80,
  opacity: 100,
  flow: 100,
  smoothing: 0,
};

// ─── History ──────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  label: string; // e.g. "Brush stroke", "Add layer", etc.
  timestamp: number;
  canvasSnapshot: string; // full canvas JSON snapshot
}

// ─── Project ──────────────────────────────────────────────────────────────────

/** Frontend project representation */
export interface EditorProject {
  id: bigint | null; // null = unsaved new project
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  canvasJson: string;
  imageRefs: string[];
  createdAt?: bigint;
  updatedAt?: bigint;
}

export const DEFAULT_PROJECT: EditorProject = {
  id: null,
  name: "Untitled",
  width: 1920,
  height: 1080,
  layers: [],
  canvasJson: "{}",
  imageRefs: [],
};

// ─── Editor State ─────────────────────────────────────────────────────────────

export interface EditorState {
  activeTool: ToolId;
  activeLayerId: number | null;
  canvas: CanvasState;
  filters: FilterSettings;
  brush: BrushSettings;
  color: EditorColor;
  history: HistoryEntry[];
  historyIndex: number; // current position in undo stack
  project: EditorProject;
  isDirty: boolean; // unsaved changes
  isLoading: boolean;
}

export const DEFAULT_EDITOR_STATE: EditorState = {
  activeTool: "move",
  activeLayerId: null,
  canvas: DEFAULT_CANVAS_STATE,
  filters: DEFAULT_FILTER_SETTINGS,
  brush: DEFAULT_BRUSH_SETTINGS,
  color: {
    foreground: "#000000",
    background: "#ffffff",
  },
  history: [],
  historyIndex: -1,
  project: DEFAULT_PROJECT,
  isDirty: false,
  isLoading: false,
};

// ─── Selection ────────────────────────────────────────────────────────────────

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Export Options ───────────────────────────────────────────────────────────

export type ExportFormat = "png" | "jpg" | "webp";

export interface ExportOptions {
  format: ExportFormat;
  quality: number; // 0 → 1 (for jpg/webp)
  scale: number; // 0.25 → 4
}
