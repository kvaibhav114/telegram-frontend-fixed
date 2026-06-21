import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/chat/")({
  component: ChatHome,
});

function ChatHome() {
  return (
    <div className="flex-1 chat-bg grid place-items-center">
      <div className="text-center max-w-sm px-6">
        <div className="size-20 mx-auto rounded-3xl bg-primary/10 text-primary grid place-items-center mb-4">
          <MessageSquare className="size-8" />
        </div>
        <h2 className="text-xl font-semibold">Select a chat to start messaging</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Pick a conversation from the sidebar — or start a new one. Your messages are end-to-end encrypted.
        </p>
      </div>
    </div>
  );
}
