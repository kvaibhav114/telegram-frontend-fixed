import { Check, CheckCheck, CornerUpLeft, Pencil, Trash2, Pin, Copy, Forward } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { formatLocalTime } from "@/lib/time";

interface Props {
  msg: Message;
  showAvatar: boolean;
  isGroup: boolean;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
}

export function MessageBubble({ msg, showAvatar, isGroup, onReply, onEdit }: Props) {
  const { user, deleteMessage, pinMessage } = useApp();
  const isMine = msg.senderId === user.id;
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

 const time = formatLocalTime(msg.createdAt);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const actions = [
    { icon: CornerUpLeft, label: "Reply", action: () => { onReply(msg); setMenu(false); } },
    ...(isMine ? [{ icon: Pencil, label: "Edit", action: () => { onEdit(msg); setMenu(false); } }] : []),
    { icon: Copy, label: "Copy", action: () => { navigator.clipboard.writeText(msg.content); setMenu(false); } },
    { icon: Pin, label: "Pin", action: () => { pinMessage(msg.chatId, msg.id).catch(console.error); setMenu(false); } },
    ...(isMine ? [{ icon: Trash2, label: "Delete", action: () => { deleteMessage(msg.id, msg.chatId).catch(console.error); setMenu(false); }, danger: true }] : []),
  ];

  return (
    <div className={cn("flex gap-1.5 items-end group", isMine ? "justify-end" : "justify-start")}>
      {!isMine && (
        <div className="w-8 shrink-0">
          {showAvatar && <img src={msg.senderAvatarUrl} alt="" className="size-7 rounded-full object-cover" />}
        </div>
      )}
      <div className="relative max-w-[75%] md:max-w-[55%]">
        <div onContextMenu={(e) => { e.preventDefault(); setMenu(true); }}
          onClick={() => setMenu((v) => !v)}
          className={cn("px-3 py-1.5 rounded-2xl cursor-pointer select-text",
            isMine ? "bg-(--color-bubble-out) text-white rounded-br-sm" : "bg-(--color-bubble-in) text-foreground rounded-bl-sm")}>
          {!isMine && isGroup && <div className="text-[11px] font-semibold text-primary mb-0.5">{msg.senderName}</div>}
          {msg.replyToContent && (
            <div className={cn("text-[11px] px-2 py-1 mb-1 rounded border-l-2",
              isMine ? "border-white/40 bg-white/10 text-white/80" : "border-primary bg-primary/10 text-muted-foreground")}>
              {msg.replyToContent}
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap break-words leading-snug">{msg.content}</div>
          <div className={cn("flex items-center gap-1 mt-0.5 text-[10px]", isMine ? "text-white/60 justify-end" : "text-muted-foreground")}>
            {msg.isEdited && <span>edited</span>}
            <span>{time}</span>
            {isMine && (msg.status === "read" ? <CheckCheck className="size-3 text-sky-300" /> : <Check className="size-3" />)}
          </div>
        </div>

        {/* Context menu */}
        {menu && (
          <div ref={menuRef}
            className={cn("absolute z-20 mt-1 py-1 w-36 rounded-lg bg-popover border border-border shadow-lg",
              isMine ? "right-0" : "left-0")}>
            {actions.map((a) => (
              <button key={a.label} onClick={a.action}
                className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition",
                  (a as any).danger && "text-destructive")}>
                <a.icon className="size-3.5" /> {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
