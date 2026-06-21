import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { websocketService } from "@/lib/services/websocketService";
import { webrtcService } from "@/lib/services/webrtcService";
import { callApi } from "@/lib/api/callApi";

function useTimer(active: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) return;
    setS(0);
    const id = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceCallScreen() {
  const { call, endCall } = useApp();
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const t = useTimer(call.state === "active");

  const isActive = call.state === "active" && call.type === "VOICE";

  useEffect(() => {
    if (!isActive) return;

    webrtcService.setOnRemoteStream((stream) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
    });

    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !speaker;
    }
  }, [isActive, speaker]);

  if (!isActive) return null;

  const hangUp = () => {
    websocketService.sendSignal({
      callId: call.callId,
      receiverId: Number(call.peer.id),
      type: "CALL_END",
      payload: "",
    });
    callApi.end(call.callId);
    endCall();
  };

  return (
    <div className="fixed inset-0 z-50 bg-linear-to-br from-[#0b1a2c] via-[#0e1621] to-[#17212B] flex flex-col">
      <audio ref={remoteAudioRef} autoPlay />
      <div className="flex-1 grid place-items-center">
        <div className="text-center">
          <div className="relative mx-auto size-44 mb-6">
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ring" />
            <span
              className="absolute inset-4 rounded-full bg-primary/10 animate-ring"
              style={{ animationDelay: "0.4s" }}
            />
            <img
              src={call.peer.avatarUrl}
              alt={call.peer.displayName}
              className="relative size-44 rounded-full object-cover ring-4 ring-primary/40"
            />
          </div>
          <div className="text-3xl font-semibold">{call.peer.displayName}</div>
          <div className="text-primary mt-1 font-mono tracking-wider">{t}</div>
          <div className="text-xs text-muted-foreground mt-1">
            end-to-end encrypted
          </div>
        </div>
      </div>
      <div className="pb-10 flex justify-center items-center gap-5">
        <button
          onClick={() => {
            const nextMuted = !muted;

            setMuted(nextMuted);

            webrtcService.setMicrophoneEnabled(!nextMuted);
          }}
          className="size-14 grid place-items-center rounded-full bg-card border border-border hover:bg-accent transition"
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
        <button
          onClick={hangUp}
          className="size-16 grid place-items-center rounded-full bg-destructive text-white shadow-elegant hover:scale-105 transition"
        >
          <PhoneOff className="size-6" />
        </button>
        <button
          onClick={() => {
            setSpeaker(!speaker);
            if (remoteAudioRef.current) remoteAudioRef.current.muted = speaker;
          }}
          className="size-14 grid place-items-center rounded-full bg-card border border-border hover:bg-accent transition"
        >
          {speaker ? (
            <Volume2 className="size-5" />
          ) : (
            <VolumeX className="size-5" />
          )}
        </button>
      </div>
    </div>
  );
}
