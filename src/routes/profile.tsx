import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { UserProfileCard } from "@/components/UserProfileCard";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Telegrok" },
      { name: "description", content: "Manage your Telegrok profile and account." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 flex items-center px-4 border-b border-border bg-sidebar/60 backdrop-blur">
        <Link to="/chat" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to chats
        </Link>
        <span className="ml-4 font-semibold">Profile</span>
      </header>
      <UserProfileCard />
    </div>
  );
}
