import { Bell, MessageSquare, PhoneMissed } from "lucide-react";
import { useEffect, useState } from "react";
import { callApi, type CallResponse } from "@/lib/api/callApi";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "message" | "missed_call";
}

export function NotificationPanel() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const calls = await callApi.getHistory(0, 20);
        const mapped: NotificationItem[] = calls
          .filter((c: CallResponse) => c.status === "MISSED" || c.status === "REJECTED")
          .map((c: CallResponse) => ({
            id: String(c.callId),
            title: `Missed ${c.callType.toLowerCase()} call`,
            description: `From ${c.callerName}`,
            time: c.createdAt
              ? new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
            type: "missed_call" as const,
          }));
        setItems(mapped);
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-2xl bg-primary/10 text-primary grid place-items-center">
          <Bell className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Recent activity</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No notifications yet</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = n.type === "missed_call" ? PhoneMissed : MessageSquare;
            const accent = n.type === "missed_call" ? "text-destructive bg-destructive/10" : "text-primary bg-primary/10";
            return (
              <div key={n.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition">
                <span className={`size-10 rounded-full grid place-items-center ${accent}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{n.title}</div>
                  <div className="text-sm text-muted-foreground truncate">{n.description}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{n.time}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
