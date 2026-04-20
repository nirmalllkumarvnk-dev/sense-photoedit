/**
 * RightPanels — Photoshop-style right panel stack.
 *
 * Three collapsible accordion sections:
 *   1. Color   — full HSB/RGB color picker
 *   2. Properties — active object or canvas properties
 *   3. Layers  — full layer stack management
 *
 * Each section can be collapsed with a chevron toggle, matching
 * Photoshop's panel accordion behavior.
 */

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ColorPanel } from "../panels/ColorPanel";
import { LayersPanel } from "../panels/LayersPanel";
import { PropertiesPanel } from "../panels/PropertiesPanel";

// ─── Panel Section ────────────────────────────────────────────────────────────

interface PanelSectionProps {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  minHeight?: number;
}

function PanelSection({
  id,
  title,
  isOpen,
  onToggle,
  children,
  minHeight = 120,
}: PanelSectionProps) {
  return (
    <section
      data-ocid={`panel.${id}`}
      className="flex flex-col shrink-0"
      style={{ borderBottom: "1px solid var(--ps-border, #1a1a1a)" }}
    >
      {/* Panel header — click to collapse/expand */}
      <button
        type="button"
        data-ocid={`panel.${id}.toggle`}
        onClick={onToggle}
        className="flex items-center justify-between px-3 py-2 w-full text-left hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        style={{ backgroundColor: "var(--ps-panel-header, #4a4a4a)" }}
      >
        <span className="text-xs font-semibold text-foreground/80 font-mono uppercase tracking-wider">
          {title}
        </span>
        {isOpen ? (
          <ChevronDown size={12} className="text-foreground/50 shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-foreground/50 shrink-0" />
        )}
      </button>

      {/* Panel body */}
      {isOpen && (
        <div className="overflow-hidden" style={{ minHeight }}>
          {children}
        </div>
      )}
    </section>
  );
}

// ─── RightPanels ─────────────────────────────────────────────────────────────

export function RightPanels() {
  const [openPanels, setOpenPanels] = useState({
    color: true,
    properties: false,
    layers: true,
  });

  function togglePanel(id: keyof typeof openPanels) {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside
      data-ocid="right-panels"
      className="flex flex-col shrink-0 overflow-y-auto"
      style={{
        width: 264,
        backgroundColor: "var(--ps-panel, #3d3d3d)",
        borderLeft: "1px solid var(--ps-border, #1a1a1a)",
      }}
    >
      {/* ── Color Panel ── */}
      <PanelSection
        id="color"
        title="Color"
        isOpen={openPanels.color}
        onToggle={() => togglePanel("color")}
        minHeight={200}
      >
        <ColorPanel />
      </PanelSection>

      {/* ── Properties Panel ── */}
      <PanelSection
        id="properties"
        title="Properties"
        isOpen={openPanels.properties}
        onToggle={() => togglePanel("properties")}
        minHeight={120}
      >
        <PropertiesPanel />
      </PanelSection>

      {/* ── Layers Panel ── */}
      <PanelSection
        id="layers"
        title="Layers"
        isOpen={openPanels.layers}
        onToggle={() => togglePanel("layers")}
        minHeight={200}
      >
        <LayersPanel />
      </PanelSection>

      {/* Spacer to push content up */}
      <div className="flex-1" style={{ minHeight: 40 }} />
    </aside>
  );
}
