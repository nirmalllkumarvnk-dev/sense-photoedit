/**
 * useKeyboardShortcuts — Global keyboard shortcut manager for Sense PhotoEdit.
 *
 * Registers a single window-level "keydown" listener and dispatches all tool
 * hotkeys, canvas actions, and application commands from one place so there
 * are no duplicate listeners competing with each other.
 *
 * Shortcuts are SKIPPED when focus is inside an INPUT, TEXTAREA, or SELECT.
 *
 * Usage:
 *   useKeyboardShortcuts({
 *     onUndo, onRedo, onSave, onExport, onOpenImage, onShowShortcuts
 *   });
 */

import { ActiveSelection, type FabricObject } from "fabric";
import { useEffect, useRef } from "react";
import { useEditor } from "./useEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeyboardShortcutCallbacks {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onOpenImage?: () => void;
  onShowShortcuts?: () => void;
}

// ─── Shortcut definitions (for display in the help modal) ─────────────────────

export interface ShortcutEntry {
  category: string;
  action: string;
  shortcut: string;
}

export const ALL_SHORTCUTS: ShortcutEntry[] = [
  // Tools
  { category: "Tools", action: "Move / Selection", shortcut: "V" },
  { category: "Tools", action: "Marquee Select", shortcut: "M" },
  { category: "Tools", action: "Lasso Select", shortcut: "L" },
  { category: "Tools", action: "Brush", shortcut: "B" },
  { category: "Tools", action: "Eraser", shortcut: "E" },
  { category: "Tools", action: "Text", shortcut: "T" },
  { category: "Tools", action: "Shape", shortcut: "U" },
  { category: "Tools", action: "Gradient", shortcut: "G" },
  { category: "Tools", action: "Zoom", shortcut: "Z" },
  // Brush
  { category: "Brush", action: "Decrease Brush Size", shortcut: "[" },
  { category: "Brush", action: "Increase Brush Size", shortcut: "]" },
  {
    category: "Brush",
    action: "Decrease Brush Opacity −10%",
    shortcut: "Shift + [",
  },
  {
    category: "Brush",
    action: "Increase Brush Opacity +10%",
    shortcut: "Shift + ]",
  },
  // Canvas
  { category: "Canvas", action: "Undo", shortcut: "Ctrl / ⌘ + Z" },
  { category: "Canvas", action: "Redo", shortcut: "Ctrl / ⌘ + Y  or  Shift+Z" },
  {
    category: "Canvas",
    action: "Delete Selected",
    shortcut: "Delete / Backspace",
  },
  { category: "Canvas", action: "Select All", shortcut: "Ctrl / ⌘ + A" },
  { category: "Canvas", action: "Copy", shortcut: "Ctrl / ⌘ + C" },
  { category: "Canvas", action: "Paste", shortcut: "Ctrl / ⌘ + V" },
  { category: "Canvas", action: "Deselect", shortcut: "Ctrl / ⌘ + D" },
  { category: "Canvas", action: "Escape / Cancel", shortcut: "Escape" },
  // Zoom
  { category: "Zoom", action: "Zoom In", shortcut: "Ctrl / ⌘ + =" },
  { category: "Zoom", action: "Zoom Out", shortcut: "Ctrl / ⌘ + −" },
  { category: "Zoom", action: "Fit to Screen", shortcut: "Ctrl / ⌘ + 0" },
  // File
  { category: "File", action: "Open Image", shortcut: "Ctrl / ⌘ + O" },
  { category: "File", action: "Save Project", shortcut: "Ctrl / ⌘ + S" },
  {
    category: "File",
    action: "Export / Save As",
    shortcut: "Ctrl / ⌘ + Shift + S",
  },
  // Help
  { category: "Help", action: "Show Keyboard Shortcuts", shortcut: "?" },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Registers all global keyboard shortcuts.
 * Must be called inside a component that is wrapped by <EditorProvider>.
 */
export function useKeyboardShortcuts(
  callbacks: KeyboardShortcutCallbacks = {},
) {
  const {
    setActiveTool,
    fabricRef,
    setBrush,
    state,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useEditor();

  // Keep callbacks in a ref so the event listener never becomes stale
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  // Keep brush settings in a ref for same reason (avoids stale closure)
  const brushRef = useRef(state.brush);
  brushRef.current = state.brush;

  // Store the most-recently copied Fabric object for Ctrl+V paste
  const copiedObjectRef = useRef<FabricObject | null>(null);

  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      // ── Skip when typing in a form element ─────────────────────────────────
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const ctrl = e.ctrlKey || e.metaKey;
      const fc = fabricRef.current;

      // ── Ctrl / Cmd shortcuts ────────────────────────────────────────────────
      if (ctrl) {
        switch (e.key.toLowerCase()) {
          // Undo (Ctrl+Z) — Redo (Ctrl+Shift+Z)
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              cbRef.current.onRedo?.();
            } else {
              cbRef.current.onUndo?.();
            }
            return;

          // Redo (Ctrl+Y)
          case "y":
            e.preventDefault();
            cbRef.current.onRedo?.();
            return;

          // Select All (Ctrl+A)
          case "a":
            e.preventDefault();
            if (!fc) return;
            {
              const allObjs = fc.getObjects();
              if (allObjs.length > 0) {
                const sel = new ActiveSelection(allObjs, { canvas: fc });
                fc.setActiveObject(sel);
                fc.requestRenderAll();
              }
            }
            return;

          // Copy (Ctrl+C)
          case "c":
            e.preventDefault();
            if (!fc) return;
            {
              const active = fc.getActiveObject();
              if (!active) return;
              const cloned = await active.clone();
              copiedObjectRef.current = cloned;
            }
            return;

          // Paste (Ctrl+V)
          case "v":
            e.preventDefault();
            if (!fc || !copiedObjectRef.current) return;
            {
              const cloned = await copiedObjectRef.current.clone();
              // Offset so paste doesn't land exactly on top of original
              cloned.set({
                left: (cloned.left ?? 0) + 20,
                top: (cloned.top ?? 0) + 20,
              });
              fc.discardActiveObject();
              // Check if it's a group (has _objects property)
              if (
                "_objects" in cloned &&
                Array.isArray((cloned as { _objects: FabricObject[] })._objects)
              ) {
                const grp = cloned as FabricObject & {
                  _objects: FabricObject[];
                  setCoords: () => void;
                };
                for (const obj of grp._objects) fc.add(obj);
                grp.setCoords();
              } else {
                fc.add(cloned);
              }
              // Update copiedRef so the next paste also offsets
              copiedObjectRef.current = cloned;
              fc.setActiveObject(cloned);
              fc.requestRenderAll();
            }
            return;

          // Deselect (Ctrl+D)
          case "d":
            e.preventDefault();
            fc?.discardActiveObject();
            fc?.requestRenderAll();
            return;

          // Zoom In (Ctrl += or Ctrl++)
          case "=":
          case "+":
            e.preventDefault();
            zoomIn();
            return;

          // Zoom Out (Ctrl+-)
          case "-":
            e.preventDefault();
            zoomOut();
            return;

          // Fit to screen (Ctrl+0)
          case "0":
            e.preventDefault();
            resetZoom();
            return;

          // Open image (Ctrl+O)
          case "o":
            e.preventDefault();
            cbRef.current.onOpenImage?.();
            return;

          // Save (Ctrl+S) / Export (Ctrl+Shift+S)
          case "s":
            e.preventDefault();
            if (e.shiftKey) {
              cbRef.current.onExport?.();
            } else {
              cbRef.current.onSave?.();
            }
            return;

          default:
            break;
        }
        // Don't fall through to tool hotkeys when Ctrl is held
        return;
      }

      // ── Non-modifier shortcuts ──────────────────────────────────────────────

      switch (e.key) {
        // ── Tool hotkeys ────────────────────────────────────────────────────
        case "v":
        case "V":
          setActiveTool("move");
          return;
        case "m":
        case "M":
          setActiveTool("marquee");
          return;
        case "l":
        case "L":
          setActiveTool("lasso");
          return;
        case "b":
        case "B":
          setActiveTool("brush");
          return;
        case "e":
        case "E":
          setActiveTool("eraser");
          return;
        case "t":
        case "T":
          setActiveTool("text");
          return;
        case "u":
        case "U":
          setActiveTool("shape");
          return;
        case "g":
        case "G":
          setActiveTool("gradient");
          return;
        case "z":
        case "Z":
          setActiveTool("zoom");
          return;

        // ── Brush size / opacity ─────────────────────────────────────────────
        case "[":
          if (e.shiftKey) {
            // Shift+[ → decrease opacity by 10%
            setBrush({ opacity: Math.max(0, brushRef.current.opacity - 10) });
          } else {
            // [ → decrease size by 5px
            setBrush({ size: Math.max(1, brushRef.current.size - 5) });
          }
          return;

        case "]":
          if (e.shiftKey) {
            // Shift+] → increase opacity by 10%
            setBrush({ opacity: Math.min(100, brushRef.current.opacity + 10) });
          } else {
            // ] → increase size by 5px
            setBrush({ size: Math.min(500, brushRef.current.size + 5) });
          }
          return;

        // ── Delete selected objects ──────────────────────────────────────────
        case "Delete":
        case "Backspace": {
          if (!fc) return;
          const selected = fc.getActiveObjects();
          if (selected.length === 0) return;
          for (const obj of selected) fc.remove(obj);
          fc.discardActiveObject();
          fc.requestRenderAll();
          return;
        }

        // ── Escape: deselect + switch to move ───────────────────────────────
        case "Escape":
          fc?.discardActiveObject();
          fc?.requestRenderAll();
          setActiveTool("move");
          return;

        // ── Show shortcuts help modal ────────────────────────────────────────
        case "?":
          cbRef.current.onShowShortcuts?.();
          return;

        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fabricRef, setActiveTool, setBrush, zoomIn, zoomOut, resetZoom]);
}
