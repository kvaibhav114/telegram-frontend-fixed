import { Camera, Mail, Edit3, LogOut, Shield, Bell } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";
import { authApi } from "@/lib/api/authApi";

export function UserProfileCard() {
  const { user } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* token already cleared */ }
    navigate({ to: "/login" });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="rounded-3xl overflow-hidden bg-card border border-border shadow-elegant">
        <div className="h-32 bg-linear-to-br from-primary via-[#2b5278] to-[#0e1621]" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4">
            <div className="relative">
              <img src={user.avatarUrl} alt={user.displayName} className="size-24 rounded-full object-cover ring-4 ring-card" />
              <button className="absolute bottom-0 right-0 size-8 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-elegant hover:scale-105 transition">
                <Camera className="size-4" />
              </button>
            </div>
            <div className="pb-2">
              <div className="text-2xl font-semibold">{user.displayName}</div>
              <div className="text-sm text-muted-foreground">@{user.username}</div>
            </div>
            <button className="ml-auto pb-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition shadow-elegant">
              <Edit3 className="size-4" /> Edit profile
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <Row icon={Mail} label="Email" value={user.email} />
            {user.bio && <Row icon={Shield} label="Bio" value={user.bio} />}
            <Row icon={Shield} label="Privacy" value="End-to-end encrypted chats" />
            <Link
              to="/notifications"
              className="flex items-center gap-3 p-4 rounded-2xl bg-background border border-border hover:border-primary/40 transition"
            >
              <Bell className="size-4 text-muted-foreground" />
              <div className="text-sm">
                <div className="font-medium">Notifications</div>
                <div className="text-muted-foreground text-xs">Manage alerts and sounds</div>
              </div>
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm font-medium transition"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-background border border-border">
      <Icon className="size-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm truncate">{value}</div>
      </div>
    </div>
  );
}
