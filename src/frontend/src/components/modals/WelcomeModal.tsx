/**
 * WelcomeModal.tsx — Photoshop-style startup welcome screen.
 *
 * Shows on first load with two tabs:
 *   - "New Document" — form to create a canvas with custom dimensions
 *   - "Open Project"  — recent projects list from the backend
 *
 * Dismissed by clicking X, "Skip for now", or creating/opening a project.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Clock, FileImage, FolderOpen, Plus, X } from "lucide-react";
import { useState } from "react";
import { useEditor } from "../../hooks/useEditor";
import { useCreateProject, useListProjects } from "../../hooks/useProjects";
import type { Layer } from "../../types/editor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WelcomeModalProps {
  onClose: () => void;
}

interface NewDocForm {
  name: string;
  width: string;
  height: string;
  backgroundColor: string;
  resolution: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a BigInt nanosecond timestamp into a human-readable date */
function formatDate(ns: bigint | undefined): string {
  if (!ns) return "—";
  const ms = Number(ns / BigInt(1_000_000));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

/** Photoshop-style preset canvas sizes */
const PRESETS = [
  { label: "1920 × 1080", width: 1920, height: 1080 },
  { label: "1280 × 720", width: 1280, height: 720 },
  { label: "800 × 600", width: 800, height: 600 },
  { label: "A4 Print", width: 2480, height: 3508 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Tab button styled like Photoshop's panel tabs */
function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      style={{
        color: active ? "var(--ps-accent, #2db8ff)" : "rgba(255,255,255,0.5)",
        borderBottom: active
          ? "2px solid var(--ps-accent, #2db8ff)"
          : "2px solid transparent",
        background: "none",
      }}
    >
      {children}
    </button>
  );
}

// ─── New Document Form ────────────────────────────────────────────────────────

function NewDocumentTab({ onCreated }: { onCreated: () => void }) {
  const { setProject } = useEditor();
  const [form, setForm] = useState<NewDocForm>({
    name: "Untitled",
    width: "1920",
    height: "1080",
    backgroundColor: "#ffffff",
    resolution: "72",
  });

  function applyPreset(w: number, h: number) {
    setForm((f) => ({ ...f, width: String(w), height: String(h) }));
  }

  function handleCreate() {
    const w = Math.max(1, Math.min(16000, Number.parseInt(form.width) || 1920));
    const h = Math.max(
      1,
      Math.min(16000, Number.parseInt(form.height) || 1080),
    );

    // Build the initial background layer
    const bgLayer: Layer = {
      id: Date.now(),
      name: "Background",
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: "normal",
      fabricJson: "{}",
    };

    setProject({
      id: null,
      name: form.name.trim() || "Untitled",
      width: w,
      height: h,
      layers: [bgLayer],
      canvasJson: "{}",
      imageRefs: [],
    });
    onCreated();
  }

  return (
    <div className="flex gap-5" data-ocid="welcome.new_doc.panel">
      {/* Preset list */}
      <div className="w-36 shrink-0 space-y-1">
        <p className="ps-label mb-2">Presets</p>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.width, p.height)}
            className="w-full text-left px-2 py-1.5 text-xs rounded-sm transition-colors hover:bg-white/10 text-foreground/70 hover:text-foreground"
            style={{
              background:
                form.width === String(p.width) &&
                form.height === String(p.height)
                  ? "var(--ps-active, rgba(45,184,255,0.2))"
                  : undefined,
              color:
                form.width === String(p.width) &&
                form.height === String(p.height)
                  ? "var(--ps-accent)"
                  : undefined,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="flex-1 space-y-3">
        {/* Name */}
        <div>
          <Label className="ps-label mb-1 block">Document Name</Label>
          <Input
            data-ocid="welcome.new_doc.name_input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="h-7 text-xs rounded-sm"
            style={{
              backgroundColor: "var(--ps-bg)",
              border: "1px solid var(--ps-border)",
              color: "white",
            }}
          />
        </div>

        {/* Width + Height */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="ps-label mb-1 block">Width (px)</Label>
            <Input
              data-ocid="welcome.new_doc.width_input"
              type="number"
              min={1}
              max={16000}
              value={form.width}
              onChange={(e) =>
                setForm((f) => ({ ...f, width: e.target.value }))
              }
              className="h-7 text-xs rounded-sm"
              style={{
                backgroundColor: "var(--ps-bg)",
                border: "1px solid var(--ps-border)",
                color: "white",
              }}
            />
          </div>
          <div>
            <Label className="ps-label mb-1 block">Height (px)</Label>
            <Input
              data-ocid="welcome.new_doc.height_input"
              type="number"
              min={1}
              max={16000}
              value={form.height}
              onChange={(e) =>
                setForm((f) => ({ ...f, height: e.target.value }))
              }
              className="h-7 text-xs rounded-sm"
              style={{
                backgroundColor: "var(--ps-bg)",
                border: "1px solid var(--ps-border)",
                color: "white",
              }}
            />
          </div>
        </div>

        {/* Background Color + Resolution */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="ps-label mb-1 block">Background</Label>
            <div className="flex items-center gap-2 h-7">
              <input
                data-ocid="welcome.new_doc.bg_color"
                type="color"
                value={form.backgroundColor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, backgroundColor: e.target.value }))
                }
                className="w-7 h-7 rounded-sm cursor-pointer border-0 p-0"
                style={{ backgroundColor: form.backgroundColor }}
              />
              <span className="text-xs font-mono text-foreground/60">
                {form.backgroundColor}
              </span>
            </div>
          </div>
          <div>
            <Label className="ps-label mb-1 block">Resolution (PPI)</Label>
            <Input
              data-ocid="welcome.new_doc.resolution_input"
              type="number"
              min={1}
              max={600}
              value={form.resolution}
              onChange={(e) =>
                setForm((f) => ({ ...f, resolution: e.target.value }))
              }
              className="h-7 text-xs rounded-sm"
              style={{
                backgroundColor: "var(--ps-bg)",
                border: "1px solid var(--ps-border)",
                color: "white",
              }}
            />
          </div>
        </div>

        {/* Create button */}
        <Button
          data-ocid="welcome.new_doc.create_button"
          onClick={handleCreate}
          size="sm"
          className="w-full h-8 text-xs font-semibold mt-1 rounded-sm"
          style={{
            backgroundColor: "var(--ps-accent, #2db8ff)",
            color: "#000",
          }}
        >
          <Plus size={13} className="mr-1.5" />
          Create Document
        </Button>
      </div>
    </div>
  );
}

// ─── Open Project Tab ─────────────────────────────────────────────────────────

function OpenProjectTab({ onOpened }: { onOpened: () => void }) {
  const { setProject } = useEditor();
  const { data: projects, isLoading } = useListProjects();

  function handleOpen(projectId: bigint) {
    // The full project loads lazily once we set the ID in editor state
    setProject({
      id: projectId,
      name: "",
      width: 1920,
      height: 1080,
      layers: [],
      canvasJson: "{}",
      imageRefs: [],
    });
    onOpened();
  }

  if (isLoading) {
    return (
      <div className="space-y-2" data-ocid="welcome.open.loading_state">
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            className="h-12 w-full rounded-sm"
            style={{ backgroundColor: "var(--ps-bg)" }}
          />
        ))}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div
        data-ocid="welcome.open.empty_state"
        className="flex flex-col items-center justify-center py-10 gap-2"
      >
        <FileImage size={32} className="text-foreground/20" />
        <p className="text-sm text-foreground/40">No saved projects yet</p>
        <p className="text-xs text-foreground/25">
          Create a new document to get started
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-1 max-h-56 overflow-y-auto pr-1"
      data-ocid="welcome.open.list"
    >
      {projects.map((project, idx) => (
        <button
          key={project.id.toString()}
          type="button"
          data-ocid={`welcome.open.item.${idx + 1}`}
          onClick={() => handleOpen(project.id)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          style={{ border: "1px solid var(--ps-border, #555)" }}
        >
          {/* Icon */}
          <div
            className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--ps-canvas)" }}
          >
            <FileImage size={14} className="text-foreground/40" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {project.name}
            </p>
            <p className="text-xs text-foreground/40 font-mono">
              {project.width} × {project.height} px
            </p>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1 text-xs text-foreground/30 shrink-0">
            <Clock size={10} />
            <span>{formatDate(project.updatedAt)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── WelcomeModal ─────────────────────────────────────────────────────────────

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const [tab, setTab] = useState<"new" | "open">("new");

  // Get principal display if authenticated
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}…${principal.slice(-3)}`
    : null;

  return (
    /* Full-screen overlay */
    <div
      data-ocid="welcome.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      // Click outside to dismiss
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-2xl mx-4 rounded-sm shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--ps-panel, #3d3d3d)",
          border: "1px solid var(--ps-border, #555)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start justify-between px-6 py-5"
          style={{
            backgroundColor: "var(--ps-panel-header, #4a4a4a)",
            borderBottom: "1px solid var(--ps-border, #555)",
          }}
        >
          <div>
            {/* Branding */}
            <div className="flex items-center gap-2 mb-0.5">
              <FileImage size={18} style={{ color: "var(--ps-accent)" }} />
              <h2
                className="text-base font-mono font-semibold"
                style={{ color: "var(--ps-accent)" }}
              >
                Sense PhotoEdit
              </h2>
            </div>
            <p className="text-xs text-foreground/40">
              Professional photo editing in your browser
              {shortPrincipal && (
                <span className="ml-2 font-mono text-foreground/25">
                  — {shortPrincipal}
                </span>
              )}
            </p>
          </div>

          {/* Close */}
          <button
            type="button"
            data-ocid="welcome.close_button"
            onClick={onClose}
            className="p-1 rounded-sm hover:bg-white/10 transition-colors text-foreground/40 hover:text-foreground"
            aria-label="Close welcome screen"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div
          className="flex gap-0 px-6"
          style={{ borderBottom: "1px solid var(--ps-border, #555)" }}
        >
          <Tab active={tab === "new"} onClick={() => setTab("new")}>
            <Plus size={13} className="inline mr-1.5" />
            New Document
          </Tab>
          <Tab active={tab === "open"} onClick={() => setTab("open")}>
            <FolderOpen size={13} className="inline mr-1.5" />
            Open Project
          </Tab>
        </div>

        {/* ── Body ── */}
        <div className="p-6">
          {tab === "new" ? (
            <NewDocumentTab onCreated={onClose} />
          ) : (
            <OpenProjectTab onOpened={onClose} />
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ borderTop: "1px solid var(--ps-border, #555)" }}
        >
          <p className="text-xs text-foreground/25">
            ©{new Date().getFullYear()} Sense PhotoEdit
          </p>
          <Button
            data-ocid="welcome.skip_button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-foreground/40 hover:text-foreground h-7"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
