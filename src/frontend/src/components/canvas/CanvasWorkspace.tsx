/**
 * CanvasWorkspace — Main Fabric.js canvas container.
 *
 * Responsibilities:
 *   1. Initialize Fabric.js canvas on mount (useEffect)
 *   2. Switch drawing mode / cursor based on active tool
 *   3. Zoom: Ctrl+Scroll wheel + zoom in/out buttons
 *   4. Pan: Space+drag (Fabric viewport transform)
 *   5. Image upload via drag-and-drop (uses addImageToCanvas from context)
 *   6. Status bar at the bottom
 *
 * Tool → Fabric mode mapping:
 *   move    → selection=true, isDrawingMode=false
 *   marquee → selection=true, crosshair
 *   lasso   → selection=true, crosshair
 *   brush   → isDrawingMode=true, PencilBrush
 *   eraser  → isDrawingMode=true, PencilBrush (canvas bg color)
 *   text    → click adds IText
 *   shape   → drag draws Rect
 *   gradient→ selection=true
 *   zoom    → click zooms in/out
 */

import type { Canvas as FabricCanvas, IText, Rect } from "fabric";
import {
  Canvas,
  IText as FabricIText,
  Rect as FabricRect,
  PencilBrush,
  Point,
} from "fabric";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasHistory } from "../../hooks/useCanvasHistory";
import { useEditor } from "../../hooks/useEditor";
import type { ToolId } from "../../types/editor";
import { CanvasToolOptions } from "./CanvasToolOptions";

// ─── Constants ────────────────────────────────────────────────────────────────

const ZOOM_STEP = 1.2;
const ZOOM_MIN = 0.05;
const ZOOM_MAX = 30;
const CANVAS_BG = "#1a1a1a";

// ─── Zoom controls ────────────────────────────────────────────────────────────

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  return (
    <div
      className="absolute bottom-8 right-4 flex items-center gap-1 z-20 select-none"
      style={{
        background: "rgba(0,0,0,0.5)",
        border: "1px solid var(--ps-border)",
        borderRadius: 4,
        padding: "2px 4px",
      }}
    >
      <button
        type="button"
        data-ocid="canvas.zoom_out_button"
        title="Zoom out (Ctrl −)"
        onClick={onZoomOut}
        className="h-6 w-6 flex items-center justify-center text-white/60 hover:text-white transition-colors"
      >
        <ZoomOut size={13} />
      </button>
      <button
        type="button"
        data-ocid="canvas.zoom_reset_button"
        title="Reset zoom"
        onClick={onReset}
        className="text-xs font-mono text-white/60 hover:text-white transition-colors px-1 min-w-[3.5rem] text-center"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        data-ocid="canvas.zoom_in_button"
        title="Zoom in (Ctrl +)"
        onClick={onZoomIn}
        className="h-6 w-6 flex items-center justify-center text-white/60 hover:text-white transition-colors"
      >
        <ZoomIn size={13} />
      </button>
      <button
        type="button"
        data-ocid="canvas.fit_button"
        title="Fit to window"
        onClick={onReset}
        className="h-6 w-6 flex items-center justify-center text-white/60 hover:text-white transition-colors ml-0.5"
      >
        <Maximize2 size={12} />
      </button>
    </div>
  );
}

// ─── Utility: apply tool to canvas ────────────────────────────────────────────

function applyTool(
  fabricCanvas: FabricCanvas,
  tool: ToolId,
  brushColor: string,
  brushSize: number,
  brushOpacity: number,
) {
  fabricCanvas.isDrawingMode = false;
  fabricCanvas.selection = true;

  switch (tool) {
    case "move":
      fabricCanvas.defaultCursor = "default";
      fabricCanvas.hoverCursor = "move";
      break;

    case "marquee":
    case "lasso":
      fabricCanvas.defaultCursor = "crosshair";
      break;

    case "brush": {
      fabricCanvas.isDrawingMode = true;
      const pencil = new PencilBrush(fabricCanvas);
      pencil.width = brushSize;
      pencil.strokeLineCap = "round";
      pencil.strokeLineJoin = "round";
      try {
        const r = Number.parseInt(brushColor.slice(1, 3), 16);
        const g = Number.parseInt(brushColor.slice(3, 5), 16);
        const b = Number.parseInt(brushColor.slice(5, 7), 16);
        pencil.color = `rgba(${r},${g},${b},${brushOpacity / 100})`;
      } catch {
        pencil.color = brushColor;
      }
      fabricCanvas.freeDrawingBrush = pencil;
      fabricCanvas.defaultCursor = "crosshair";
      break;
    }

    case "eraser": {
      fabricCanvas.isDrawingMode = true;
      const eraser = new PencilBrush(fabricCanvas);
      eraser.color = CANVAS_BG;
      eraser.width = brushSize;
      eraser.strokeLineCap = "round";
      fabricCanvas.freeDrawingBrush = eraser;
      fabricCanvas.defaultCursor = "cell";
      break;
    }

    case "text":
      fabricCanvas.selection = false;
      fabricCanvas.defaultCursor = "text";
      break;

    case "shape":
      fabricCanvas.selection = false;
      fabricCanvas.defaultCursor = "crosshair";
      break;

    case "gradient":
      fabricCanvas.defaultCursor = "default";
      break;

    case "zoom":
      fabricCanvas.selection = false;
      fabricCanvas.defaultCursor = "zoom-in";
      break;

    default:
      break;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CanvasWorkspace() {
  const {
    state,
    fabricRef,
    setActiveTool,
    setZoom,
    setPan,
    pushHistory,
    addImageToCanvas,
  } = useEditor();

  const history = useCanvasHistory();

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [localZoom, setLocalZoom] = useState(1);

  // Pan state refs
  const spaceRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);

  // Shape drawing refs
  const isDrawingShapeRef = useRef(false);
  const shapeOriginRef = useRef<{ x: number; y: number } | null>(null);
  const activeShapeRef = useRef<Rect | null>(null);

  // Stable ref for active tool (avoids stale closure in Fabric event listeners)
  const activeToolRef = useRef<ToolId>(state.activeTool);
  const foregroundColorRef = useRef(state.color.foreground);
  const backgroundColorRef = useRef(state.color.background);

  useEffect(() => {
    activeToolRef.current = state.activeTool;
  }, [state.activeTool]);
  useEffect(() => {
    foregroundColorRef.current = state.color.foreground;
  }, [state.color.foreground]);
  useEffect(() => {
    backgroundColorRef.current = state.color.background;
  }, [state.color.background]);

  // ── Initialize Fabric canvas ────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once; live values accessed via refs
  useEffect(() => {
    const el = canvasElRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    const w = wrapper.clientWidth || 800;
    const h = wrapper.clientHeight || 600;

    const fc = new Canvas(el, {
      width: w,
      height: h,
      backgroundColor: CANVAS_BG,
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    fabricRef.current = fc;
    history.pushSnapshot(fc, "Initial state");

    // ── History listeners ─────────────────────────────────────────────────────
    const saveHistory = () => {
      history.pushSnapshot(fc);
    };

    fc.on("object:added", saveHistory);
    fc.on("object:removed", saveHistory);
    fc.on("object:modified", saveHistory);
    fc.on("path:created", saveHistory);

    // ── Text tool click handler ───────────────────────────────────────────────
    fc.on("mouse:down", (opt) => {
      if (activeToolRef.current !== "text") return;
      const pointer = fc.getScenePoint(opt.e as MouseEvent);
      const text = new FabricIText("Click to edit", {
        left: pointer.x,
        top: pointer.y,
        fontSize: 24,
        fill: foregroundColorRef.current,
        fontFamily: "Arial",
        editable: true,
      });
      fc.add(text);
      fc.setActiveObject(text);
      (text as IText).enterEditing();
      fc.requestRenderAll();
      setActiveTool("move");
    });

    // ── Shape tool: mousedown ─────────────────────────────────────────────────
    fc.on("mouse:down", (opt) => {
      if (activeToolRef.current !== "shape") return;
      const pointer = fc.getScenePoint(opt.e as MouseEvent);
      shapeOriginRef.current = { x: pointer.x, y: pointer.y };
      isDrawingShapeRef.current = true;
      const rect = new FabricRect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: foregroundColorRef.current,
        stroke: backgroundColorRef.current,
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      activeShapeRef.current = rect;
      fc.add(rect);
    });

    // ── Shape tool: mousemove ─────────────────────────────────────────────────
    fc.on("mouse:move", (opt) => {
      if (!isDrawingShapeRef.current || !shapeOriginRef.current) return;
      const pointer = fc.getScenePoint(opt.e as MouseEvent);
      const origin = shapeOriginRef.current;
      const rect = activeShapeRef.current;
      if (!rect) return;
      rect.set({
        left: Math.min(pointer.x, origin.x),
        top: Math.min(pointer.y, origin.y),
        width: Math.abs(pointer.x - origin.x),
        height: Math.abs(pointer.y - origin.y),
        selectable: true,
        evented: true,
      });
      fc.requestRenderAll();
    });

    // ── Shape tool: mouseup ───────────────────────────────────────────────────
    fc.on("mouse:up", () => {
      if (!isDrawingShapeRef.current) return;
      isDrawingShapeRef.current = false;
      shapeOriginRef.current = null;
      activeShapeRef.current = null;
      fc.requestRenderAll();
      setActiveTool("move");
    });

    // ── Zoom tool click ───────────────────────────────────────────────────────
    fc.on("mouse:down", (opt) => {
      if (activeToolRef.current !== "zoom") return;
      const e = opt.e as MouseEvent;
      const point = fc.getScenePoint(e);
      const factor = e.altKey ? 1 / ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, fc.getZoom() * factor),
      );
      fc.zoomToPoint(new Point(point.x, point.y), newZoom);
      setLocalZoom(newZoom);
      setZoom(newZoom);
    });

    return () => {
      fc.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resize canvas when wrapper resizes ─────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(() => {
      const fc = fabricRef.current;
      if (!fc) return;
      fc.setDimensions({
        width: wrapper.clientWidth,
        height: wrapper.clientHeight,
      });
      fc.requestRenderAll();
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [fabricRef]);

  // ── Apply tool changes to Fabric ─────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    applyTool(
      fc,
      state.activeTool,
      state.color.foreground,
      state.brush.size,
      state.brush.opacity,
    );
  }, [
    state.activeTool,
    state.color.foreground,
    state.brush.size,
    state.brush.opacity,
    fabricRef,
  ]);

  // ── Ctrl+Scroll zoom ─────────────────────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const fc = fabricRef.current;
      if (!fc) return;
      const delta = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, fc.getZoom() * delta),
      );
      fc.zoomToPoint(new Point(e.offsetX, e.offsetY), newZoom);
      setLocalZoom(newZoom);
      setZoom(newZoom);
    }
    wrapper.addEventListener("wheel", onWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", onWheel);
  }, [fabricRef, setZoom]);

  // ── Space key for pan ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !e.repeat) {
        spaceRef.current = true;
        const fc = fabricRef.current;
        if (fc) fc.defaultCursor = "grab";
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        spaceRef.current = false;
        isPanningRef.current = false;
        lastPointerRef.current = null;
        const fc = fabricRef.current;
        if (fc) fc.defaultCursor = "default";
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [fabricRef]);

  // ── Space+drag pan (mouse events) ────────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    function onMouseDown(e: MouseEvent) {
      if (!spaceRef.current) return;
      isPanningRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      const fc = fabricRef.current;
      if (fc) fc.defaultCursor = "grabbing";
      e.preventDefault();
    }
    function onMouseMove(e: MouseEvent) {
      if (!isPanningRef.current || !lastPointerRef.current) return;
      const fc = fabricRef.current;
      if (!fc) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      const vpt = fc.viewportTransform ?? [1, 0, 0, 1, 0, 0];
      vpt[4] += dx;
      vpt[5] += dy;
      fc.setViewportTransform(vpt);
      setPan(vpt[4], vpt[5]);
    }
    function onMouseUp() {
      isPanningRef.current = false;
      lastPointerRef.current = null;
    }
    wrapper.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      wrapper.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [fabricRef, setPan]);

  // ── Drag-and-drop image upload ─────────────────────────────────────────────
  /**
   * When the user drops an image file onto the canvas area, read it via
   * FileReader as a Data URL and pass it to addImageToCanvas() which handles
   * placement, layer registration, and history.
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        if (dataUrl) {
          // Default drop placement: "center" (fits within 80% of canvas)
          addImageToCanvas(dataUrl, "center");
        }
      };
      reader.readAsDataURL(file);
    },
    [addImageToCanvas],
  );

  // ── Undo/Redo keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const fc = fabricRef.current;
      if (!fc) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        history.undo(fc);
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        history.redo(fc);
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        const active = fc.getActiveObjects();
        if (active.length > 0) {
          for (const obj of active) {
            fc.remove(obj);
          }
          fc.discardActiveObject();
          fc.requestRenderAll();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fabricRef, history]);

  // ── Zoom button handlers ──────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const newZoom = Math.min(ZOOM_MAX, fc.getZoom() * ZOOM_STEP);
    fc.zoomToPoint(new Point(fc.getWidth() / 2, fc.getHeight() / 2), newZoom);
    setLocalZoom(newZoom);
    setZoom(newZoom);
  }, [fabricRef, setZoom]);

  const handleZoomOut = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const newZoom = Math.max(ZOOM_MIN, fc.getZoom() / ZOOM_STEP);
    fc.zoomToPoint(new Point(fc.getWidth() / 2, fc.getHeight() / 2), newZoom);
    setLocalZoom(newZoom);
    setZoom(newZoom);
  }, [fabricRef, setZoom]);

  const handleZoomReset = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setLocalZoom(1);
    setZoom(1);
    setPan(0, 0);
  }, [fabricRef, setZoom, setPan]);

  // Suppress unused warning — pushHistory is used indirectly via addImageToCanvas
  void pushHistory;

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ backgroundColor: "var(--ps-bg)" }}
    >
      {/* Tool options bar */}
      <CanvasToolOptions />

      {/* Canvas area */}
      <div
        ref={wrapperRef}
        data-ocid="canvas.workspace"
        className="flex-1 relative overflow-hidden"
        style={{ backgroundColor: CANVAS_BG }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
      >
        {/* Fabric canvas element */}
        <canvas
          ref={canvasElRef}
          data-ocid="canvas.canvas_target"
          style={{ display: "block" }}
        />

        {/* Drop hint — shown in the background when canvas is empty */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center select-none"
          style={{ zIndex: 5 }}
        >
          <span
            className="text-xs font-mono"
            style={{ color: "rgba(255,255,255,0.05)" }}
          >
            Drop an image or use the tools to start editing
          </span>
        </div>

        {/* Zoom controls */}
        <ZoomControls
          zoom={localZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleZoomReset}
        />

        {/* Status bar */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center gap-4 px-3 py-0.5 text-[10px] font-mono select-none pointer-events-none"
          style={{
            borderTop: "1px solid var(--ps-border)",
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "rgba(255,255,255,0.25)",
            zIndex: 15,
          }}
        >
          <span>
            Doc: {state.canvas.width} × {state.canvas.height} px
          </span>
          <span>|</span>
          <span>Zoom: {Math.round(localZoom * 100)}%</span>
          <span>|</span>
          <span>Tool: {state.activeTool}</span>
          <span>|</span>
          <span>Layers: {state.project.layers.length}</span>
          {state.isDirty && (
            <>
              <span>|</span>
              <span>● Unsaved</span>
            </>
          )}
          <span>|</span>
          <span className={history.canUndo ? "text-white/40" : ""}>
            {history.canUndo ? "Undo available" : "No history"}
          </span>
        </div>
      </div>
    </div>
  );
}
