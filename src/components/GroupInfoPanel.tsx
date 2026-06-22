import { X, UserPlus, Link2, LogOut, Search, Loader2, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import type { Chat, User } from "@/lib/types";
import { useApp } from "@/context/AppContext";

export function GroupInfoPanel({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const { user, searchUsers, addMemberToChat, removeMemberFromChat } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  const myRole = chat.members.find((m) => m.userId === user.id)?.role;
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setSearching(true);
      try { const r = await searchUsers(q); if (active) setResults(r.filter((u) => !chat.members.some((m) => m.userId === u.id))); }
      finally { if (active) setSearching(false); }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  const handleAdd = async (u: User) => {
    try { await addMemberToChat(chat.id, u.id); setQ(""); setShowAdd(false); } catch (e: any) { alert(e.message); }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this member?")) return;
    try { await removeMemberFromChat(chat.id, userId); } catch (e: any) { alert(e.message); }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this group?")) return;
    try { await removeMemberFromChat(chat.id, user.id); onClose(); } catch (e: any) { alert(e.message); }
  };

  const copyInvite = () => {
    if (chat.inviteLink) { navigator.clipboard.writeText(chat.inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <aside className="hidden lg:flex w-[300px] shrink-0 flex-col bg-sidebar border-l border-border h-full">
      <div className="flex items-center justify-between px-4 h-14 border-b border-border">
        <span className="font-semibold text-sm">Group info</span>
        <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-accent"><X className="size-4" /></button>
      </div>

      <div className="px-4 py-4 text-center border-b border-border">
        {chat.avatarUrl ? (
          <img src={chat.avatarUrl} className="size-20 rounded-full mx-auto object-cover" alt="" />
        ) : (
          <div className="size-20 rounded-full mx-auto bg-primary/20 text-primary grid place-items-center text-2xl font-bold">{chat.title.charAt(0)}</div>
        )}
        <div className="mt-2 font-semibold">{chat.title}</div>
        <div className="text-xs text-muted-foreground">{chat.members.length} members</div>
        {chat.description && <div className="text-xs text-muted-foreground mt-1">{chat.description}</div>}
      </div>

      {/* Invite link */}
      {chat.inviteLink && (
        <button onClick={copyInvite} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border hover:bg-accent text-sm">
          {copied ? <Check className="size-4 text-green-400" /> : <Link2 className="size-4 text-muted-foreground" />}
          <span className="truncate text-xs">{copied ? "Copied!" : "Copy invite link"}</span>
        </button>
      )}

      {/* Members */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {canManage && (
          <button onClick={() => setShowAdd((s) => !s)} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-accent text-sm text-primary">
            <UserPlus className="size-4" /> Add members
          </button>
        )}

        {showAdd && (
          <div className="px-3 pb-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users"
                className="w-full h-8 pl-8 pr-3 rounded-md bg-input text-xs focus:outline-none" autoFocus />
            </div>
            {searching && <Loader2 className="size-3 animate-spin mx-auto" />}
            {results.map((u) => (
              <button key={u.id} onClick={() => handleAdd(u)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs">
                <img src={u.avatarUrl} className="size-7 rounded-full" alt="" />
                <span className="truncate">{u.displayName}</span>
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{chat.members.length} members</div>
        {chat.members.map((m) => (
          <div key={m.userId} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-accent group">
            <div className="relative">
              <img src={m.avatarUrl} className="size-8 rounded-full object-cover" alt="" />
              {m.isOnline && <span className="absolute bottom-0 right-0 size-2 rounded-full ring-2 ring-sidebar" style={{ background: "var(--color-online)" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{m.displayName}</div>
              <div className="text-[10px] text-muted-foreground">
                {m.role !== "MEMBER" && <span className="text-primary">{m.role.toLowerCase()} · </span>}
                {m.isOnline ? "online" : "offline"}
              </div>
            </div>
            {canManage && m.userId !== user.id && m.role === "MEMBER" && (
              <button onClick={() => handleRemove(m.userId)} className="opacity-0 group-hover:opacity-100 text-xs text-destructive hover:underline">Remove</button>
            )}
          </div>
        ))}
      </div>

      <button onClick={handleLeave}
        className="m-3 flex items-center justify-center gap-2 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs">
        <LogOut className="size-3.5" /> Leave group
      </button>
    </aside>
  );
}
