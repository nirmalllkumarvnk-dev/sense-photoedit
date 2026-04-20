/**
 * LeftToolbar — Photoshop-style vertical tool panel.
 *
 * 9 tools arranged in a narrow 52px-wide vertical strip.
 * Active tool highlighted with the primary cyan accent.
 * Tooltip shows tool name + keyboard shortcut on hover.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Blend,
  Eraser,
  Lasso,
  MousePointer2,
  Paintbrush,
  Pentagon,
  RectangleHorizontal,
  Type,
  ZoomIn,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEditor } from "../../hooks/useEditor";
import type { ToolId } from "../../types/editor";

// ─── Tool Definitions ─────────────────────────────────────────────────────────

interface ToolDef {
  id: ToolId;
  label: string;
  shortcut: string;
  Icon: LucideIcon;
}

const TOOLS: ToolDef[] = [
  { id: "move", label: "Move Tool", shortcut: "V", Icon: MousePointer2 },
  {
    id: "marquee",
    label: "Marquee Select",
    shortcut: "M",
    Icon: RectangleHorizontal,
  },
  { id: "lasso", label: "Lasso Tool", shortcut: "L", Icon: Lasso },
  { id: "brush", label: "Brush Tool", shortcut: "B", Icon: Paintbrush },
  { id: "eraser", label: "Eraser Tool", shortcut: "E", Icon: Eraser },
  { id: "text", label: "Type Tool", shortcut: "T", Icon: Type },
  { id: "shape", label: "Shape Tool", shortcut: "U", Icon: Pentagon },
  { id: "gradient", label: "Gradient Tool", shortcut: "G", Icon: Blend },
  { id: "zoom", label: "Zoom Tool", shortcut: "Z", Icon: ZoomIn },
];

// Position of the separator line (after index 2 = after lasso, and after index 5 = after eraser)
const SEPARATOR_AFTER = new Set([2, 6]);

// ─── Color swatch sub-component ───────────────────────────────────────────────

function ColorSwatch({
  foreground,
  background,
}: { foreground: string; background: string }) {
  return (
    <div className="relative w-8 h-8 mt-1">
      {/* Background color box */}
      <div
        className="absolute bottom-0 right-0 w-5 h-5 border"
        style={{
          backgroundColor: background,
          borderColor: "var(--ps-border, #555)",
        }}
      />
      {/* Foreground color box */}
      <div
        className="absolute top-0 left-0 w-5 h-5 border"
        style={{
          backgroundColor: foreground,
          borderColor: "var(--ps-border, #ccc)",
        }}
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeftToolbar() {
  const { state, setActiveTool } = useEditor();
  const { activeTool, color } = state;

  return (
    <TooltipProvider delayDuration={400}>
      <aside
        data-ocid="left-toolbar"
        className="flex flex-col items-center py-2 gap-0.5 shrink-0 overflow-y-auto overflow-x-hidden"
        style={{
          width: 52,
          backgroundColor: "var(--ps-panel, #3d3d3d)",
          borderRight: "1px solid var(--ps-border, #1a1a1a)",
        }}
      >
        {TOOLS.map((tool, idx) => {
          const isActive = activeTool === tool.id;
          return (
            <div key={tool.id} className="flex flex-col items-center w-full">
              {/* Separator line */}
              {SEPARATOR_AFTER.has(idx - 1) && (
                <div
                  className="w-8 my-1"
                  style={{
                    height: 1,
                    backgroundColor: "var(--ps-border, #555)",
                  }}
                />
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-ocid={`toolbar.${tool.id}`}
                    type="button"
                    aria-label={tool.label}
                    aria-pressed={isActive}
                    onClick={() => setActiveTool(tool.id)}
                    className="relative flex items-center justify-center w-10 h-10 rounded-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    style={{
                      backgroundColor: isActive
                        ? "var(--ps-active, rgba(45, 184, 255, 0.25))"
                        : "transparent",
                      color: isActive ? "#2db8ff" : "rgba(255,255,255,0.65)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor =
                          "rgba(255,255,255,0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <tool.Icon size={18} strokeWidth={isActive ? 2 : 1.5} />

                    {/* Active indicator dot — bottom-right corner */}
                    {isActive && (
                      <span
                        className="absolute bottom-1 right-1 w-1 h-1 rounded-full"
                        style={{ backgroundColor: "#2db8ff" }}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-sm text-xs px-2 py-1"
                  style={{
                    backgroundColor: "var(--ps-tooltip, #1a1a1a)",
                    color: "rgba(255,255,255,0.9)",
                    border: "1px solid var(--ps-border, #555)",
                  }}
                >
                  {tool.label}
                  <span className="ml-2 opacity-50">({tool.shortcut})</span>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Foreground / Background color swatches */}
        <div className="flex flex-col items-center pb-2 gap-1">
          <ColorSwatch
            foreground={color.foreground}
            background={color.background}
          />
          <span className="text-[9px] text-foreground/30 font-mono">FG/BG</span>
        </div>
      </aside>
    </TooltipProvider>
  );
}
