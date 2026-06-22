import { Mail, LogOut, Shield, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";
import { authApi } from "@/lib/api/authApi";

export function UserProfileCard() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    navigate({ to: "/login" });
  };

  const changePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd || !newPwd) return;
    setPwdLoading(true); setPwdMsg("");
    try {
      await authApi.changePassword(currentPwd, newPwd);
      setPwdMsg("Password changed!"); setCurrentPwd(""); setNewPwd("");
      setTimeout(() => setShowPwd(false), 1500);
    } catch (err: any) { setPwdMsg(err.message || "Failed"); }
    finally { setPwdLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8">
      <div className="rounded-xl overflow-hidden bg-card border border-border">
        <div className="h-24 bg-gradient-to-br from-primary/30 to-[#2b5278]/50" />
        <div className="px-5 pb-5 -mt-10">
          <div className="flex items-end gap-3">
            <img src={user.avatarUrl} alt="" className="size-20 rounded-full object-cover ring-4 ring-card" />
            <div className="pb-1">
              <div className="text-xl font-semibold">{user.displayName}</div>
              <div className="text-xs text-muted-foreground">@{user.username}</div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <InfoRow icon={Mail} label="Email" value={user.email} />
            {user.bio && <InfoRow icon={Shield} label="Bio" value={user.bio} />}

            <button onClick={() => setShowPwd((s) => !s)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition text-left">
              <Lock className="size-4 text-muted-foreground" />
              <div className="text-sm"><div className="font-medium">Change password</div></div>
            </button>

            {showPwd && (
              <form onSubmit={changePwd} className="p-3 rounded-lg bg-background border border-border space-y-2">
                <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Current password" className="w-full h-9 px-3 rounded-md bg-input text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="New password" className="w-full h-9 px-3 rounded-md bg-input text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                {pwdMsg && <p className="text-xs text-primary">{pwdMsg}</p>}
                <button disabled={pwdLoading} className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                  {pwdLoading ? <Loader2 className="size-3 animate-spin mx-auto" /> : "Update password"}
                </button>
              </form>
            )}
          </div>

          <button onClick={handleLogout}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm font-medium">
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{className?: string}>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
      <Icon className="size-4 text-muted-foreground" />
      <div className="min-w-0"><div className="text-[10px] text-muted-foreground">{label}</div><div className="text-sm truncate">{value}</div></div>
    </div>
  );
}
