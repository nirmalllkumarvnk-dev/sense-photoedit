/**
 * useEditor — central editor context + hook.
 *
 * Provides the full EditorState and all dispatch actions to every component
 * in the tree. Backed by useReducer for predictable state updates and a
 * Fabric.js canvas ref for direct canvas access.
 *
 * Also exposes `addImageToCanvas(dataUrl, placement)` — the single entry point
 * for adding images from the modal, drag-drop, or any other source.
 */

import { FabricImage as FabricImageClass } from "fabric";
import type { Canvas as FabricCanvas } from "fabric";
import {
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
} from "react";
import {
  type BrushSettings,
  DEFAULT_EDITOR_STATE,
  type EditorColor,
  type EditorProject,
  type EditorState,
  type FilterSettings,
  type HistoryEntry,
  type Layer,
  type ToolId,
} from "../types/editor";

// ─── Placement mode ────────────────────────────────────────────────────────────
export type PlacementMode = "center" | "fill" | "original";

// ─── Action Types ─────────────────────────────────────────────────────────────

type EditorAction =
  | { type: "SET_TOOL"; tool: ToolId }
  | { type: "SET_ACTIVE_LAYER"; layerId: number | null }
  | { type: "ADD_LAYER"; layer: Layer }
  | { type: "REMOVE_LAYER"; layerId: number }
  | { type: "UPDATE_LAYER"; layerId: number; updates: Partial<Layer> }
  | { type: "REORDER_LAYERS"; layers: Layer[] }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; panX: number; panY: number }
  | { type: "SET_FILTERS"; filters: Partial<FilterSettings> }
  | { type: "SET_BRUSH"; brush: Partial<BrushSettings> }
  | { type: "SET_COLOR"; color: Partial<EditorColor> }
  | { type: "SWAP_COLORS" }
  | { type: "PUSH_HISTORY"; entry: HistoryEntry }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_HISTORY" }
  | { type: "SET_PROJECT"; project: EditorProject }
  | { type: "SET_PROJECT_NAME"; name: string }
  | { type: "MARK_DIRTY" }
  | { type: "MARK_CLEAN" }
  | { type: "SET_LOADING"; isLoading: boolean };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_TOOL":
      return { ...state, activeTool: action.tool };

    case "SET_ACTIVE_LAYER":
      return { ...state, activeLayerId: action.layerId };

    case "ADD_LAYER": {
      const layers = [...state.project.layers, action.layer];
      return {
        ...state,
        project: { ...state.project, layers },
        activeLayerId: action.layer.id,
        isDirty: true,
      };
    }

    case "REMOVE_LAYER": {
      const layers = state.project.layers.filter(
        (l) => l.id !== action.layerId,
      );
      const activeLayerId =
        state.activeLayerId === action.layerId
          ? (layers[layers.length - 1]?.id ?? null)
          : state.activeLayerId;
      return {
        ...state,
        project: { ...state.project, layers },
        activeLayerId,
        isDirty: true,
      };
    }

    case "UPDATE_LAYER": {
      const layers = state.project.layers.map((l) =>
        l.id === action.layerId ? { ...l, ...action.updates } : l,
      );
      return { ...state, project: { ...state.project, layers }, isDirty: true };
    }

    case "REORDER_LAYERS":
      return {
        ...state,
        project: { ...state.project, layers: action.layers },
        isDirty: true,
      };

    case "SET_ZOOM":
      return {
        ...state,
        canvas: {
          ...state.canvas,
          zoom: Math.min(8, Math.max(0.1, action.zoom)),
        },
      };

    case "SET_PAN":
      return {
        ...state,
        canvas: { ...state.canvas, panX: action.panX, panY: action.panY },
      };

    case "SET_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.filters },
        isDirty: true,
      };

    case "SET_BRUSH":
      return { ...state, brush: { ...state.brush, ...action.brush } };

    case "SET_COLOR":
      return { ...state, color: { ...state.color, ...action.color } };

    case "SWAP_COLORS":
      return {
        ...state,
        color: {
          foreground: state.color.background,
          background: state.color.foreground,
        },
      };

    case "PUSH_HISTORY": {
      // Discard any redo entries beyond the current index
      const trimmed = state.history.slice(0, state.historyIndex + 1);
      const history = [...trimmed, action.entry].slice(-50); // keep last 50
      return { ...state, history, historyIndex: history.length - 1 };
    }

    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      return { ...state, historyIndex: state.historyIndex - 1 };
    }

    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      return { ...state, historyIndex: state.historyIndex + 1 };
    }

    case "CLEAR_HISTORY":
      return { ...state, history: [], historyIndex: -1 };

    case "SET_PROJECT":
      return {
        ...state,
        project: action.project,
        isDirty: false,
        activeLayerId:
          action.project.layers[action.project.layers.length - 1]?.id ?? null,
      };

    case "SET_PROJECT_NAME":
      return {
        ...state,
        project: { ...state.project, name: action.name },
        isDirty: true,
      };

    case "MARK_DIRTY":
      return { ...state, isDirty: true };

    case "MARK_CLEAN":
      return { ...state, isDirty: false };

    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  fabricRef: RefObject<FabricCanvas | null>;

  // Tool actions
  setActiveTool: (tool: ToolId) => void;

  // Layer actions
  setActiveLayer: (layerId: number | null) => void;
  addLayer: (layer: Layer) => void;
  removeLayer: (layerId: number) => void;
  updateLayer: (layerId: number, updates: Partial<Layer>) => void;
  reorderLayers: (layers: Layer[]) => void;

  // Canvas actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPan: (panX: number, panY: number) => void;

  // Image placement — single entry point for all image-add flows
  addImageToCanvas: (dataUrl: string, placement?: PlacementMode) => void;

  // Editing tools
  setFilters: (filters: Partial<FilterSettings>) => void;
  setBrush: (brush: Partial<BrushSettings>) => void;
  setColor: (color: Partial<EditorColor>) => void;
  swapColors: () => void;

  // History
  pushHistory: (label: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Project
  setProject: (project: EditorProject) => void;
  setProjectName: (name: string) => void;
  markDirty: () => void;
  markClean: () => void;
  setLoading: (isLoading: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditorContext = createContext<EditorContextValue>(
  {} as EditorContextValue,
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, DEFAULT_EDITOR_STATE);

  // Ref to the Fabric.js Canvas instance — shared across all canvas components
  const fabricRef = useRef<FabricCanvas | null>(null);

  // Track how many images have been added so we can name layers "Image 1", "Image 2", etc.
  const imageCountRef = useRef(0);

  // Tool
  const setActiveTool = useCallback(
    (tool: ToolId) => dispatch({ type: "SET_TOOL", tool }),
    [],
  );

  // Layers
  const setActiveLayer = useCallback(
    (layerId: number | null) => dispatch({ type: "SET_ACTIVE_LAYER", layerId }),
    [],
  );
  const addLayer = useCallback(
    (layer: Layer) => dispatch({ type: "ADD_LAYER", layer }),
    [],
  );
  const removeLayer = useCallback(
    (layerId: number) => dispatch({ type: "REMOVE_LAYER", layerId }),
    [],
  );
  const updateLayer = useCallback(
    (layerId: number, updates: Partial<Layer>) =>
      dispatch({ type: "UPDATE_LAYER", layerId, updates }),
    [],
  );
  const reorderLayers = useCallback(
    (layers: Layer[]) => dispatch({ type: "REORDER_LAYERS", layers }),
    [],
  );

  // Canvas / Zoom
  const setZoom = useCallback(
    (zoom: number) => dispatch({ type: "SET_ZOOM", zoom }),
    [],
  );
  const zoomIn = useCallback(
    () => dispatch({ type: "SET_ZOOM", zoom: state.canvas.zoom * 1.25 }),
    [state.canvas.zoom],
  );
  const zoomOut = useCallback(
    () => dispatch({ type: "SET_ZOOM", zoom: state.canvas.zoom / 1.25 }),
    [state.canvas.zoom],
  );
  const resetZoom = useCallback(
    () => dispatch({ type: "SET_ZOOM", zoom: 1 }),
    [],
  );
  const setPan = useCallback(
    (panX: number, panY: number) => dispatch({ type: "SET_PAN", panX, panY }),
    [],
  );

  // ── addImageToCanvas ─────────────────────────────────────────────────────────
  /**
   * Loads a data-URL or object-URL as a Fabric.js Image and places it on the
   * canvas according to the requested placement mode:
   *
   *   center  — scale to fit within 80% of the canvas, place at canvas center
   *   fill    — scale to cover the full canvas, place at (0, 0)
   *   original — no scaling, place at canvas center
   *
   * After placing, a new layer entry is added to the layers panel with the name
   * "Image N" where N auto-increments.
   */
  const addImageToCanvas = useCallback(
    (dataUrl: string, placement: PlacementMode = "center") => {
      const fc = fabricRef.current;
      if (!fc) return;

      FabricImageClass.fromURL(dataUrl, { crossOrigin: "anonymous" }).then(
        (img) => {
          const cw = fc.getWidth();
          const ch = fc.getHeight();
          const iw = img.width ?? 1;
          const ih = img.height ?? 1;

          if (placement === "fill") {
            // Scale to cover entire canvas
            const scale = Math.max(cw / iw, ch / ih);
            img.set({ scaleX: scale, scaleY: scale, left: 0, top: 0 });
          } else if (placement === "original") {
            // Actual pixel size, centered on canvas
            img.set({
              left: cw / 2 - iw / 2,
              top: ch / 2 - ih / 2,
            });
          } else {
            // center: scale to fit within 80% of canvas, keep aspect ratio
            const maxW = cw * 0.8;
            const maxH = ch * 0.8;
            const scale = Math.min(1, maxW / iw, maxH / ih);
            img.set({
              scaleX: scale,
              scaleY: scale,
              left: cw / 2 - (iw * scale) / 2,
              top: ch / 2 - (ih * scale) / 2,
            });
          }

          fc.add(img);
          fc.setActiveObject(img);
          fc.requestRenderAll();

          // Add a layer entry in the layers panel
          imageCountRef.current += 1;
          dispatch({
            type: "ADD_LAYER",
            layer: {
              id: Date.now(),
              name: `Image ${imageCountRef.current}`,
              visible: true,
              locked: false,
              opacity: 100,
              blendMode: "normal",
              fabricJson: "{}",
            },
          });

          // Snapshot history
          const canvasSnapshot = JSON.stringify(fc.toObject());
          dispatch({
            type: "PUSH_HISTORY",
            entry: {
              id: `${Date.now()}-${Math.random()}`,
              label: `Add Image ${imageCountRef.current}`,
              timestamp: Date.now(),
              canvasSnapshot,
            },
          });

          dispatch({ type: "MARK_DIRTY" });
        },
      );
    },
    [],
  );

  // Filters / Brush / Color
  const setFilters = useCallback(
    (filters: Partial<FilterSettings>) =>
      dispatch({ type: "SET_FILTERS", filters }),
    [],
  );
  const setBrush = useCallback(
    (brush: Partial<BrushSettings>) => dispatch({ type: "SET_BRUSH", brush }),
    [],
  );
  const setColor = useCallback(
    (color: Partial<EditorColor>) => dispatch({ type: "SET_COLOR", color }),
    [],
  );
  const swapColors = useCallback(() => dispatch({ type: "SWAP_COLORS" }), []);

  // History
  const pushHistory = useCallback((label: string) => {
    const canvas = fabricRef.current;
    const canvasSnapshot = canvas ? JSON.stringify(canvas.toObject()) : "{}";
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random()}`,
      label,
      timestamp: Date.now(),
      canvasSnapshot,
    };
    dispatch({ type: "PUSH_HISTORY", entry });
  }, []);
  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  // Project
  const setProject = useCallback(
    (project: EditorProject) => dispatch({ type: "SET_PROJECT", project }),
    [],
  );
  const setProjectName = useCallback(
    (name: string) => dispatch({ type: "SET_PROJECT_NAME", name }),
    [],
  );
  const markDirty = useCallback(() => dispatch({ type: "MARK_DIRTY" }), []);
  const markClean = useCallback(() => dispatch({ type: "MARK_CLEAN" }), []);
  const setLoading = useCallback(
    (isLoading: boolean) => dispatch({ type: "SET_LOADING", isLoading }),
    [],
  );

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return (
    <EditorContext.Provider
      value={{
        state,
        fabricRef,
        setActiveTool,
        setActiveLayer,
        addLayer,
        removeLayer,
        updateLayer,
        reorderLayers,
        setZoom,
        zoomIn,
        zoomOut,
        resetZoom,
        setPan,
        addImageToCanvas,
        setFilters,
        setBrush,
        setColor,
        swapColors,
        pushHistory,
        undo,
        redo,
        canUndo,
        canRedo,
        setProject,
        setProjectName,
        markDirty,
        markClean,
        setLoading,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Access the full editor state and actions from any component */
export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within <EditorProvider>");
  return ctx;
}
