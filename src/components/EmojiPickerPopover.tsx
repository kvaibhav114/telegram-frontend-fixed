import { useEffect, useState } from "react";

/** Wrap emoji-picker-react safely; only renders on client. */
export function EmojiPickerPopover({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}) {
  const [Picker, setPicker] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    import("emoji-picker-react").then((mod) => {
      if (mounted) setPicker(() => mod.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden shadow-elegant border border-border bg-popover">
      {Picker ? (
        <Picker
          theme={"dark" as any}
          width={320}
          height={400}
          onEmojiClick={(e: { emoji: string }) => {
            onSelect(e.emoji);
            onClose?.();
          }}
          previewConfig={{ showPreview: false }}
          searchPlaceHolder="Search emoji"
        />
      ) : (
        <div className="w-80 h-96 flex items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      )}
    </div>
  );
}
