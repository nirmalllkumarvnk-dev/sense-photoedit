/**
 * MenuBar — Photoshop-style top menu bar.
 *
 * Each menu item opens a Radix DropdownMenu with realistic sub-items
 * and keyboard shortcuts shown in the right column.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditor } from "../../hooks/useEditor";

// ─── Menu definitions ─────────────────────────────────────────────────────────

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: string;
  separator?: boolean;
  disabled?: boolean;
}

interface MenuDef {
  label: string;
  items: MenuItem[];
}

const MENUS: MenuDef[] = [
  {
    label: "File",
    items: [
      { label: "New…", shortcut: "⌘N", action: "file.new" },
      { label: "Open…", shortcut: "⌘O", action: "file.open" },
      { label: "Open Recent", disabled: true },
      { separator: true, label: "" },
      { label: "Save", shortcut: "⌘S", action: "file.save" },
      { label: "Save As…", shortcut: "⇧⌘S", action: "file.saveAs" },
      { separator: true, label: "" },
      { label: "Export As…", shortcut: "⌥⇧⌘W", action: "file.export" },
      { label: "Export PNG", shortcut: "⌘E", action: "file.exportPng" },
      { label: "Export JPG", action: "file.exportJpg" },
      { separator: true, label: "" },
      { label: "Close", shortcut: "⌘W", action: "file.close" },
    ],
  },
  {
    label: "Edit",
    items: [
      { label: "Undo", shortcut: "⌘Z", action: "edit.undo" },
      { label: "Redo", shortcut: "⇧⌘Z", action: "edit.redo" },
      { separator: true, label: "" },
      { label: "Cut", shortcut: "⌘X", action: "edit.cut" },
      { label: "Copy", shortcut: "⌘C", action: "edit.copy" },
      { label: "Paste", shortcut: "⌘V", action: "edit.paste" },
      { separator: true, label: "" },
      { label: "Free Transform", shortcut: "⌘T", action: "edit.transform" },
      { label: "Select All", shortcut: "⌘A", action: "edit.selectAll" },
      { label: "Deselect", shortcut: "⌘D", action: "edit.deselect" },
    ],
  },
  {
    label: "Image",
    items: [
      { label: "Image Size…", shortcut: "⌥⌘I", action: "image.size" },
      { label: "Canvas Size…", shortcut: "⌥⌘C", action: "image.canvasSize" },
      { separator: true, label: "" },
      { label: "Rotate 90° CW", action: "image.rotate90cw" },
      { label: "Rotate 90° CCW", action: "image.rotate90ccw" },
      { label: "Flip Horizontal", action: "image.flipH" },
      { label: "Flip Vertical", action: "image.flipV" },
      { separator: true, label: "" },
      { label: "Adjustments", disabled: true },
      { label: "  Brightness/Contrast…", action: "image.brightness" },
      { label: "  Hue/Saturation…", action: "image.hue" },
      { label: "  Levels…", shortcut: "⌘L", action: "image.levels" },
      { label: "  Curves…", shortcut: "⌘M", action: "image.curves" },
    ],
  },
  {
    label: "Layer",
    items: [
      { label: "New Layer", shortcut: "⇧⌘N", action: "layer.new" },
      { label: "Duplicate Layer", action: "layer.duplicate" },
      { label: "Delete Layer", action: "layer.delete" },
      { separator: true, label: "" },
      { label: "Merge Down", shortcut: "⌘E", action: "layer.mergeDown" },
      { label: "Merge Visible", shortcut: "⇧⌘E", action: "layer.mergeVisible" },
      { label: "Flatten Image", action: "layer.flatten" },
      { separator: true, label: "" },
      { label: "Layer Visibility", action: "layer.visibility" },
      { label: "Rename Layer…", action: "layer.rename" },
    ],
  },
  {
    label: "Type",
    items: [
      { label: "Panels", disabled: true },
      { label: "Character", action: "type.character" },
      { label: "Paragraph", action: "type.paragraph" },
      { separator: true, label: "" },
      { label: "Rasterize Type Layer", action: "type.rasterize" },
      { label: "Convert to Paragraph Text", action: "type.toParagraph" },
    ],
  },
  {
    label: "Select",
    items: [
      { label: "All", shortcut: "⌘A", action: "select.all" },
      { label: "Deselect", shortcut: "⌘D", action: "select.deselect" },
      { label: "Reselect", shortcut: "⇧⌘D", action: "select.reselect" },
      { label: "Inverse", shortcut: "⇧⌘I", action: "select.inverse" },
      { separator: true, label: "" },
      { label: "Feather…", shortcut: "⇧F6", action: "select.feather" },
      { label: "Modify", disabled: true },
    ],
  },
  {
    label: "Filter",
    items: [
      { label: "Last Filter", shortcut: "⌘F", action: "filter.last" },
      { separator: true, label: "" },
      { label: "Blur", disabled: true },
      { label: "  Gaussian Blur…", action: "filter.gaussianBlur" },
      { label: "  Motion Blur…", action: "filter.motionBlur" },
      { separator: true, label: "" },
      { label: "Sharpen", disabled: true },
      { label: "  Sharpen", action: "filter.sharpen" },
      { label: "  Unsharp Mask…", action: "filter.unsharpMask" },
      { separator: true, label: "" },
      { label: "Noise", disabled: true },
      { label: "  Add Noise…", action: "filter.addNoise" },
      { separator: true, label: "" },
      { label: "Grayscale", action: "filter.grayscale" },
      { label: "Invert", shortcut: "⌘I", action: "filter.invert" },
    ],
  },
  {
    label: "View",
    items: [
      { label: "Zoom In", shortcut: "⌘+", action: "view.zoomIn" },
      { label: "Zoom Out", shortcut: "⌘-", action: "view.zoomOut" },
      { label: "Fit on Screen", shortcut: "⌘0", action: "view.fitScreen" },
      { label: "Actual Pixels", shortcut: "⌥⌘0", action: "view.actualPixels" },
      { separator: true, label: "" },
      { label: "Show Rulers", shortcut: "⌘R", action: "view.rulers" },
      { label: "Show Grid", shortcut: "⌘'", action: "view.grid" },
      { label: "Show Guides", shortcut: "⌘;", action: "view.guides" },
    ],
  },
  {
    label: "Window",
    items: [
      { label: "Workspace", disabled: true },
      { label: "  Essentials", action: "window.workspaceEssentials" },
      { separator: true, label: "" },
      { label: "Layers", shortcut: "F7", action: "window.layers" },
      { label: "Color", shortcut: "F6", action: "window.color" },
      { label: "Properties", action: "window.properties" },
      { label: "History", action: "window.history" },
    ],
  },
  {
    label: "Help",
    items: [
      { label: "Sense PhotoEdit Help", shortcut: "F1", action: "help.help" },
      {
        label: "Keyboard Shortcuts…",
        shortcut: "⌥⇧⌘K",
        action: "help.shortcuts",
      },
      { separator: true, label: "" },
      { label: "About Sense PhotoEdit", action: "help.about" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface MenuBarProps {
  onFilterOpen?: () => void;
  onExportOpen?: () => void;
}

export function MenuBar({ onFilterOpen, onExportOpen }: MenuBarProps) {
  const { undo, redo, canUndo, canRedo, state } = useEditor();

  /** Central handler for all menu actions */
  function handleAction(action: string) {
    switch (action) {
      case "edit.undo":
        undo();
        break;
      case "edit.redo":
        redo();
        break;
      case "file.exportPng":
      case "file.exportJpg":
      case "file.export":
        onExportOpen?.();
        break;
      case "filter.grayscale":
      case "filter.gaussianBlur":
      case "filter.motionBlur":
      case "filter.sharpen":
      case "filter.unsharpMask":
      case "filter.addNoise":
      case "filter.invert":
      case "filter.last":
        onFilterOpen?.();
        break;
      default:
        // Additional actions wired up in future waves
        break;
    }
  }

  return (
    <header
      data-ocid="menubar"
      className="flex h-8 items-center border-b select-none shrink-0"
      style={{
        backgroundColor: "var(--ps-menubar, #3c3c3c)",
        borderColor: "var(--ps-border, #1a1a1a)",
      }}
    >
      {/* App logo / title */}
      <div
        className="flex items-center px-3 h-full text-xs font-mono font-semibold text-foreground/70 shrink-0"
        style={{ minWidth: 120 }}
      >
        Sense PhotoEdit
      </div>

      {/* Divider */}
      <div
        className="w-px h-full"
        style={{ backgroundColor: "var(--ps-border, #1a1a1a)" }}
      />

      {/* Menu items */}
      <nav className="flex items-center h-full">
        {MENUS.map((menu) => (
          <DropdownMenu key={menu.label}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-ocid={`menubar.${menu.label.toLowerCase()}`}
                className="h-full px-3 text-xs text-foreground/80 hover:text-foreground hover:bg-white/10 transition-colors focus:outline-none focus-visible:bg-white/10"
              >
                {menu.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={0}
              className="min-w-52 rounded-none border-0 py-1"
              style={{
                backgroundColor: "var(--ps-panel, #3d3d3d)",
                borderColor: "var(--ps-border, #555)",
              }}
            >
              {menu.items.map((item, idx) => {
                if (item.separator) {
                  return (
                    <DropdownMenuSeparator
                      // biome-ignore lint/suspicious/noArrayIndexKey: static menu structure
                      key={`sep-${idx}`}
                      className="my-1"
                      style={{ backgroundColor: "var(--ps-border, #555)" }}
                    />
                  );
                }

                const isUndoItem = item.action === "edit.undo";
                const isRedoItem = item.action === "edit.redo";
                const isDisabled =
                  item.disabled ||
                  (isUndoItem && !canUndo) ||
                  (isRedoItem && !canRedo);

                return (
                  <DropdownMenuItem
                    key={`${menu.label}-${item.label}-${item.action ?? idx}`}
                    disabled={isDisabled}
                    onSelect={() => item.action && handleAction(item.action)}
                    className="text-xs rounded-none px-4 py-1 cursor-pointer focus:bg-primary focus:text-primary-foreground"
                    style={{
                      color: isDisabled ? "var(--ps-border, #555)" : undefined,
                    }}
                  >
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <DropdownMenuShortcut className="ml-auto pl-4 text-xs opacity-50">
                        {item.shortcut}
                      </DropdownMenuShortcut>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </nav>

      {/* Right side — project name + dirty indicator */}
      <div className="ml-auto flex items-center gap-2 px-4 text-xs text-foreground/40 font-mono">
        {state.isDirty && (
          <span className="text-primary/70" title="Unsaved changes">
            ●
          </span>
        )}
        <span className="truncate max-w-48">{state.project.name}</span>
      </div>
    </header>
  );
}
