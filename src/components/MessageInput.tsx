import { Paperclip, Send, Smile, X, Pencil } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import type { Message } from "@/lib/types";

interface Props {
  onSend: (text: string, replyToId?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  editingMsg: Message | null;
  onCancelEdit: () => void;
  onConfirmEdit: (messageId: string, content: string) => void;
}

export function MessageInput({
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  editingMsg,
  onCancelEdit,
  onConfirmEdit,
}: Props) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const typingActive = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = () => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
    if (typingActive.current) {
      typingActive.current = false;
      onTyping?.(false);
    }
  };

  const noteKeystroke = (value: string) => {
    if (!value.trim()) {
      stopTyping();
      return;
    }
    if (!typingActive.current) {
      typingActive.current = true;
      onTyping?.(true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 3000);
  };

  useEffect(() => stopTyping, []);

  useEffect(() => {
    if (editingMsg) {
      setText(editingMsg.content);
      ref.current?.focus();
    }
  }, [editingMsg]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (editingMsg) {
      onConfirmEdit(editingMsg.id, t);
      setText("");
      onCancelEdit();
    } else {
      onSend(t, replyTo?.id);
      setText("");
      onCancelReply();
    }
    stopTyping();
    ref.current?.focus();
  };

  return (
    <div className="bg-sidebar/80 backdrop-blur border-t border-border">
      {/* Reply / Edit bar */}
      {(replyTo || editingMsg) && (
        <div className="flex items-center gap-2 px-4 pt-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border-l-2 border-primary text-xs">
            {editingMsg ? (
              <Pencil className="size-3 text-primary shrink-0" />
            ) : null}
            <div className="min-w-0">
              <div className="font-medium text-primary">
                {editingMsg
                  ? "Editing message"
                  : `Reply to ${replyTo!.senderName}`}
              </div>
              <div className="text-muted-foreground truncate">
                {(editingMsg ?? replyTo)!.content}
              </div>
            </div>
          </div>
          <button
            onClick={editingMsg ? onCancelEdit : onCancelReply}
            className="size-7 grid place-items-center rounded-md hover:bg-accent"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="p-2.5 md:p-3">
        {emojiOpen && (
          <div className="absolute bottom-20 left-4 z-30">
            <EmojiPickerPopover
              onSelect={(e) => setText((t) => t + e)}
              onClose={() => setEmojiOpen(false)}
            />
          </div>
        )}
        <div className="flex items-end gap-1.5 bg-card rounded-2xl px-1.5 py-1 border border-border focus-within:border-primary/50 transition">
          <button
            onClick={() => setEmojiOpen((o) => !o)}
            className="size-9 grid place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-primary transition"
          >
            <Smile className="size-5" />
          </button>
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              noteKeystroke(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Write a message…"
            className="flex-1 resize-none bg-transparent py-2 px-1 text-sm focus:outline-none placeholder:text-muted-foreground max-h-32"
          />
          {/* <button className="size-9 grid place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-primary transition">
            <Paperclip className="size-5" />
          </button> */}
          {text.trim() && (
            <button
              onClick={submit}
              className="size-9 grid place-items-center rounded-full bg-primary text-primary-foreground hover:brightness-110 transition"
            >
              <Send className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
