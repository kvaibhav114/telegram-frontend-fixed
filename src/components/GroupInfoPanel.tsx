import { X, UserPlus, Link2, LogOut, Search, Loader2, Copy, Check, RefreshCw, ShieldCheck, ShieldMinus } from "lucide-react";
import { useState, useEffect } from "react";
import type { Chat, User, MemberRole } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { chatApi } from "@/lib/api/chatApi";

export function GroupInfoPanel({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const { user, searchUsers, addMemberToChat, removeMemberFromChat } = useApp();
  const { success, error: showError } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState(chat.inviteLink);
  const [regenerating, setRegenerating] = useState(false);

  const myRole = chat.members.find((m) => m.userId === user.id)?.role;
  const isOwner = myRole === "OWNER";
  const canManage = isOwner || myRole === "ADMIN";

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setSearching(true);
      try {
        const r = await searchUsers(q);
        if (active) setResults(r.filter((u) => !chat.members.some((m) => m.userId === u.id)));
      } finally { if (active) setSearching(false); }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  const handleAdd = async (u: User) => {
    try {
      await addMemberToChat(chat.id, u.id);
      setQ(""); setShowAdd(false);
      success(`${u.displayName} added`);
    } catch (e: any) { showError(e.message); }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this member?")) return;
    try { await removeMemberFromChat(chat.id, userId); success("Member removed"); }
    catch (e: any) { showError(e.message); }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this group?")) return;
    try { await removeMemberFromChat(chat.id, user.id); onClose(); }
    catch (e: any) { showError(e.message); }
  };

  const copyInvite = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const resp = await chatApi.regenerateInviteLink(chat.id);
      setInviteLink(resp.inviteLink);
      success("Invite link regenerated");
    } catch (e: any) { showError(e.message); }
    finally { setRegenerating(false); }
  };

  // ── Promote / Demote ──────────────────────────────────────────────
  const handleRoleChange = async (userId: string, newRole: MemberRole) => {
    const label = newRole === "ADMIN" ? "promoted to Admin" : "demoted to Member";
    try {
      await chatApi.changeMemberRole(chat.id, userId, newRole);
      success(`User ${label}`);
      // Optimistic update
      const member = chat.members.find((m) => m.userId === userId);
      if (member) (member as any).role = newRole;
    } catch (e: any) { showError(e.message); }
  };

  return (
    <aside className="hidden lg:flex w-[300px] shrink-0 flex-col bg-sidebar border-l border-border h-full">
      <div className="flex items-center justify-between px-4 h-14 border-b border-border">
        <span className="font-semibold text-sm">Group info</span>
        <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-accent"><X className="size-4" /></button>
      </div>

      {/* Group avatar & title */}
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

      {/* Invite link with copy + regenerate */}
      {inviteLink && (
        <div className="flex items-center border-b border-border">
          <button onClick={copyInvite} className="flex-1 flex items-center gap-2.5 px-4 py-2.5 hover:bg-accent text-sm">
            {copied ? <Check className="size-4 text-green-400" /> : <Link2 className="size-4 text-muted-foreground" />}
            <span className="truncate text-xs">{copied ? "Copied!" : "Copy invite link"}</span>
          </button>
          {canManage && (
            <button onClick={handleRegenerate} disabled={regenerating} title="Regenerate invite link"
              className="size-10 grid place-items-center hover:bg-accent text-muted-foreground border-l border-border">
              {regenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            </button>
          )}
        </div>
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

            {/* Actions for non-self members */}
            {m.userId !== user.id && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                {/* Promote/Demote — only visible to OWNER */}
                {isOwner && m.role === "MEMBER" && (
                  <button onClick={() => handleRoleChange(m.userId, "ADMIN")}
                    title="Promote to Admin"
                    className="size-6 grid place-items-center rounded hover:bg-primary/10 text-primary">
                    <ShieldCheck className="size-3.5" />
                  </button>
                )}
                {isOwner && m.role === "ADMIN" && (
                  <button onClick={() => handleRoleChange(m.userId, "MEMBER")}
                    title="Demote to Member"
                    className="size-6 grid place-items-center rounded hover:bg-yellow-500/10 text-yellow-500">
                    <ShieldMinus className="size-3.5" />
                  </button>
                )}
                {/* Remove — visible to OWNER/ADMIN for non-admin members */}
                {canManage && (m.role === "MEMBER" || isOwner) && (
                  <button onClick={() => handleRemove(m.userId)}
                    className="text-[10px] text-destructive hover:underline">Remove</button>
                )}
              </div>
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