import { Loader2, Upload, Video, ImageIcon, X, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { storyApi } from "@/lib/api/storyApi";
import type { StoryFeedItem } from "@/lib/types";

interface StoryUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
  myStoryGroup?: StoryFeedItem;
  onViewExisting?: () => void;
}

export function StoryUploadModal({
  open,
  onClose,
  onUploaded,
  myStoryGroup,
  onViewExisting,
}: StoryUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setCaption("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  const isVideo = file?.type.startsWith("video/") ?? false;

  const handleSubmit = async () => {
    if (!file) {
      setError("Choose an image or video first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await storyApi.uploadStory(file, caption.trim());
      await onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload story.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl mx-4 overflow-hidden rounded-2xl border border-border bg-card shadow-elegant"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">My Story</h2>
            <p className="text-xs text-muted-foreground">Share a photo or video that disappears in 24 hours.</p>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {myStoryGroup && myStoryGroup.stories.length > 0 && onViewExisting && (
            <button
              onClick={onViewExisting}
              className="flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/8 px-3 py-2.5 text-left transition hover:bg-primary/12"
            >
              <div>
                <div className="text-sm font-medium">View current stories</div>
                <div className="text-xs text-muted-foreground">
                  {myStoryGroup.stories.length} active {myStoryGroup.stories.length === 1 ? "story" : "stories"}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Eye className="size-3.5" /> Open
              </span>
            </button>
          )}

          <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-sidebar/60 p-4 text-center hover:border-primary/40 hover:bg-sidebar">
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setError("");
              }}
            />

            {file && previewUrl ? (
              <div className="w-full space-y-3">
                <div className="overflow-hidden rounded-2xl border border-border bg-black/50">
                  {isVideo ? (
                    <video src={previewUrl} controls className="max-h-80 w-full bg-black object-contain" />
                  ) : (
                    <img src={previewUrl} alt="Story preview" className="max-h-80 w-full object-contain" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isVideo ? <Video className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                  <span className="truncate">{file.name}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="size-6" />
                </div>
                <div className="text-sm font-medium">Choose image or video</div>
                <div className="mt-1 text-xs text-muted-foreground">JPG, PNG, GIF, MP4 and other browser-supported media.</div>
              </>
            )}
          </label>

          <div className="space-y-2">
            <label htmlFor="story-caption" className="text-xs font-medium text-muted-foreground">
              Caption
            </label>
            <textarea
              id="story-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Say something about this moment"
              rows={3}
              className="w-full resize-none rounded-xl bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

          <button
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {loading ? "Uploading..." : "Upload Story"}
          </button>
        </div>
      </div>
    </div>
  );
}
