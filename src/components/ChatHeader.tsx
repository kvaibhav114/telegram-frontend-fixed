import { Phone, Video, MoreVertical, Users, Search } from "lucide-react";
import type { Chat, CallType } from "@/lib/types";
import { useApp } from "@/context/AppContext";

export function ChatHeader({ chat, onInfo }: { chat: Chat; onInfo?: () => void }) {
  const { user, startCall } = useApp();

  const callPeer = (type: CallType) => {
    const other = chat.members.find((m) => m.userId !== user.id);
    if (!other) return;
    const peer = {
      id: other.userId,
      username: other.username,
      displayName: other.displayName,
      email: "",
      bio: "",
      avatarUrl: other.avatarUrl,
      isOnline: other.isOnline,
      lastSeenAt: null,
    };
    void startCall(peer, type);
  };

  const isGroup = chat.type !== "PRIVATE";
  const onlineCount = chat.members.filter((m) => m.isOnline).length;

  return (
    <div className="h-16 px-4 flex items-center gap-3 bg-sidebar/80 backdrop-blur border-b border-border">
      <button onClick={onInfo} className="flex items-center gap-3 min-w-0">
        <img src={chat.avatarUrl} alt={chat.title} className="size-10 rounded-full object-cover" />
        <div className="text-left min-w-0">
          <div className="font-semibold truncate">{chat.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {isGroup
              ? `${chat.members.length} members, ${onlineCount} online`
              : chat.typing
                ? "typing…"
                : chat.members.find((m) => m.userId !== user.id)?.isOnline
                  ? "online"
                  : "offline"}
          </div>
        </div>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button className="size-10 grid place-items-center rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition">
          <Search className="size-4" />
        </button>
        {!isGroup && (
          <>
            <button onClick={() => callPeer("VOICE")} className="size-10 grid place-items-center rounded-xl hover:bg-accent text-muted-foreground hover:text-primary transition">
              <Phone className="size-4" />
            </button>
            <button onClick={() => callPeer("VIDEO")} className="size-10 grid place-items-center rounded-xl hover:bg-accent text-muted-foreground hover:text-primary transition">
              <Video className="size-4" />
            </button>
          </>
        )}
        {isGroup && (
          <button onClick={onInfo} className="size-10 grid place-items-center rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition">
            <Users className="size-4" />
          </button>
        )}
        <button className="size-10 grid place-items-center rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition">
          <MoreVertical className="size-4" />
        </button>
      </div>
    </div>
  );
}
