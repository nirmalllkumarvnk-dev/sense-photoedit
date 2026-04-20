/**
 * useCanvasHistory — Undo/Redo history management for the Fabric.js canvas.
 *
 * Tracks full canvas JSON snapshots on every meaningful change.
 * Provides canUndo/canRedo booleans and undo()/redo() functions
 * that restore the Fabric.js canvas to a prior state.
 *
 * Max 50 history entries to avoid memory bloat.
 */

import type { Canvas as FabricCanvas } from "fabric";
import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 50;

export interface CanvasHistory {
  canUndo: boolean;
  canRedo: boolean;
  pushSnapshot: (canvas: FabricCanvas, label?: string) => void;
  undo: (canvas: FabricCanvas) => void;
  redo: (canvas: FabricCanvas) => void;
  clearHistory: () => void;
}

export function useCanvasHistory(): CanvasHistory {
  const stackRef = useRef<string[]>([]);
  const indexRef = useRef<number>(-1);

  const [, forceUpdate] = useState(0);

  // Stable notify callback — no external deps
  const notify = useCallback(() => forceUpdate((n) => n + 1), []);

  const restoreSnapshot = useCallback(
    async (canvas: FabricCanvas, snapshot: string) => {
      const data = JSON.parse(snapshot) as object;
      await canvas.loadFromJSON(data);
      canvas.renderAll();
    },
    [],
  );

  const pushSnapshot = useCallback(
    (canvas: FabricCanvas, _label?: string) => {
      const snapshot = JSON.stringify(canvas.toObject());
      stackRef.current = stackRef.current.slice(0, indexRef.current + 1);
      stackRef.current = [...stackRef.current, snapshot].slice(-MAX_HISTORY);
      indexRef.current = stackRef.current.length - 1;
      notify();
    },
    [notify],
  );

  const undo = useCallback(
    (canvas: FabricCanvas) => {
      if (indexRef.current <= 0) return;
      indexRef.current -= 1;
      const snapshot = stackRef.current[indexRef.current];
      if (snapshot) restoreSnapshot(canvas, snapshot);
      notify();
    },
    [restoreSnapshot, notify],
  );

  const redo = useCallback(
    (canvas: FabricCanvas) => {
      if (indexRef.current >= stackRef.current.length - 1) return;
      indexRef.current += 1;
      const snapshot = stackRef.current[indexRef.current];
      if (snapshot) restoreSnapshot(canvas, snapshot);
      notify();
    },
    [restoreSnapshot, notify],
  );

  const clearHistory = useCallback(() => {
    stackRef.current = [];
    indexRef.current = -1;
    notify();
  }, [notify]);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < stackRef.current.length - 1;

  return { canUndo, canRedo, pushSnapshot, undo, redo, clearHistory };
}
