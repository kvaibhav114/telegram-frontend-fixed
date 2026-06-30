import { Phone, PhoneOff, Video } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/context/AppContext";

export function IncomingCallModal() {
  const { call, acceptCall, rejectCall } = useApp();
  const [busy, setBusy] = useState(false);
  if (call.state !== "incoming") return null;

  const others = call.participants.filter((p) => !p.self).length;
  const subtitle =
    others > 1
      ? `${call.creatorName} + ${others - 1} others`
      : call.creatorName;

  const reject = () => {
    if (busy) return;
    setBusy(true);
    rejectCall();
  };
  const accept = () => {
    if (busy) return;
    setBusy(true);
    acceptCall();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-3xl p-8 w-85 text-center">
        <div className="relative mx-auto size-28 mb-4">
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ring" />
          {call.creatorAvatarUrl ? (
            <img
              src={call.creatorAvatarUrl}
              alt={call.creatorName}
              className="relative size-28 rounded-full object-cover ring-4 ring-primary/40"
            />
          ) : (
            <div className="relative size-28 rounded-full grid place-items-center bg-primary/20 text-3xl text-white ring-4 ring-primary/40">
              {call.creatorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="text-xl font-semibold">{subtitle}</div>
        <div className="text-sm text-muted-foreground mt-1">
          Incoming {call.type.toLowerCase()} call…
        </div>
        <div className="flex justify-center gap-6 mt-6">
          <button
            onClick={reject}
            className="size-14 grid place-items-center rounded-full bg-destructive text-white shadow-elegant hover:scale-105 transition"
            aria-label="Decline"
          >
            <PhoneOff className="size-6" />
          </button>
          <button
            onClick={accept}
            className="size-14 grid place-items-center rounded-full bg-(--color-online) text-white shadow-elegant hover:scale-105 transition"
            aria-label="Accept"
          >
            {call.type === "VIDEO" ? <Video className="size-6" /> : <Phone className="size-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}