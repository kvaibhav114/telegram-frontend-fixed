import { Paperclip, Send, Smile, Mic } from "lucide-react";
import { useRef, useState } from "react";
import { EmojiPickerPopover } from "./EmojiPickerPopover";

export function MessageInput({
  onSend,
  onTyping,
}: {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
    onTyping?.(false);
    ref.current?.focus();
  };

  return (
    <div className="relative p-3 md:p-4 bg-sidebar/80 backdrop-blur border-t border-border">
      {emojiOpen && (
        <div className="absolute bottom-20 left-4 z-30">
          <EmojiPickerPopover
            onSelect={(e) => setText((t) => t + e)}
            onClose={() => setEmojiOpen(false)}
          />
        </div>
      )}
      <div className="flex items-end gap-2 bg-card rounded-3xl px-2 py-1.5 border border-border focus-within:border-primary/60 transition">
        <button
          type="button"
          onClick={() => setEmojiOpen((o) => !o)}
          className="size-10 grid place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-primary transition"
        >
          <Smile className="size-5" />
        </button>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.(e.target.value.trim().length > 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Write a message…"
          className="flex-1 resize-none bg-transparent py-2.5 px-1 text-sm focus:outline-none placeholder:text-muted-foreground max-h-40"
        />
        <button type="button" className="size-10 grid place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-primary transition">
          <Paperclip className="size-5" />
        </button>
        {text.trim() ? (
          <button onClick={submit} className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground hover:brightness-110 transition shadow-elegant">
            <Send className="size-5" />
          </button>
        ) : (
          <button className="size-10 grid place-items-center rounded-full bg-primary/90 text-primary-foreground hover:brightness-110 transition shadow-elegant">
            <Mic className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}
