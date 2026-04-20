/**
 * ImageUploadModal.tsx — Add an image to the canvas as a Fabric.js object.
 *
 * Flow:
 *   1. User picks a PNG/JPG/JPEG/GIF/WebP file (file input or drag-and-drop)
 *   2. FileReader reads the file as a Data URL
 *   3. A preview is shown with dimensions badge and file info
 *   4. User picks a placement mode: center / fill / original size
 *   5. "Add to Canvas" calls onImageAdd(dataUrl, placement) which wires
 *      directly to addImageToCanvas() in the editor context
 */

import { Button } from "@/components/ui/button";
import { ImageIcon, RefreshCw, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlacementMode = "center" | "fill" | "original";

interface ImageUploadModalProps {
  onClose: () => void;
  /** Called with the base64 Data URL + chosen placement mode */
  onImageAdd: (dataUrl: string, placement: PlacementMode) => void;
}

interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
  name: string;
  /** Human-readable file size, e.g. "1.2 MB" */
  sizeLabel: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Convert raw bytes to a readable "X KB" / "X MB" string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PLACEMENT_OPTIONS: { id: PlacementMode; label: string; desc: string }[] =
  [
    {
      id: "center",
      label: "Fit to Canvas",
      desc: "Scale to fit within 80% of canvas, centered",
    },
    {
      id: "fill",
      label: "Fill Canvas",
      desc: "Scale to cover the entire canvas",
    },
    {
      id: "original",
      label: "Original Size",
      desc: "Actual pixel dimensions, placed at canvas center",
    },
  ];

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageUploadModal({
  onClose,
  onImageAdd,
}: ImageUploadModalProps) {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [placement, setPlacement] = useState<PlacementMode>("center");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File processing ────────────────────────────────────────────────────────

  function processFile(file: File) {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported format. Please use PNG, JPG, JPEG, GIF, or WebP.");
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setError("Failed to read file.");
        setIsLoading(false);
        return;
      }

      // Create an Image to get natural dimensions
      const img = new Image();
      img.onload = () => {
        setImageInfo({
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          name: file.name,
          sizeLabel: formatBytes(file.size),
        });
        setIsLoading(false);
      };
      img.onerror = () => {
        setError("Could not decode the image. Please try another file.");
        setIsLoading(false);
      };
      img.src = dataUrl;
    };

    reader.onerror = () => {
      setError("File reading failed. Please try again.");
      setIsLoading(false);
    };

    reader.readAsDataURL(file);
  }

  // ── Drop zone handlers ─────────────────────────────────────────────────────

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  // ── Replace image ──────────────────────────────────────────────────────────

  function handleReplace() {
    setImageInfo(null);
    setError(null);
    // Small timeout so state clears before re-opening the file dialog
    setTimeout(() => fileInputRef.current?.click(), 0);
  }

  // ── Add to canvas ──────────────────────────────────────────────────────────

  function handleAdd() {
    if (!imageInfo) return;
    onImageAdd(imageInfo.dataUrl, placement);
    onClose();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-ocid="image_upload.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-sm shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--ps-panel, #3d3d3d)",
          border: "1px solid var(--ps-border, #555)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            backgroundColor: "var(--ps-panel-header, #4a4a4a)",
            borderBottom: "1px solid var(--ps-border, #555)",
          }}
        >
          <div className="flex items-center gap-2">
            <ImageIcon size={14} style={{ color: "var(--ps-accent)" }} />
            <span className="text-sm font-semibold text-foreground">
              Place Image
            </span>
          </div>
          <button
            type="button"
            data-ocid="image_upload.close_button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-sm hover:bg-white/10 transition-colors text-foreground/40 hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="px-4 py-4 space-y-4">
          {/* ── Drop zone / preview ─────────────────────────────────── */}
          {imageInfo ? (
            /* Image preview */
            <div className="space-y-2">
              <div
                className="relative rounded-sm overflow-hidden"
                style={{ height: 180 }}
              >
                <img
                  src={imageInfo.dataUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  style={{ backgroundColor: "var(--ps-canvas, #1a1a1a)" }}
                />

                {/* Replace button */}
                <button
                  type="button"
                  data-ocid="image_upload.replace_button"
                  onClick={handleReplace}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-medium transition-colors hover:bg-white/20"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.65)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  <RefreshCw size={10} />
                  Replace
                </button>

                {/* Dimensions badge */}
                <div
                  className="absolute bottom-2 left-2 px-2 py-0.5 rounded-sm text-xs font-mono"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.65)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {imageInfo.width} × {imageInfo.height} px
                </div>
              </div>

              {/* File name + size row */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span
                  className="truncate max-w-[70%]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  title={imageInfo.name}
                >
                  {imageInfo.name}
                </span>
                <span style={{ color: "rgba(255,255,255,0.35)" }}>
                  {imageInfo.sizeLabel}
                </span>
              </div>
            </div>
          ) : (
            /* Drop zone */
            <button
              type="button"
              data-ocid="image_upload.dropzone"
              className="w-full flex flex-col items-center justify-center gap-3 rounded-sm cursor-pointer transition-colors focus:outline-none"
              style={{
                height: 150,
                border: `2px dashed ${isDragging ? "var(--ps-accent, #00d4ff)" : "rgba(255,255,255,0.2)"}`,
                backgroundColor: isDragging
                  ? "rgba(0,212,255,0.06)"
                  : "var(--ps-canvas, #1a1a1a)",
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Click to browse or drop an image"
            >
              {isLoading ? (
                <div
                  className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    borderTopColor: "var(--ps-accent, #00d4ff)",
                  }}
                />
              ) : (
                <>
                  <Upload
                    size={26}
                    style={{
                      color: isDragging
                        ? "var(--ps-accent, #00d4ff)"
                        : "rgba(255,255,255,0.2)",
                    }}
                  />
                  <div className="text-center space-y-0.5">
                    <p
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      Drop image here or{" "}
                      <span style={{ color: "var(--ps-accent, #00d4ff)" }}>
                        browse
                      </span>
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    >
                      PNG · JPG · JPEG · GIF · WebP
                    </p>
                  </div>
                </>
              )}
            </button>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            data-ocid="image_upload.upload_button"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processFile(f);
              // Reset so the same file can be re-selected after Replace
              e.target.value = "";
            }}
          />

          {/* Error message */}
          {error && (
            <p
              data-ocid="image_upload.error_state"
              className="text-xs font-medium"
              style={{ color: "var(--ps-danger, #ff4d4f)" }}
            >
              ⚠ {error}
            </p>
          )}

          {/* ── Placement options ────────────────────────────────────── */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Placement
            </p>
            <div
              className="space-y-1"
              data-ocid="image_upload.placement_select"
            >
              {PLACEMENT_OPTIONS.map((opt) => {
                const isActive = placement === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-ocid={`image_upload.placement.${opt.id}`}
                    onClick={() => setPlacement(opt.id)}
                    className="w-full flex items-start gap-3 px-3 py-2 rounded-sm text-left transition-colors focus:outline-none"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(0,212,255,0.1)"
                        : "rgba(0,0,0,0.25)",
                      border: `1px solid ${isActive ? "var(--ps-accent, #00d4ff)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {/* Radio dot */}
                    <span
                      className="mt-0.5 w-3 h-3 rounded-full border shrink-0 flex items-center justify-center"
                      style={{
                        borderColor: isActive
                          ? "var(--ps-accent, #00d4ff)"
                          : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {isActive && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: "var(--ps-accent, #00d4ff)",
                          }}
                        />
                      )}
                    </span>
                    <span>
                      <span
                        className="text-xs font-medium block"
                        style={{
                          color: isActive
                            ? "var(--ps-accent, #00d4ff)"
                            : "rgba(255,255,255,0.75)",
                        }}
                      >
                        {opt.label}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {opt.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--ps-border, #555)" }}
        >
          <Button
            data-ocid="image_upload.cancel_button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 text-xs"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Cancel
          </Button>
          <Button
            data-ocid="image_upload.submit_button"
            size="sm"
            onClick={handleAdd}
            disabled={!imageInfo}
            className="h-7 text-xs font-semibold rounded-sm px-4 disabled:opacity-40"
            style={
              imageInfo
                ? {
                    backgroundColor: "var(--ps-accent, #00d4ff)",
                    color: "#000",
                  }
                : {}
            }
          >
            <ImageIcon size={12} className="mr-1.5" />
            Add to Canvas
          </Button>
        </div>
      </div>
    </div>
  );
}
