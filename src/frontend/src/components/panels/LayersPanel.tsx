/**
 * LayersPanel — Photoshop-style layer management.
 *
 * Features:
 *  - Layer list in Photoshop order (newest on top)
 *  - Eye icon to toggle visibility
 *  - Layer thumbnail placeholder
 *  - Inline rename on double-click
 *  - Active layer highlighted in cyan
 *  - Up/down arrows for reordering
 *  - Add / Delete buttons in footer
 *  - Blend mode selector for active layer
 *  - Opacity for active layer
 */

import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useEditor } from "../../hooks/useEditor";
import type { BlendMode, Layer } from "../../types/editor";

// ─── Blend mode options ───────────────────────────────────────────────────────

const BLEND_MODES: BlendMode[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
];

// ─── Layer Row ─────────────────────────────────────────────────────────────────

interface LayerRowProps {
  layer: Layer;
  index: number;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onRename: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function LayerRow({
  layer,
  index,
  isActive,
  isFirst,
  isLast,
  onSelect,
  onToggleVisible,
  onRename,
  onMoveUp,
  onMoveDown,
  onDelete,
}: LayerRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(layer.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }

  function commitEdit() {
    const trimmed = draft.trim() || layer.name;
    onRename(trimmed);
    setEditing(false);
  }

  return (
    <button
      type="button"
      data-ocid={`layers.item.${index}`}
      className="flex w-full items-center gap-1.5 px-1.5 py-1.5 cursor-pointer group transition-colors select-none text-left"
      style={{
        backgroundColor: isActive ? "rgba(45,184,255,0.18)" : "transparent",
        borderLeft: isActive ? "2px solid #2db8ff" : "2px solid transparent",
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!isActive)
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {/* Visibility eye */}
      <button
        type="button"
        data-ocid={`layers.visibility.${index}`}
        aria-label={layer.visible ? "Hide layer" : "Show layer"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible();
        }}
        className="shrink-0 w-5 h-5 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
        style={{ opacity: layer.visible ? 1 : 0.3 }}
      >
        {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>

      {/* Thumbnail */}
      <div
        className="shrink-0 w-8 h-8 rounded-sm border overflow-hidden"
        style={{
          borderColor: isActive
            ? "rgba(45,184,255,0.5)"
            : "var(--ps-border,#555)",
          backgroundColor: "var(--ps-canvas,#1a1a1a)",
          backgroundImage: layer.thumbnail
            ? `url(${layer.thumbnail})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      >
        {!layer.thumbnail && (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-3 h-3 rounded-sm opacity-20"
              style={{
                background: "linear-gradient(135deg, #fff 50%, #888 50%)",
              }}
            />
          </div>
        )}
      </div>

      {/* Layer name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            data-ocid={`layers.rename_input.${index}`}
            type="text"
            value={draft}
            className="w-full text-xs font-mono bg-transparent border-b border-primary focus:outline-none text-foreground/90 px-0.5"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="block text-xs font-mono truncate"
            style={{ color: isActive ? "#2db8ff" : "rgba(255,255,255,0.7)" }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEdit();
            }}
            title="Double-click to rename"
          >
            {layer.name}
          </span>
        )}
        {layer.locked && (
          <span className="text-[9px] font-mono text-foreground/30">
            🔒 locked
          </span>
        )}
      </div>

      {/* Up/Down reorder */}
      <div className="flex flex-col gap-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          data-ocid={`layers.move_up.${index}`}
          aria-label="Move layer up"
          disabled={isFirst}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          className="w-4 h-4 flex items-center justify-center text-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors"
        >
          <ChevronUp size={10} />
        </button>
        <button
          type="button"
          data-ocid={`layers.move_down.${index}`}
          aria-label="Move layer down"
          disabled={isLast}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          className="w-4 h-4 flex items-center justify-center text-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors"
        >
          <ChevronDown size={10} />
        </button>
      </div>

      {/* Delete */}
      <button
        type="button"
        data-ocid={`layers.delete_button.${index}`}
        aria-label="Delete layer"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 w-5 h-5 flex items-center justify-center text-foreground/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 size={10} />
      </button>
    </button>
  );
}

// ─── LayersPanel ──────────────────────────────────────────────────────────────

export function LayersPanel() {
  const {
    state,
    setActiveLayer,
    updateLayer,
    addLayer,
    removeLayer,
    reorderLayers,
  } = useEditor();
  const { layers } = state.project;
  const activeLayer = layers.find((l) => l.id === state.activeLayerId);

  // Photoshop order: newest/top layer shown first
  const reversed = [...layers].reverse();

  function handleAddLayer() {
    const newId = Date.now();
    addLayer({
      id: newId,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: "normal",
      fabricJson: "{}",
    });
  }

  function moveLayer(layerId: number, direction: "up" | "down") {
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx === -1) return;
    const newLayers = [...layers];
    const swapIdx = direction === "up" ? idx + 1 : idx - 1;
    if (swapIdx < 0 || swapIdx >= newLayers.length) return;
    [newLayers[idx], newLayers[swapIdx]] = [newLayers[swapIdx], newLayers[idx]];
    reorderLayers(newLayers);
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 180 }}>
      {/* ── Blend mode + opacity controls (for active layer) ── */}
      {activeLayer && (
        <div
          className="px-2 py-2 space-y-1.5 shrink-0"
          style={{ borderBottom: "1px solid var(--ps-border,#555)" }}
        >
          <div className="flex items-center gap-2">
            <select
              data-ocid="layers.blend_mode_select"
              value={activeLayer.blendMode}
              onChange={(e) =>
                updateLayer(activeLayer.id, {
                  blendMode: e.target.value as BlendMode,
                })
              }
              className="flex-1 text-xs font-mono border rounded-sm px-1.5 py-0.5 focus:outline-none focus:border-primary text-foreground/80 cursor-pointer appearance-none"
              style={{
                backgroundColor: "var(--ps-canvas,#1a1a1a)",
                borderColor: "var(--ps-border,#555)",
              }}
            >
              {BLEND_MODES.map((m) => (
                <option
                  key={m}
                  value={m}
                  style={{ backgroundColor: "#2b2b2b" }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
            <span className="text-xs font-mono text-foreground/40 shrink-0">
              Fill:
            </span>
            <div
              className="w-12 h-5 rounded-sm border"
              style={{
                backgroundColor: "var(--ps-canvas,#1a1a1a)",
                borderColor: "var(--ps-border,#555)",
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="layer-opacity"
              className="text-xs font-mono text-foreground/40 w-12 shrink-0"
            >
              Opacity:
            </label>
            <input
              id="layer-opacity"
              data-ocid="layers.opacity_slider"
              type="range"
              min={0}
              max={100}
              value={activeLayer.opacity}
              onChange={(e) =>
                updateLayer(activeLayer.id, { opacity: Number(e.target.value) })
              }
              className="flex-1 h-2 appearance-none rounded-full cursor-pointer"
              style={{ accentColor: "#2db8ff" }}
            />
            <span className="text-xs font-mono text-foreground/60 w-8 text-right shrink-0">
              {activeLayer.opacity}%
            </span>
          </div>
        </div>
      )}

      {/* ── Layer list ── */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 260 }}>
        {reversed.length === 0 ? (
          <div
            data-ocid="layers.empty_state"
            className="flex flex-col items-center justify-center gap-2 py-8 text-foreground/25"
          >
            <span className="text-2xl" aria-hidden="true">
              📄
            </span>
            <span className="text-xs font-mono">No layers yet</span>
            <button
              type="button"
              data-ocid="layers.add_first_button"
              onClick={handleAddLayer}
              className="mt-1 text-xs font-mono text-primary hover:underline"
            >
              + Add layer
            </button>
          </div>
        ) : (
          reversed.map((layer, revIdx) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              index={revIdx + 1}
              isActive={layer.id === state.activeLayerId}
              isFirst={revIdx === 0}
              isLast={revIdx === reversed.length - 1}
              onSelect={() => setActiveLayer(layer.id)}
              onToggleVisible={() =>
                updateLayer(layer.id, { visible: !layer.visible })
              }
              onRename={(name) => updateLayer(layer.id, { name })}
              onMoveUp={() => moveLayer(layer.id, "up")}
              onMoveDown={() => moveLayer(layer.id, "down")}
              onDelete={() => {
                if (confirm(`Delete "${layer.name}"?`)) removeLayer(layer.id);
              }}
            />
          ))
        )}
      </div>

      {/* ── Footer toolbar ── */}
      <div
        className="flex items-center justify-between px-2 py-1.5 shrink-0"
        style={{ borderTop: "1px solid var(--ps-border,#555)" }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-ocid="layers.add_button"
            onClick={handleAddLayer}
            title="New layer"
            aria-label="Add new layer"
            className="w-6 h-6 flex items-center justify-center text-xs text-foreground/50 hover:text-foreground hover:bg-white/10 rounded-sm transition-colors"
          >
            +
          </button>
          <button
            type="button"
            data-ocid="layers.delete_active_button"
            onClick={() => {
              if (state.activeLayerId !== null) {
                const layer = layers.find((l) => l.id === state.activeLayerId);
                if (layer && confirm(`Delete "${layer.name}"?`))
                  removeLayer(state.activeLayerId);
              }
            }}
            disabled={state.activeLayerId === null}
            title="Delete active layer"
            aria-label="Delete active layer"
            className="w-6 h-6 flex items-center justify-center text-foreground/50 hover:text-destructive hover:bg-white/10 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <span className="text-[10px] font-mono text-foreground/25">
          {layers.length} layer{layers.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
