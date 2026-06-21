import { Check, CheckCheck } from "lucide-react";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export function MessageBubble({
  msg,
  showAvatar,
  isGroup,
}: {
  msg: Message;
  showAvatar: boolean;
  isGroup: boolean;
}) {
  const { user } = useApp();
  const isMine = msg.senderId === user.id;

  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={cn("flex gap-2 items-end group", isMine ? "justify-end" : "justify-start")}>
      {!isMine && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <img src={msg.senderAvatarUrl} alt={msg.senderName} className="size-8 rounded-full object-cover" />
          )}
        </div>
      )}
      <div className="relative max-w-[78%] md:max-w-[60%]">
        <div
          className={cn(
            "px-3.5 py-2 rounded-2xl shadow-elegant transition",
            isMine
              ? "bg-(--color-bubble-out) text-white rounded-br-md"
              : "bg-(--color-bubble-in) text-foreground rounded-bl-md",
          )}
        >
          {!isMine && isGroup && (
            <div className="text-[11px] font-semibold text-primary mb-0.5">
              {msg.senderName}
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
            {msg.content}
          </div>
          <div
            className={cn(
              "flex items-center gap-1 mt-1 text-[10px]",
              isMine ? "text-white/70 justify-end" : "text-muted-foreground",
            )}
          >
            {msg.isEdited && <span>edited</span>}
            <span>{time}</span>
            {isMine &&
              (msg.status === "read" ? (
                <CheckCheck className="size-3 text-sky-300" />
              ) : msg.status === "delivered" ? (
                <CheckCheck className="size-3" />
              ) : (
                <Check className="size-3" />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
