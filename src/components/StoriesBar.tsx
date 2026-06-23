import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryFeedItem } from "@/lib/types";

interface StoriesBarProps {
  stories: StoryFeedItem[];
  currentUserId: string;
  loading: boolean;
  onOpenMyStory: () => void;
  onOpenViewer: (group: StoryFeedItem) => void;
  onOpenMyViewer?: () => void;
}

function StoryAvatar({
  imageUrl,
  label,
  unseen,
}: {
  imageUrl: string | null;
  label: string;
  unseen: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-full p-[2px] transition",
        unseen
          ? "bg-[linear-gradient(135deg,#38bdf8,#0ea5e9)] shadow-[0_0_0_1px_rgba(56,189,248,0.18)]"
          : "bg-slate-600/70",
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="size-14 rounded-full border-2 border-sidebar object-cover" />
      ) : (
        <div className="grid size-14 place-items-center rounded-full border-2 border-sidebar bg-primary/15 text-sm font-semibold text-primary">
          {label.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export function StoriesBar({
  stories,
  currentUserId,
  loading,
  onOpenMyStory,
  onOpenViewer,
  onOpenMyViewer,
}: StoriesBarProps) {
  const myGroup = stories.find((group) => String(group.userId) === currentUserId);
  const otherGroups = stories.filter((group) => String(group.userId) !== currentUserId);

  return (
    <div className="border-b border-border px-2.5 py-3">
      <div className="flex items-start gap-3 overflow-x-auto scrollbar-thin pb-1">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button onClick={onOpenMyStory} className="group relative">
            <StoryAvatar
              imageUrl={myGroup?.avatarUrl ?? null}
              label={myGroup?.username || "Me"}
              unseen={Boolean(myGroup?.hasUnseenStories)}
            />
            <span className="absolute bottom-0 right-0 grid size-5 place-items-center rounded-full border-2 border-sidebar bg-primary text-primary-foreground shadow">
              <Plus className="size-3" />
            </span>
          </button>
          {myGroup && myGroup.stories.length > 0 && onOpenMyViewer && (
            <button onClick={onOpenMyViewer} className="text-[10px] text-primary hover:underline">
              View
            </button>
          )}
          <span className="max-w-16 truncate text-[11px] text-muted-foreground">My Story</span>
        </div>

        {loading ? (
          <div className="flex min-h-[72px] items-center px-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          otherGroups.map((group, index) => (
            <button
              key={`${group.userId}-${group.stories[0]?.id ?? index}`}
              onClick={() => onOpenViewer(group)}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <StoryAvatar imageUrl={group.avatarUrl} label={group.username} unseen={group.hasUnseenStories} />
              <span className="max-w-16 truncate text-[11px] text-muted-foreground">{group.username}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
