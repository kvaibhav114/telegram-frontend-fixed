import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chats — Telegrok" },
      { name: "description", content: "Your conversations on Telegrok." },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hasChild = path !== "/chat";
  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      <div className={`${hasChild ? "hidden md:flex" : "flex"} relative`}>
        <Sidebar />
      </div>
      <main className={`${hasChild ? "flex" : "hidden md:flex"} flex-1 min-w-0`}>
        <Outlet />
      </main>
    </div>
  );
}
