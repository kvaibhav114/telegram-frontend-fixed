
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ChatWindow } from "@/components/ChatWindow";
import { useApp } from "@/context/AppContext";
import { useEffect, useState } from "react";
import type { Chat } from "@/lib/types";
import { chatApi } from "@/lib/api/chatApi";
import { mapChat } from "@/lib/mappers";

export const Route = createFileRoute("/chat/$id")({
  component: ChatRoute,
  notFoundComponent: () => (
    <div className="flex-1 grid place-items-center text-muted-foreground">Chat not found</div>
  ),
});

function ChatRoute() {
  const { id } = Route.useParams();
  const { getChatById, user } = useApp();
  const [chat, setChat] = useState<Chat | undefined>(() => getChatById(id));
  const [loading, setLoading] = useState(!getChatById(id));

  useEffect(() => {
    const existing = getChatById(id);
    if (existing) {
      setChat(existing);
      setLoading(false);
      return;
    }

    setChat(undefined);
    setLoading(true);

    (async () => {
      try {
        const resp = await chatApi.getChatById(id);
        // FIXED: Was 25 lines of inline mapping. Now one line.
        setChat(mapChat(resp, user.id));
      } catch {
        setChat(undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, getChatById, user.id]);

  if (loading) {
    return <div className="flex-1 grid place-items-center text-muted-foreground">Loading chat…</div>;
  }

  if (!chat) throw notFound();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Link to="/chat"
        className="md:hidden inline-flex items-center gap-2 text-sm px-4 py-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <ChatWindow chat={chat} />
    </div>
  );
}