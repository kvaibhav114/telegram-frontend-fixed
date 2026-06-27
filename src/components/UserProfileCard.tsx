import { Camera, Mail, LogOut, Shield, Lock, Loader2, Pencil, X, Check, Trash2, Ban } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/hooks/useToast";
import { authApi } from "@/lib/api/authApi";
import { userApi, type UserProfileResponse } from "@/lib/api/userApi";
import { mapUser } from "@/lib/mappers";
import type { User } from "@/lib/types";

export function UserProfileCard() {
  const { user, setUser } = useApp();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  // ── Edit Profile state ──────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user.displayName);
  const [editBio, setEditBio] = useState(user.bio);
  const [saving, setSaving] = useState(false);

  // ── Change Password state ───────────────────────────────────────────
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // ── Blocked Users state ─────────────────────────────────────────────
  const [showBlocked, setShowBlocked] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);

  // ── Delete Account state ────────────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setEditName(user.displayName); setEditBio(user.bio); }, [user]);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await userApi.updateProfile({
        displayName: editName,
        bio: editBio,
      });
      setUser(mapUser(updated));
      setEditing(false);
      success("Profile updated");
    } catch (err: any) { showError(err.message || "Failed to update profile"); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await userApi.uploadAvatar(file);
      setUser(mapUser(updated));
      success("Avatar updated");
    } catch (err: any) { showError(err.message || "Failed to upload avatar"); }
  };

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd || !newPwd) return;
    setPwdLoading(true);
    try {
      await authApi.changePassword(currentPwd, newPwd);
      success("Password changed");
      setCurrentPwd(""); setNewPwd(""); setShowPwd(false);
    } catch (err: any) { showError(err.message || "Failed to change password"); }
    finally { setPwdLoading(false); }
  };

  const loadBlockedUsers = async () => {
    setShowBlocked(true);
    setBlockedLoading(true);
    try {
      const list = await userApi.getBlockedUsers();
      setBlockedUsers(list.map(mapUser));
    } catch (err: any) { showError(err.message || "Failed to load blocked users"); }
    finally { setBlockedLoading(false); }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await userApi.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      success("User unblocked");
    } catch (err: any) { showError(err.message || "Failed to unblock"); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      await userApi.deleteAccount();
      await authApi.logout();
      navigate({ to: "/login" });
    } catch (err: any) { showError(err.message || "Failed to delete account"); setDeleting(false); }
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    navigate({ to: "/login" });
  };

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8">
      <div className="rounded-xl overflow-hidden bg-card border border-border">
        <div className="h-24 bg-gradient-to-br from-primary/30 to-[#2b5278]/50" />
        <div className="px-5 pb-5 -mt-10">

          {/* Avatar with upload button */}
          <div className="flex items-end gap-3">
            <div className="relative group">
              <img src={user.avatarUrl} alt="" className="size-20 rounded-full object-cover ring-4 ring-card" />
              <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 grid place-items-center cursor-pointer transition">
                <Camera className="size-5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div className="pb-1 flex-1 min-w-0">
              {editing ? (
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-semibold bg-transparent border-b border-primary focus:outline-none w-full" autoFocus />
              ) : (
                <div className="text-xl font-semibold">{user.displayName}</div>
              )}
              <div className="text-xs text-muted-foreground">@{user.username}</div>
            </div>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="size-8 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground">
                <Pencil className="size-4" />
              </button>
            ) : (
              <div className="flex gap-1">
                <button onClick={handleSaveProfile} disabled={saving} className="size-8 grid place-items-center rounded-lg bg-primary text-primary-foreground">
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-4" />}
                </button>
                <button onClick={() => { setEditing(false); setEditName(user.displayName); setEditBio(user.bio); }}
                  className="size-8 grid place-items-center rounded-lg hover:bg-accent text-muted-foreground">
                  <X className="size-4" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <InfoRow icon={Mail} label="Email" value={user.email} />

            {/* Bio — editable */}
            {editing ? (
              <div className="p-3 rounded-lg bg-background border border-border">
                <div className="text-[10px] text-muted-foreground mb-1">Bio</div>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={2} maxLength={200}
                  placeholder="Tell something about yourself"
                  className="w-full bg-transparent text-sm resize-none focus:outline-none" />
                <div className="text-[10px] text-muted-foreground text-right">{editBio.length}/200</div>
              </div>
            ) : (
              user.bio && <InfoRow icon={Shield} label="Bio" value={user.bio} />
            )}

            {/* Change Password */}
            <button onClick={() => setShowPwd((s) => !s)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition text-left">
              <Lock className="size-4 text-muted-foreground" />
              <div className="text-sm font-medium">Change password</div>
            </button>

            {showPwd && (
              <form onSubmit={handleChangePwd} className="p-3 rounded-lg bg-background border border-border space-y-2">
                <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Current password" className="w-full h-9 px-3 rounded-md bg-input text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="New password" className="w-full h-9 px-3 rounded-md bg-input text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                <button disabled={pwdLoading} className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                  {pwdLoading ? <Loader2 className="size-3 animate-spin mx-auto" /> : "Update password"}
                </button>
              </form>
            )}

            {/* Blocked Users */}
            <button onClick={loadBlockedUsers}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition text-left">
              <Ban className="size-4 text-muted-foreground" />
              <div className="text-sm font-medium">Blocked users</div>
            </button>

            {showBlocked && (
              <div className="rounded-lg bg-background border border-border overflow-hidden">
                {blockedLoading ? (
                  <div className="p-4 text-center"><Loader2 className="size-4 animate-spin mx-auto" /></div>
                ) : blockedUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No blocked users</div>
                ) : (
                  blockedUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 border-b border-border last:border-0">
                      <img src={u.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.displayName}</div>
                        <div className="text-xs text-muted-foreground">@{u.username}</div>
                      </div>
                      <button onClick={() => handleUnblock(u.id)}
                        className="text-xs text-primary hover:underline">Unblock</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Logout */}
          <button onClick={handleLogout}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm font-medium">
            <LogOut className="size-4" /> Log out
          </button>

          {/* Delete Account */}
          <button onClick={() => setShowDelete((s) => !s)}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-destructive/30 text-destructive/70 hover:bg-destructive/10 text-xs">
            <Trash2 className="size-3.5" /> Delete account
          </button>

          {showDelete && (
            <div className="mt-2 p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3">
              <p className="text-xs text-destructive">
                This will permanently anonymize your account. All your messages will show "Deleted Account". This cannot be undone.
              </p>
              <p className="text-xs text-muted-foreground">Type <strong>DELETE</strong> to confirm:</p>
              <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE" className="w-full h-9 px-3 rounded-md bg-input text-sm focus:outline-none border border-destructive/30" />
              <button onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE" || deleting}
                className="w-full py-2 rounded-md bg-destructive text-white text-sm font-medium disabled:opacity-50">
                {deleting ? <Loader2 className="size-3 animate-spin mx-auto" /> : "Permanently delete my account"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
      <Icon className="size-4 text-muted-foreground" />
      <div className="min-w-0"><div className="text-[10px] text-muted-foreground">{label}</div><div className="text-sm truncate">{value}</div></div>
    </div>
  );
}