import { X, Search, Loader2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";
import type { User, ChatType } from "@/lib/types";

export function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { searchUsers, createGroup } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<"type" | "details" | "members">("type");
  const [chatType, setChatType] = useState<ChatType>("GROUP");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setSearching(true);
      try { const r = await searchUsers(q); if (active) setResults(r); }
      finally { if (active) setSearching(false); }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  const toggle = (u: User) => {
    setSelected((prev) => prev.some((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u]);
  };

  const submit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const chat = await createGroup(chatType, title, selected.map((u) => Number(u.id)), desc || undefined);
      onClose();
      navigate({ to: "/chat/$id", params: { id: chat.id } });
    } catch (e: any) { alert(e.message || "Failed to create"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold">
            {step === "type" ? "New conversation" : step === "details" ? `New ${chatType.toLowerCase()}` : "Add members"}
          </h2>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-accent"><X className="size-4" /></button>
        </div>

        {step === "type" && (
          <div className="p-4 space-y-2">
            {(["GROUP", "CHANNEL"] as ChatType[]).map((t) => (
              <button key={t} onClick={() => { setChatType(t); setStep("details"); }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition">
                <div className="font-medium text-sm">{t === "GROUP" ? "New Group" : "New Channel"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t === "GROUP" ? "Create a group with friends" : "Create a broadcast channel"}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === "details" && (
          <div className="p-4 space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${chatType === "GROUP" ? "Group" : "Channel"} name`}
              className="w-full h-10 px-3 rounded-lg bg-input text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" autoFocus />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={2}
              className="w-full px-3 py-2 rounded-lg bg-input text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <button onClick={() => setStep("members")} disabled={!title.trim()}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Next</button>
          </div>
        )}

        {step === "members" && (
          <div className="flex flex-col" style={{ maxHeight: "60vh" }}>
            {selected.length > 0 && (
              <div className="flex gap-1.5 px-4 pt-3 flex-wrap">
                {selected.map((u) => (
                  <span key={u.id} onClick={() => toggle(u)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/15 text-primary text-xs cursor-pointer hover:bg-primary/25">
                    {u.displayName} <X className="size-3" />
                  </span>
                ))}
              </div>
            )}
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users to add"
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-input text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" autoFocus />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-32 max-h-64">
              {searching && <div className="text-xs text-muted-foreground text-center py-4"><Loader2 className="size-4 animate-spin inline" /></div>}
              {results.map((u) => {
                const checked = selected.some((s) => s.id === u.id);
                return (
                  <button key={u.id} onClick={() => toggle(u)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent text-left">
                    <img src={u.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.displayName}</div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </div>
                    <div className={`size-5 rounded-md border grid place-items-center ${checked ? "bg-primary border-primary" : "border-border"}`}>
                      {checked && <Check className="size-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-border">
              <button onClick={submit} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {loading ? <Loader2 className="size-4 animate-spin mx-auto" /> : `Create ${chatType.toLowerCase()}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
