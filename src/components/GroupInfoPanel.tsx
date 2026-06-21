import { X, UserPlus, Bell, Image as ImageIcon, Link2, LogOut } from "lucide-react";
import type { Chat } from "@/lib/types";

export function GroupInfoPanel({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  return (
    <aside className="hidden lg:flex w-[320px] shrink-0 flex-col bg-sidebar border-l border-border h-full">
      <div className="flex items-center justify-between px-4 h-16 border-b border-border">
        <span className="font-semibold">Group info</span>
        <button onClick={onClose} className="size-9 grid place-items-center rounded-xl hover:bg-accent">
          <X className="size-4" />
        </button>
      </div>

      <div className="px-4 py-6 text-center border-b border-border">
        <img src={chat.avatarUrl} className="size-24 rounded-full mx-auto object-cover ring-4 ring-primary/20" alt="" />
        <div className="mt-3 font-semibold text-lg">{chat.title}</div>
        <div className="text-xs text-muted-foreground">{chat.members.length} members</div>
        {chat.description && (
          <div className="text-sm text-muted-foreground mt-2">{chat.description}</div>
        )}
      </div>

      <div className="px-2 py-2 border-b border-border space-y-0.5">
        {[
          { icon: Bell, label: "Notifications" },
          { icon: ImageIcon, label: "Shared media" },
          { icon: Link2, label: "Shared links" },
        ].map((r) => (
          <button key={r.label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent text-sm">
            <r.icon className="size-4 text-muted-foreground" />
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent text-sm text-primary">
          <UserPlus className="size-4" /> Add members
        </button>
        <div className="px-3 pt-3 pb-1 text-xs uppercase tracking-wider text-muted-foreground">
          {chat.members.length} members
        </div>
        {chat.members.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent">
            <div className="relative">
              <img src={m.avatarUrl} className="size-9 rounded-full object-cover" alt="" />
              {m.isOnline && (
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-sidebar" style={{ background: "var(--color-online)" }} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{m.displayName}</div>
              <div className="text-[11px] text-muted-foreground">
                {m.role !== "MEMBER" ? m.role.toLowerCase() + " · " : ""}
                {m.isOnline ? "online" : "offline"}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="m-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm">
        <LogOut className="size-4" /> Leave group
      </button>
    </aside>
  );
}
