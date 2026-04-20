/**
 * App.tsx — Root layout shell for Sense PhotoEdit.
 *
 * Provides the Photoshop-style layout structure:
 *   ┌─────────────────────────────────────────────────────┐
 *   │                    MenuBar (top)                    │
 *   ├───────┬─────────────────────────────────┬───────────┤
 *   │ Left  │         Canvas Area             │  Right    │
 *   │ Tools │     (center workspace)          │  Panels   │
 *   └───────┴─────────────────────────────────┴───────────┘
 *
 * Also includes: welcome modal, filter modal, export modal,
 * image upload modal, save modal, and keyboard shortcuts help modal.
 *
 * NOTE: QueryClientProvider + InternetIdentityProvider are already
 * provided by main.tsx — do NOT add them here.
 */

import { Keyboard, X } from "lucide-react";
import { useRef, useState } from "react";
import { CanvasWorkspace } from "./components/canvas/CanvasWorkspace";
import { LeftToolbar } from "./components/layout/LeftToolbar";
import { MenuBar } from "./components/layout/MenuBar";
import { RightPanels } from "./components/layout/RightPanels";
import { ExportModal } from "./components/modals/ExportModal";
import { FilterModal } from "./components/modals/FilterModal";
import {
  ImageUploadModal,
  type PlacementMode,
} from "./components/modals/ImageUploadModal";
import { SaveProjectModal } from "./components/modals/SaveProjectModal";
import { WelcomeModal } from "./components/modals/WelcomeModal";
import { useCanvasHistory } from "./hooks/useCanvasHistory";
import { EditorProvider, useEditor } from "./hooks/useEditor";
import {
  ALL_SHORTCUTS,
  type ShortcutEntry,
  useKeyboardShortcuts,
} from "./hooks/useKeyboardShortcuts";

// ─── Shortcuts Help Modal ──────────────────────────────────────────────────────

interface ShortcutsModalProps {
  onClose: () => void;
}

/** Groups shortcuts by category and renders them in a two-column table. */
function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  // Group entries by category
  const grouped: Record<string, ShortcutEntry[]> = {};
  for (const s of ALL_SHORTCUTS) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  return (
    <div
      data-ocid="shortcuts.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.78)" }}
    >
      {/* Backdrop click to close */}
      <button
        type="button"
        aria-label="Close shortcuts"
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      <div
        className="relative w-full max-w-2xl mx-4 rounded shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--ps-panel, #3d3d3d)",
          border: "1px solid var(--ps-border, #555)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{
            backgroundColor: "var(--ps-panel-header, #4a4a4a)",
            borderBottom: "1px solid var(--ps-border, #555)",
          }}
        >
          <div className="flex items-center gap-2">
            <Keyboard
              size={15}
              style={{ color: "var(--ps-accent, #00d4ff)" }}
            />
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              Keyboard Shortcuts
            </span>
          </div>
          <button
            type="button"
            data-ocid="shortcuts.close_button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-5 space-y-5">
          {Object.entries(grouped).map(([category, entries]) => (
            <div key={category}>
              {/* Category heading */}
              <h3
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--ps-accent, #00d4ff)" }}
              >
                {category}
              </h3>

              {/* Shortcuts table */}
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.action}
                      className="border-b transition-colors hover:bg-white/5"
                      style={{ borderColor: "var(--ps-border, #555)" }}
                    >
                      <td
                        className="py-1.5 pr-4"
                        style={{ color: "rgba(255,255,255,0.65)" }}
                      >
                        {entry.action}
                      </td>
                      <td className="py-1.5 text-right">
                        <kbd
                          className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold"
                          style={{
                            backgroundColor: "var(--ps-bg, #2b2b2b)",
                            border: "1px solid var(--ps-border, #555)",
                            color: "var(--ps-accent, #00d4ff)",
                          }}
                        >
                          {entry.shortcut}
                        </kbd>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Footer hint */}
          <p
            className="text-[10px] text-center pt-2"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Press{" "}
            <kbd
              className="px-1 py-0.5 rounded font-mono text-[10px]"
              style={{
                backgroundColor: "var(--ps-bg, #2b2b2b)",
                border: "1px solid var(--ps-border, #555)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              ?
            </kbd>{" "}
            any time to open this panel
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Editor Shell ──────────────────────────────────────────────────────────────

function EditorShell() {
  const { fabricRef, addImageToCanvas } = useEditor();
  const history = useCanvasHistory();

  // Modal visibility state
  const [showWelcome, setShowWelcome] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Hidden file input ref for Ctrl+O
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Undo / Redo handlers passed to the keyboard hook ────────────────────────
  function handleUndo() {
    const fc = fabricRef.current;
    if (fc) history.undo(fc);
  }

  function handleRedo() {
    const fc = fabricRef.current;
    if (fc) history.redo(fc);
  }

  // ── Wire all global keyboard shortcuts ──────────────────────────────────────
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSave: () => setShowSave(true),
    onExport: () => setShowExport(true),
    onOpenImage: () => fileInputRef.current?.click(),
    onShowShortcuts: () => setShowShortcuts((v) => !v),
  });

  // ── Quick open via hidden file input (Ctrl+O) ────────────────────────────────
  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Open the image upload modal pre-filled — for now open the modal and
    // let the user confirm placement (mirrors Photoshop's Open dialog flow)
    setShowImageUpload(true);
    e.target.value = "";
  }

  return (
    <div
      className="flex flex-col w-screen h-screen overflow-hidden"
      style={{ backgroundColor: "var(--ps-bg, #2b2b2b)" }}
    >
      {/* ── Top menu bar ──────────────────────────────────────────────────── */}
      <MenuBar
        onFilterOpen={() => setShowFilter(true)}
        onExportOpen={() => setShowExport(true)}
      />

      {/* ── Main workspace ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <LeftToolbar />

        {/* Center canvas */}
        <CanvasWorkspace />

        {/* Right panels */}
        <RightPanels />
      </div>

      {/* ── Hidden file input for Ctrl+O ──────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileInputChange}
      />

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}

      {showFilter && (
        <FilterModal
          onClose={() => setShowFilter(false)}
          canvas={fabricRef.current}
        />
      )}

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}

      {showImageUpload && (
        <ImageUploadModal
          onClose={() => setShowImageUpload(false)}
          onImageAdd={(dataUrl: string, mode: PlacementMode) => {
            // Delegate to the shared addImageToCanvas from EditorContext.
            // It handles placement, layer creation, and history snapshot.
            addImageToCanvas(dataUrl, mode);
            setShowImageUpload(false);
          }}
        />
      )}

      {showSave && <SaveProjectModal onClose={() => setShowSave(false)} />}

      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <EditorProvider>
      <EditorShell />
    </EditorProvider>
  );
}
