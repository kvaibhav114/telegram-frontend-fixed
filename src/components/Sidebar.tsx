import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { Search, Settings, Bell, User as UserIcon, Edit, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

export function Sidebar() {
  const { user, chats, searchUsers, openChatWithUser } = useApp();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<User[]>([]);
  const params = useParams({ strict: false }) as { id?: string };
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const visibleChats = useMemo(
    () => chats.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())),
    [chats, q],
  );

  useEffect(() => {
    let active = true;
    const handle = setTimeout(async () => {
      if (!q.trim()) { setResults([]); setSearching(false); return; }
      setSearching(true);
      try {
        const res = await searchUsers(q);
        if (active) setResults(res);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(handle); };
  }, [q, searchUsers]);

  const openResult = async (peer: User) => {
    const chat = await openChatWithUser(peer);
    navigate({ to: "/chat/$id", params: { id: chat.id } });
  };

  return (
    <aside className="flex h-full w-full md:w-85 shrink-0 flex-col bg-sidebar border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Link to="/chat" className="flex items-center gap-2">
          <div className="size-9 rounded-2xl bg-linear-to-br from-primary to-[#2b5278] grid place-items-center shadow-elegant">
            <svg viewBox="0 0 24 24" className="size-5 text-white" fill="currentColor">
              <path d="M9.78 17.5l.36-3.95L18.4 6.8c.32-.29-.07-.43-.5-.17l-10.4 6.56-4.49-1.42c-.97-.3-.98-.97.21-1.44L20.6 3.86c.81-.34 1.58.2 1.27 1.43l-3.06 14.4c-.21 1-.81 1.24-1.64.77l-4.53-3.34-2.18 2.12c-.25.25-.46.46-.95.46z" />
            </svg>
          </div>
          <span className="font-semibold tracking-tight">Telegrok</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Link to="/notifications" className="size-9 grid place-items-center rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <Bell className="size-4" />
          </Link>
          <Link to="/profile" className="size-9 grid place-items-center rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <Settings className="size-4" />
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full h-10 pl-9 pr-3 rounded-2xl bg-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>
        {q.trim() && (
          <div className="mt-3 rounded-2xl border border-border bg-card/90 shadow-elegant overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between text-xs text-muted-foreground border-b border-border">
              <span>People</span>
              {searching && <Loader2 className="size-3.5 animate-spin" />}
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              {results.length > 0 ? (
                results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => void openResult(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left"
                  >
                    <img src={u.avatarUrl} alt={u.displayName} className="size-10 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{u.displayName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        @{u.username} · {u.isOnline ? "online" : "offline"}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  {searching ? "Searching…" : "No users found"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-0.5">
        {visibleChats.map((c) => {
          const active = params.id === c.id;
          return (
            <Link
              key={c.id}
              to="/chat/$id"
              params={{ id: c.id }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors",
                active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              <div className="relative shrink-0">
                <img src={c.avatarUrl} alt={c.title} className="size-12 rounded-full object-cover" />
                {c.type === "PRIVATE" && c.members.some((m) => m.isOnline && m.userId !== user.id) && (
                  <span
                    className={cn("absolute bottom-0 right-0 size-3 rounded-full ring-2", active ? "ring-primary" : "ring-sidebar")}
                    style={{ background: "var(--color-online)" }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{c.title}</span>
                  <span className={cn("ml-auto text-[11px] shrink-0", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {c.lastTime}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("truncate text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground", c.typing && "text-primary italic")}>
                    {c.typing ? "typing…" : c.lastMessage || "Start chatting"}
                  </span>
                  {c.unread > 0 && (
                    <span className={cn("ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full", active ? "bg-white/25 text-white" : "bg-primary text-primary-foreground")}>
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Profile row */}
      <Link
        to="/profile"
        className={cn("flex items-center gap-3 px-3 py-3 border-t border-border hover:bg-accent transition-colors", path === "/profile" && "bg-accent")}
      >
        <img src={user.avatarUrl} alt={user.displayName} className="size-10 rounded-full object-cover" />
        <div className="min-w-0">
          <div className="font-medium truncate">{user.displayName}</div>
          <div className="text-xs text-muted-foreground">View profile</div>
        </div>
        <UserIcon className="ml-auto size-4 text-muted-foreground" />
      </Link>

      {/* Compose button */}
      <button className="hidden md:grid absolute bottom-20 left-72.5 size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-elegant hover:scale-105 transition">
        <Edit className="size-5" />
      </button>
    </aside>
  );
}
