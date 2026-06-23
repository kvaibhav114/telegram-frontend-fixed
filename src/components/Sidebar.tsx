import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Search, Bell, Settings, Edit, Loader2, Users, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { storyApi } from "@/lib/api/storyApi";
import type { StoryFeedItem, User } from "@/lib/types";
import { CreateGroupModal } from "./CreateGroupModal";
import { StoriesBar } from "./StoriesBar";
import { StoryUploadModal } from "./StoryUploadModal";
import { StoryViewer } from "./StoryViewer";

export function Sidebar() {
  const { user, chats, searchUsers, openChatWithUser, unreadNotifCount } = useApp();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<User[]>([]);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [stories, setStories] = useState<StoryFeedItem[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState("");
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [viewerState, setViewerState] = useState<{ groupIndex: number; storyIndex: number } | null>(null);
  const params = useParams({ strict: false }) as { id?: string };
  const navigate = useNavigate();

  const visibleChats = useMemo(
    () => chats.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())),
    [chats, q],
  );
  const myStoryGroup = useMemo(
    () => stories.find((group) => String(group.userId) === user.id),
    [stories, user.id],
  );

  const loadStories = async () => {
    if (!user.id || user.id === "0") return;
    setStoriesLoading(true);
    try {
      const feed = await storyApi.getFeed();
      setStories(feed);
      setStoriesError("");
    } catch (err) {
      setStoriesError(err instanceof Error ? err.message : "Failed to load stories.");
    } finally {
      setStoriesLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const handle = setTimeout(async () => {
      if (!q.trim()) { setResults([]); setSearching(false); return; }
      setSearching(true);
      try { const res = await searchUsers(q); if (active) setResults(res); }
      finally { if (active) setSearching(false); }
    }, 300);
    return () => { active = false; clearTimeout(handle); };
  }, [q, searchUsers]);

  useEffect(() => {
    void loadStories();
  }, [user.id]);

  const openResult = async (peer: User) => {
    try {
      const chat = await openChatWithUser(peer);
      setQ("");
      navigate({ to: "/chat/$id", params: { id: chat.id } });
    } catch (err) {
      console.error("Failed to open private chat", err);
    }
  };

  const openStoryViewer = (group: StoryFeedItem) => {
    const groupIndex = stories.findIndex((item) => item.userId === group.userId);
    if (groupIndex >= 0) {
      const firstUnseenIndex = group.stories.findIndex((story) => !story.viewed);
      setViewerState({ groupIndex, storyIndex: firstUnseenIndex >= 0 ? firstUnseenIndex : 0 });
    }
  };

  return (
    <aside className="flex h-full w-full md:w-80 shrink-0 flex-col bg-sidebar border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Link to="/chat" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary grid place-items-center">
            <svg viewBox="0 0 24 24" className="size-4 text-primary-foreground" fill="currentColor">
              <path d="M9.78 17.5l.36-3.95L18.4 6.8c.32-.29-.07-.43-.5-.17l-10.4 6.56-4.49-1.42c-.97-.3-.98-.97.21-1.44L20.6 3.86c.81-.34 1.58.2 1.27 1.43l-3.06 14.4c-.21 1-.81 1.24-1.64.77l-4.53-3.34-2.18 2.12c-.25.25-.46.46-.95.46z" />
            </svg>
          </div>
          <span className="font-semibold text-sm">Telegrok</span>
        </Link>
        <div className="ml-auto flex items-center gap-0.5">
          <Link to="/notifications" className="size-8 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground relative">
            <Bell className="size-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 text-[9px] font-bold bg-destructive text-white rounded-full grid place-items-center">
                {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
              </span>
            )}
          </Link>
          <Link to="/profile" className="size-8 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground">
            <Settings className="size-4" />
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        {q.trim() && (
          <div className="mt-2 rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-3 py-1.5 flex items-center justify-between text-xs text-muted-foreground border-b border-border">
              <span>People</span>
              {searching && <Loader2 className="size-3 animate-spin" />}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {results.length > 0 ? results.map((u) => (
                <button key={u.id} onClick={() => void openResult(u)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent text-left">
                  <img src={u.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{u.displayName}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </div>
                  {u.isOnline && <span className="size-2 rounded-full bg-(--color-online)" />}
                </button>
              )) : (
                <div className="px-3 py-3 text-xs text-muted-foreground">{searching ? "Searching…" : "No users found"}</div>
              )}
            </div>
          </div>
        )}
      </div>

      <StoriesBar
        stories={stories}
        currentUserId={user.id}
        loading={storiesLoading}
        onOpenMyStory={() => setShowStoryUpload(true)}
        onOpenMyViewer={() => {
          if (myStoryGroup) openStoryViewer(myStoryGroup);
        }}
        onOpenViewer={openStoryViewer}
      />
      {storiesError && (
        <div className="mx-2.5 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="size-3.5" />
            <span>{storiesError}</span>
          </div>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1.5 pb-2 space-y-px">
        {visibleChats.map((c) => {
          const active = params.id === c.id;
          return (
            <Link key={c.id} to="/chat/$id" params={{ id: c.id }}
              className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors",
                active ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              <div className="relative shrink-0">
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" className="size-11 rounded-full object-cover" />
                ) : (
                  <div className="size-11 rounded-full bg-primary/20 text-primary grid place-items-center text-sm font-bold">
                    {c.title.charAt(0).toUpperCase()}
                  </div>
                )}
                {c.type === "PRIVATE" && c.members.some((m) => m.isOnline && m.userId !== user.id) && (
                  <span className={cn("absolute bottom-0 right-0 size-3 rounded-full ring-2", active ? "ring-primary" : "ring-sidebar")}
                    style={{ background: "var(--color-online)" }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  {c.type !== "PRIVATE" && <Users className="size-3 opacity-60 shrink-0" />}
                  <span className="truncate text-sm font-medium">{c.title}</span>
                  <span className={cn("ml-auto text-[10px] shrink-0", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{c.lastTime}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={cn("truncate text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground", c.typing && "text-primary italic")}>
                    {c.typing ? "typing…" : c.lastMessage || "Start chatting"}
                  </span>
                  {c.unread > 0 && (
                    <span className={cn("ml-auto shrink-0 text-[9px] font-bold min-w-5 h-5 px-1.5 grid place-items-center rounded-full",
                      active ? "bg-white/25 text-white" : "bg-primary text-primary-foreground")}>{c.unread}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* New group button */}
      <div className="p-2 border-t border-border">
        <button onClick={() => setShowNewGroup(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent text-sm text-muted-foreground hover:text-foreground transition">
          <Edit className="size-4" /> New Group / Channel
        </button>
      </div>

      {showNewGroup && <CreateGroupModal onClose={() => setShowNewGroup(false)} />}
      <StoryUploadModal
        open={showStoryUpload}
        onClose={() => setShowStoryUpload(false)}
        onUploaded={loadStories}
        myStoryGroup={myStoryGroup}
        onViewExisting={myStoryGroup ? () => {
          setShowStoryUpload(false);
          openStoryViewer(myStoryGroup);
        } : undefined}
      />
      <StoryViewer
        open={viewerState !== null}
        groups={stories}
        initialGroupIndex={viewerState?.groupIndex ?? 0}
        initialStoryIndex={viewerState?.storyIndex ?? 0}
        currentUserId={user.id}
        onClose={() => setViewerState(null)}
        onStoriesChanged={loadStories}
      />
    </aside>
  );
}
