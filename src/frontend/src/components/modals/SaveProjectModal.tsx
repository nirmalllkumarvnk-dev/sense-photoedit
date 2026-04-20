/**
 * SaveProjectModal.tsx — Save or create a project in the backend.
 *
 * - If the project has an existing ID  → calls saveProject (update)
 * - If the project is new (id = null)  → calls createProject (insert)
 *
 * Shows current canvas dimensions, a project name input, and feedback states.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "../../hooks/useEditor";
import {
  layersToBackend,
  useCreateProject,
  useSaveProject,
} from "../../hooks/useProjects";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SaveProjectModalProps {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SaveProjectModal({ onClose }: SaveProjectModalProps) {
  const { state, setProject, markClean } = useEditor();
  const { project } = state;

  const [projectName, setProjectName] = useState(project.name || "Untitled");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const createProject = useCreateProject();
  const saveProject = useSaveProject();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input on open
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // ── Save handler ───────────────────────────────────────────────────────────
  async function handleSave() {
    const trimmedName = projectName.trim() || "Untitled";
    setStatus("saving");
    setErrorMessage("");

    try {
      if (project.id === null) {
        // ── New project — create in backend ──────────────────────────────
        const newId = await createProject.mutateAsync({
          name: trimmedName,
          width: BigInt(project.width),
          height: BigInt(project.height),
          canvasJson: project.canvasJson,
          layers: layersToBackend(project.layers),
          imageRefs: project.imageRefs,
        });

        // Update editor state with the assigned ID
        setProject({ ...project, id: newId, name: trimmedName });
      } else {
        // ── Existing project — update ─────────────────────────────────────
        await saveProject.mutateAsync({
          id: project.id,
          name: trimmedName,
          width: BigInt(project.width),
          height: BigInt(project.height),
          canvasJson: project.canvasJson,
          layers: layersToBackend(project.layers),
          imageRefs: project.imageRefs,
        });

        setProject({ ...project, name: trimmedName });
      }

      markClean();
      setStatus("success");

      // Auto-close after brief success flash
      setTimeout(onClose, 1200);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Save failed — please try again.",
      );
    }
  }

  // ── Enter key submits ──────────────────────────────────────────────────────
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      data-ocid="save_project.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-sm shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--ps-panel, #3d3d3d)",
          border: "1px solid var(--ps-border, #555)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            backgroundColor: "var(--ps-panel-header, #4a4a4a)",
            borderBottom: "1px solid var(--ps-border, #555)",
          }}
        >
          <div className="flex items-center gap-2">
            <Save size={14} style={{ color: "var(--ps-accent)" }} />
            <span className="text-sm font-semibold text-foreground">
              Save Project
            </span>
          </div>
          <button
            type="button"
            data-ocid="save_project.close_button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-sm hover:bg-white/10 transition-colors text-foreground/40 hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-4 py-4 space-y-4">
          {/* Project name */}
          <div>
            <Label className="ps-label mb-1.5 block">Project Name</Label>
            <Input
              ref={inputRef}
              data-ocid="save_project.name_input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Untitled"
              className="h-8 text-sm rounded-sm"
              style={{
                backgroundColor: "var(--ps-bg)",
                border: "1px solid var(--ps-border)",
                color: "white",
              }}
            />
          </div>

          {/* Canvas dimensions (read-only info) */}
          <div
            className="px-3 py-2 rounded-sm"
            style={{
              backgroundColor: "var(--ps-canvas, #1a1a1a)",
              border: "1px solid var(--ps-border, #555)",
            }}
          >
            <p className="ps-label mb-1">Canvas Info</p>
            <p className="text-xs font-mono text-foreground/50">
              {project.width} × {project.height} px
              {" · "}
              {project.layers.length} layer
              {project.layers.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Error feedback */}
          {status === "error" && (
            <p
              data-ocid="save_project.error_state"
              className="text-xs text-destructive font-medium"
            >
              {errorMessage}
            </p>
          )}

          {/* Success feedback */}
          {status === "success" && (
            <div
              data-ocid="save_project.success_state"
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "var(--ps-accent)" }}
            >
              <CheckCircle size={13} />
              <span>Project saved successfully!</span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--ps-border, #555)" }}
        >
          <Button
            data-ocid="save_project.cancel_button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 text-xs text-foreground/50 hover:text-foreground"
            disabled={status === "saving"}
          >
            Cancel
          </Button>
          <Button
            data-ocid="save_project.submit_button"
            size="sm"
            onClick={handleSave}
            disabled={status === "saving" || status === "success"}
            className="h-7 text-xs font-semibold rounded-sm px-4"
            style={{
              backgroundColor: "var(--ps-accent, #2db8ff)",
              color: "#000",
            }}
          >
            {status === "saving" ? (
              <>
                <Loader2 size={12} className="mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={12} className="mr-1.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
