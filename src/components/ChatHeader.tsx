import { Phone, Video, Users, Pin, ChevronDown, X } from "lucide-react";
import { useState, useEffect } from "react";
import type { Chat, CallType, PinnedMessage, Message } from "@/lib/types";
import type { PinnedMessageResponse } from "@/lib/api/chatApi";
import { useApp } from "@/context/AppContext";
import { chatApi } from "@/lib/api/chatApi";

function toPinnedMsg(r: PinnedMessageResponse): PinnedMessage {
  return {
    id: r.id, chatId: r.chatId,
    message: {
      id: String(r.message.id), chatId: String(r.message.chatId), senderId: String(r.message.senderId),
      senderName: r.message.senderName ?? "", senderAvatarUrl: r.message.senderAvatarUrl ?? "",
      type: r.message.type ?? "TEXT", content: r.message.content ?? "",
      replyToId: null, replyToContent: null, isEdited: false,
      createdAt: r.message.createdAt ?? "", status: "sent",
    },
    pinnedById: r.pinnedById, pinnedByName: r.pinnedByName, pinnedAt: r.pinnedAt,
  };
}

export function ChatHeader({ chat, onInfo }: { chat: Chat; onInfo?: () => void }) {
  const { user, startCall, unpinMessage } = useApp();
  const [pins, setPins] = useState<PinnedMessage[]>([]);
  const [showPins, setShowPins] = useState(false);

  useEffect(() => {
    chatApi.getPinnedMessages(chat.id).then((r) => setPins(r.map(toPinnedMsg))).catch(() => {});
  }, [chat.id]);

  const callPeer = (type: CallType) => {
    const other = chat.members.find((m) => m.userId !== user.id);
    if (!other) return;
    void startCall({ id: other.userId, username: other.username, displayName: other.displayName, email: "", bio: "", avatarUrl: other.avatarUrl, isOnline: other.isOnline, lastSeenAt: null }, type);
  };

  const handleUnpin = async (pin: PinnedMessage) => {
    await unpinMessage(String(pin.chatId), pin.message.id);
    setPins((p) => p.filter((pp) => pp.id !== pin.id));
  };

  const isGroup = chat.type !== "PRIVATE";
  const onlineCount = chat.members.filter((m) => m.isOnline).length;

  return (
    <div className="border-b border-border">
      <div className="h-14 px-3 flex items-center gap-2.5 bg-sidebar/80 backdrop-blur">
        <button onClick={onInfo} className="flex items-center gap-2.5 min-w-0">
          {chat.avatarUrl ? (
            <img src={chat.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <div className="size-9 rounded-full bg-primary/20 text-primary grid place-items-center text-sm font-bold">
              {chat.title.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-left min-w-0">
            <div className="text-sm font-semibold truncate">{chat.title}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {isGroup ? `${chat.members.length} members, ${onlineCount} online`
                : chat.typing ? "typing…"
                : chat.members.find((m) => m.userId !== user.id)?.isOnline ? "online" : "offline"}
            </div>
          </div>
        </button>

        <div className="ml-auto flex items-center gap-0.5">
          {pins.length > 0 && (
            <button onClick={() => setShowPins((s) => !s)}
              className="size-9 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition relative">
              <Pin className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 size-4 text-[9px] font-bold bg-primary text-primary-foreground rounded-full grid place-items-center">{pins.length}</span>
            </button>
          )}
          {!isGroup && (
            <>
              <button onClick={() => callPeer("VOICE")} className="size-9 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition"><Phone className="size-4" /></button>
              <button onClick={() => callPeer("VIDEO")} className="size-9 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition"><Video className="size-4" /></button>
            </>
          )}
          {isGroup && (
            <button onClick={onInfo} className="size-9 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground transition"><Users className="size-4" /></button>
          )}
        </div>
      </div>

      {/* Pinned messages dropdown */}
      {showPins && pins.length > 0 && (
        <div className="bg-card/95 backdrop-blur border-b border-border max-h-48 overflow-y-auto">
          {pins.map((pin) => (
            <div key={pin.id} className="flex items-center gap-2 px-4 py-2 border-b border-border last:border-0 text-xs">
              <Pin className="size-3 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-primary">{pin.pinnedByName}</span>
                <span className="text-muted-foreground"> pinned: </span>
                <span className="truncate">{pin.message.content}</span>
              </div>
              <button onClick={() => handleUnpin(pin)} className="size-6 grid place-items-center rounded hover:bg-accent shrink-0"><X className="size-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
