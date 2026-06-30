import { Phone, PhoneOff, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";

const RING_TIMEOUT_MS = 33_000;

export function OutgoingCallModal() {
  const { call, endCall } = useApp();
  const [elapsed, setElapsed] = useState(0);

  const isOutgoing = call.state === "outgoing";

  useEffect(() => {
    if (!isOutgoing) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [isOutgoing]);

  useEffect(() => {
    if (!isOutgoing) return;
    const id = setTimeout(() => endCall(), RING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [isOutgoing, endCall]);

  if (!isOutgoing) return null;

  const invitees = call.participants.filter((p) => !p.self);
  const ringing = invitees.filter((p) => p.status === "RINGING").length;
  const title =
    invitees.length === 1 ? invitees[0].name : `${invitees.length} people`;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-3xl p-8 w-85 text-center">
        <div className="relative mx-auto size-28 mb-4 grid place-items-center">
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ring" />
          <span
            className="absolute inset-2 rounded-full bg-primary/20 animate-ring"
            style={{ animationDelay: "0.4s" }}
          />
          {invitees.length === 1 && invitees[0].avatarUrl ? (
            <img
              src={invitees[0].avatarUrl}
              alt={title}
              className="relative size-28 rounded-full object-cover ring-4 ring-primary/40"
            />
          ) : (
            <div className="relative size-28 rounded-full grid place-items-center bg-primary/20 text-2xl text-white ring-4 ring-primary/40">
              {invitees.length === 1 ? title.charAt(0).toUpperCase() : invitees.length}
            </div>
          )}
        </div>

        <div className="text-xl font-semibold">{title}</div>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          {call.type === "VIDEO" ? <Video className="size-3.5" /> : <Phone className="size-3.5" />}
          <span>{ringing > 0 ? "Ringing…" : "Calling…"}</span>
          <span className="font-mono text-xs opacity-70">{mm}:{ss}</span>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={endCall}
            className="size-14 grid place-items-center rounded-full bg-destructive text-white shadow-elegant hover:scale-105 transition"
            aria-label="Cancel call"
          >
            <PhoneOff className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
}