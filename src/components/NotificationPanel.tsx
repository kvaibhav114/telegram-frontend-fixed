import { Bell, MessageSquare, PhoneMissed, UserPlus, UserMinus, CornerUpLeft, CheckCheck } from "lucide-react";
import { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import type { NotificationType } from "@/lib/types";

const icons: Record<NotificationType, React.ComponentType<{className?: string}>> = {
  NEW_MESSAGE: MessageSquare,
  REPLY: CornerUpLeft,
  USER_JOINED_CHAT: UserPlus,
  USER_LEFT_CHAT: UserMinus,
  CALL_INCOMING: PhoneMissed,
  CALL_MISSED: PhoneMissed,
};

export function NotificationPanel() {
  const { notifications, refreshNotifications, markNotificationsRead } = useApp();

  useEffect(() => {
    refreshNotifications();
    markNotificationsRead();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><Bell className="size-4" /></div>
        <div>
          <h1 className="text-lg font-semibold">Notifications</h1>
          <p className="text-xs text-muted-foreground">Recent activity</p>
        </div>
        {notifications.length > 0 && (
          <button onClick={markNotificationsRead} className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
            <CheckCheck className="size-3" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No notifications yet</div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((n) => {
            const Icon = icons[n.type] ?? Bell;
            const isMissedCall = n.type === "CALL_MISSED" || n.type === "CALL_INCOMING";
            const time = n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            return (
              <div key={n.id} className={`flex items-center gap-3 p-3 rounded-lg border transition ${n.isRead ? "border-border bg-card/50" : "border-primary/30 bg-primary/5"}`}>
                <span className={`size-9 rounded-full grid place-items-center ${isMissedCall ? "text-destructive bg-destructive/10" : "text-primary bg-primary/10"}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{n.actorName}</div>
                  <div className="text-xs text-muted-foreground truncate">{n.content}</div>
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0">{time}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
