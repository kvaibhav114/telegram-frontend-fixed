import { useEffect, useRef, useState } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { GroupInfoPanel } from "./GroupInfoPanel";
import { useApp } from "@/context/AppContext";
import type { Chat, Message } from "@/lib/types";

export function ChatWindow({ chat }: { chat: Chat }) {
  const { user, loadMessages, subscribeChat, sendMessage, sendTyping, markAsRead, editMessage } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastMarkedRef = useRef<string | null>(null);
  const isGroup = chat.type !== "PRIVATE";

  useEffect(() => {
    setShowInfo(false); setReplyTo(null); setEditingMsg(null);
    lastMarkedRef.current = null;
    loadMessages(chat.id).then(setMessages);
  }, [chat.id]);

  useEffect(() => { return subscribeChat(chat.id, setMessages); }, [chat.id]);

  useEffect(() => {
    const lastIncoming = [...messages].reverse().find((m) => m.senderId !== user.id);
    if (lastIncoming && lastIncoming.id !== lastMarkedRef.current) {
      lastMarkedRef.current = lastIncoming.id;
      markAsRead(chat.id, lastIncoming.id);
    }
  }, [chat.id, messages, user.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const handleSend = (text: string, replyToId?: string) => {
    sendMessage(chat.id, text, replyToId);
  };

  const handleEdit = async (messageId: string, content: string) => {
    await editMessage(messageId, content);
  };

  return (
    <div className="flex flex-1 min-w-0 h-full">
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <ChatHeader chat={chat} onInfo={() => setShowInfo((s) => !s)} />

        <div className="flex-1 overflow-y-auto scrollbar-thin chat-bg px-3 md:px-6 py-3 space-y-1">
          <div className="mx-auto w-fit text-[10px] text-muted-foreground bg-card/70 backdrop-blur px-2.5 py-0.5 rounded-full mb-2">Today</div>
          {messages.map((m, i) => {
            const next = messages[i + 1];
            const showAvatar = !next || next.senderId !== m.senderId;
            return <MessageBubble key={m.id} msg={m} showAvatar={showAvatar} isGroup={isGroup}
              onReply={(msg) => { setEditingMsg(null); setReplyTo(msg); }}
              onEdit={(msg) => { setReplyTo(null); setEditingMsg(msg); }} />;
          })}
          {chat.typing && (
            <div className="flex items-end gap-2">
              <div className="size-7 rounded-full bg-muted" />
              <div className="bg-(--color-bubble-in) rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1">
                <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <MessageInput
          onSend={handleSend}
          onTyping={(isTyping) => sendTyping(chat.id, isTyping)}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editingMsg={editingMsg}
          onCancelEdit={() => { setEditingMsg(null); }}
          onConfirmEdit={handleEdit}
        />
      </div>

      {showInfo && isGroup && <GroupInfoPanel chat={chat} onClose={() => setShowInfo(false)} />}
    </div>
  );
}
