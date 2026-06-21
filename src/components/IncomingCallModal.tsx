import { Phone, PhoneOff, Video } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { websocketService } from "@/lib/services/websocketService";
import { callApi } from "@/lib/api/callApi";

export function IncomingCallModal() {
  const { call, acceptCall, endCall } = useApp();
  const [busy, setBusy] = useState(false);
  if (call.state !== "incoming") return null;

  const reject = () => {
    if (busy) return;
    setBusy(true);
    callApi.reject(call.callId).finally(() => {
      websocketService.sendSignal({
        callId: call.callId, receiverId: Number(call.peer.id),
        type: "CALL_REJECT", payload: "",
      });
      endCall();
    });
  };

  const accept = () => {
    if (busy) return;
    setBusy(true);
    callApi.accept(call.callId).finally(() => {
      websocketService.sendSignal({
        callId: call.callId, receiverId: Number(call.peer.id),
        type: "CALL_ACCEPT", payload: "",
      });
      acceptCall();
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-3xl p-8 w-85 text-center">
        <div className="relative mx-auto size-28 mb-4">
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ring" />
          <img src={call.peer.avatarUrl} alt={call.peer.displayName} className="relative size-28 rounded-full object-cover ring-4 ring-primary/40" />
        </div>
        <div className="text-xl font-semibold">{call.peer.displayName}</div>
        <div className="text-sm text-muted-foreground mt-1">
          Incoming {call.type.toLowerCase()} call…
        </div>
        <div className="flex justify-center gap-6 mt-6">
          <button onClick={reject} className="size-14 grid place-items-center rounded-full bg-destructive text-white shadow-elegant hover:scale-105 transition">
            <PhoneOff className="size-6" />
          </button>
          <button onClick={accept} className="size-14 grid place-items-center rounded-full bg-(--color-online) text-white shadow-elegant hover:scale-105 transition">
            {call.type === "VIDEO" ? <Video className="size-6" /> : <Phone className="size-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
