import { ChevronLeft, ChevronRight, Eye, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchStoryMediaByIdObjectUrl, storyApi } from "@/lib/api/storyApi";
import { cn } from "@/lib/utils";
import type { StoryFeedItem, StoryViewerEntry } from "@/lib/types";

const IMAGE_STORY_DURATION_MS = 5000;
const VIDEO_STORY_FALLBACK_MS = 10000;

interface StoryViewerProps {
  open: boolean;
  groups: StoryFeedItem[];
  initialGroupIndex: number;
  initialStoryIndex?: number;
  currentUserId: string;
  onClose: () => void;
  onStoriesChanged: () => Promise<void> | void;
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StoryViewersModal({
  open,
  loading,
  viewers,
  error,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  viewers: StoryViewerEntry[];
  error: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 overflow-hidden rounded-2xl border border-border bg-card shadow-elegant"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Story viewers</h3>
            <p className="text-xs text-muted-foreground">People who have seen this story.</p>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[26rem] overflow-y-auto p-3">
          {loading ? (
            <div className="grid min-h-40 place-items-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          ) : viewers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No viewers yet.</div>
          ) : (
            <div className="space-y-1.5">
              {viewers.map((viewer) => (
                <div key={viewer.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-accent/70">
                  {viewer.avatarUrl ? (
                    <img src={viewer.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                  ) : (
                    <div className="grid size-10 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                      {(viewer.displayName ?? viewer.username ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{viewer.displayName ?? viewer.username}</div>
                    <div className="truncate text-xs text-muted-foreground">@{viewer.username}</div>
                  </div>
                  <div className="shrink-0 text-[11px] text-muted-foreground">{formatTimestamp(viewer.viewedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StoryViewer({
  open,
  groups,
  initialGroupIndex,
  initialStoryIndex = 0,
  currentUserId,
  onClose,
  onStoriesChanged,
}: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [videoDurationMs, setVideoDurationMs] = useState(VIDEO_STORY_FALLBACK_MS);
  const [deleting, setDeleting] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersError, setViewersError] = useState("");
  const [viewers, setViewers] = useState<StoryViewerEntry[]>([]);
  const [mediaObjectUrl, setMediaObjectUrl] = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const viewedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    setGroupIndex(initialGroupIndex);
    setStoryIndex(initialStoryIndex);
    setProgress(0);
    setVideoDurationMs(VIDEO_STORY_FALLBACK_MS);
    setViewersOpen(false);
    setViewers([]);
    setViewersError("");
    setViewersLoading(false);
    setMediaObjectUrl("");
    setMediaLoading(false);
    setMediaError("");
    viewedIdsRef.current = new Set();
  }, [open, initialGroupIndex, initialStoryIndex]);

  const activeGroup = groups[groupIndex];
  const activeStory = activeGroup?.stories[storyIndex];

  const isOwner = activeStory ? String(activeStory.userId) === currentUserId : false;
  const totalDurationMs = activeStory?.type === "VIDEO" ? videoDurationMs : IMAGE_STORY_DURATION_MS;

  const goToNext = () => {
    if (!activeGroup) return;
    if (storyIndex < activeGroup.stories.length - 1) {
      setStoryIndex((current) => current + 1);
      setProgress(0);
      setVideoDurationMs(VIDEO_STORY_FALLBACK_MS);
      return;
    }

    if (groupIndex < groups.length - 1) {
      setGroupIndex((current) => current + 1);
      setStoryIndex(0);
      setProgress(0);
      setVideoDurationMs(VIDEO_STORY_FALLBACK_MS);
      return;
    }

    onClose();
  };

  const goToPrevious = () => {
    if (storyIndex > 0) {
      setStoryIndex((current) => current - 1);
      setProgress(0);
      setVideoDurationMs(VIDEO_STORY_FALLBACK_MS);
      return;
    }

    if (groupIndex > 0) {
      const previousGroupIndex = groupIndex - 1;
      const previousGroup = groups[previousGroupIndex];
      setGroupIndex(previousGroupIndex);
      setStoryIndex(Math.max(previousGroup.stories.length - 1, 0));
      setProgress(0);
      setVideoDurationMs(VIDEO_STORY_FALLBACK_MS);
    }
  };

  useEffect(() => {
    if (!open || !activeStory) return;
    if (isOwner || viewedIdsRef.current.has(activeStory.id)) return;

    viewedIdsRef.current.add(activeStory.id);
    void storyApi.viewStory(activeStory.id).catch(() => {
      viewedIdsRef.current.delete(activeStory.id);
    });
  }, [open, activeStory, isOwner]);

  useEffect(() => {
    if (!open || !activeStory) return;
    setProgress(0);

    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const nextProgress = Math.min((now - startedAt) / totalDurationMs, 1);
      setProgress(nextProgress);
      if (nextProgress >= 1) {
        goToNext();
        return;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [open, activeStory?.id, totalDurationMs]);

  useEffect(() => {
    if (!open || !activeStory) return;

    let alive = true;
    let objectUrl = "";
    setMediaLoading(true);
    setMediaError("");
    setMediaObjectUrl("");

    void fetchStoryMediaByIdObjectUrl(activeStory.id)
      .then((nextUrl) => {
        if (!alive) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        objectUrl = nextUrl;
        setMediaObjectUrl(nextUrl);
      })
      .catch((err) => {
        if (!alive) return;
        setMediaError(err instanceof Error ? err.message : "Failed to load story media.");
      })
      .finally(() => {
        if (alive) setMediaLoading(false);
      });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, activeStory?.id]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goToNext();
      if (event.key === "ArrowLeft") goToPrevious();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, groupIndex, storyIndex, groups]);

  const handleDelete = async () => {
    if (!activeStory || !isOwner || deleting) return;

    setDeleting(true);
    try {
      await storyApi.deleteStory(activeStory.id);
      await onStoriesChanged();
      onClose();
    } catch {
      // Keep the viewer open; the next refresh or retry can recover.
    } finally {
      setDeleting(false);
    }
  };

  const openViewers = async () => {
    if (!activeStory || !isOwner) return;
    setViewersOpen(true);
    setViewersLoading(true);
    setViewersError("");

    try {
      const response = await storyApi.getViewers(activeStory.id);
      setViewers(response);
    } catch (err) {
      setViewersError(err instanceof Error ? err.message : "Failed to load viewers.");
    } finally {
      setViewersLoading(false);
    }
  };

  if (!open || !activeGroup || !activeStory) return null;

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/95 text-white">
        <div className="absolute inset-x-0 top-0 z-10 p-4">
          <div className="mb-3 flex gap-1.5">
            {activeGroup.stories.map((story, index) => (
              <div key={story.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className={cn(
                    "h-full rounded-full bg-white transition-[width]",
                    index === storyIndex ? "duration-100" : "duration-300",
                  )}
                  style={{
                    width:
                      index < storyIndex ? "100%" :
                      index === storyIndex ? `${Math.max(progress * 100, 3)}%` :
                      "0%",
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {activeGroup.avatarUrl ? (
              <img src={activeGroup.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
            ) : (
              <div className="grid size-10 place-items-center rounded-full bg-white/15 text-sm font-semibold">
                {activeGroup.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{activeGroup.username}</div>
              <div className="text-xs text-white/70">{formatTimestamp(activeStory.createdAt)}</div>
            </div>
            <button onClick={onClose} className="ml-auto grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <button
          onClick={goToPrevious}
          className="absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <ChevronRight className="size-5" />
        </button>

        <div className="flex h-full items-center justify-center px-4 pb-24 pt-24 md:px-16">
          <div className="relative flex h-full w-full max-w-md items-center justify-center overflow-hidden rounded-[2rem] bg-black md:max-w-lg">
            {mediaLoading ? (
              <div className="grid h-full w-full place-items-center text-white/75">
                <Loader2 className="size-7 animate-spin" />
              </div>
            ) : mediaError ? (
              <div className="mx-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-white">
                {mediaError}
              </div>
            ) : activeStory.type === "VIDEO" ? (
              <video
                key={activeStory.id}
                src={mediaObjectUrl}
                autoPlay
                playsInline
                controls={false}
                className="h-full w-full object-contain"
                onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration;
                  if (Number.isFinite(duration) && duration > 0) {
                    setVideoDurationMs(duration * 1000);
                  }
                }}
                onEnded={goToNext}
              />
            ) : (
              <img src={mediaObjectUrl} alt={activeStory.caption ?? "Story"} className="h-full w-full object-contain" />
            )}
          </div>
        </div>

        {(activeStory.caption || isOwner) && (
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-5 pt-14">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              {activeStory.caption && <p className="max-w-2xl text-sm text-white/90">{activeStory.caption}</p>}

              {isOwner && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void openViewers()}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20"
                  >
                    <Eye className="size-3.5" />
                    View viewers
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{activeStory.viewerCount}</span>
                  </button>
                  <button
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-full bg-destructive/80 px-3 py-2 text-xs font-medium text-white hover:bg-destructive disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Delete story
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <StoryViewersModal
        open={viewersOpen}
        loading={viewersLoading}
        viewers={viewers}
        error={viewersError}
        onClose={() => setViewersOpen(false)}
      />
    </>
  );
}
