import { useEffect, useRef, useState } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { GroupInfoPanel } from "./GroupInfoPanel";
import { useApp } from "@/context/AppContext";
import type { Chat, Message } from "@/lib/types";

export function ChatWindow({ chat }: { chat: Chat }) {
  const { user, loadMessages, subscribeChat, sendMessage, sendTyping, markAsRead } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const isGroup = chat.type !== "PRIVATE";

  // Load message history on chat change
  useEffect(() => {
    setShowInfo(false);
    loadMessages(chat.id).then(setMessages);
  }, [chat.id]);

  // Subscribe to real-time events
  useEffect(() => {
    return subscribeChat(chat.id, setMessages);
  }, [chat.id]);

  // Mark unread messages as read
  useEffect(() => {
    const lastUnread = [...messages].reverse().find(
      (m) => m.senderId !== user.id && m.status !== "read"
    );
    if (lastUnread) markAsRead(chat.id, lastUnread.id);
  }, [chat.id, messages, user.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-1 min-w-0 h-full">
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <ChatHeader chat={chat} onInfo={() => setShowInfo((s) => !s)} />

        <div className="flex-1 overflow-y-auto scrollbar-thin chat-bg px-3 md:px-8 py-4 space-y-1.5">
          <div className="mx-auto w-fit text-[11px] text-muted-foreground bg-card/70 backdrop-blur px-3 py-1 rounded-full mb-3">
            Today
          </div>
          {messages.map((m, i) => {
            const next = messages[i + 1];
            const showAvatar = !next || next.senderId !== m.senderId;
            return (
              <MessageBubble key={m.id} msg={m} showAvatar={showAvatar} isGroup={isGroup} />
            );
          })}
          {chat.typing && (
            <div className="flex items-end gap-2">
              <img src={chat.avatarUrl} className="size-8 rounded-full" alt="" />
              <div className="bg-(--color-bubble-in) rounded-2xl rounded-bl-md px-3 py-2 flex gap-1">
                <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <MessageInput
          onSend={(text) => sendMessage(chat.id, text)}
          onTyping={(isTyping) => sendTyping(chat.id, isTyping)}
        />
      </div>

      {showInfo && isGroup && (
        <GroupInfoPanel chat={chat} onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
}
