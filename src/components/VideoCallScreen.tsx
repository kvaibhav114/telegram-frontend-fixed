import { Mic, MicOff, PhoneOff, Video, VideoOff, Monitor } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { websocketService } from "@/lib/services/websocketService";
import { webrtcService } from "@/lib/services/webrtcService";
import { callApi } from "@/lib/api/callApi";

export function VideoCallScreen() {
  const { call, endCall } = useApp();
  const [muted, setMuted] = useState(false);
  const [cam, setCam] = useState(true);
  const [s, setS] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // FIXED: compare with "VIDEO" (uppercase) to match backend CallType enum
  const isActive = call.state === "active" && call.type === "VIDEO";

  useEffect(() => {
    if (!isActive) return;

    const local = webrtcService.getLocalStream();

    if (localVideoRef.current && local) {
      localVideoRef.current.srcObject = local;
    }

    webrtcService.setOnRemoteStream((stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });
  }, [isActive]);

  useEffect(() => {
    if (call.state !== "active") return;
    const id = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [call.state]);

  if (!isActive) return null;

  const t = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Remote video */}
      <div
        className="flex-1 relative bg-linear-to-br from-[#1a2a3f] to-[#0b1220]"
        style={{
          backgroundImage: `url(${call.peer.avatarUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute top-5 left-5 flex items-center gap-3 bg-black/40 backdrop-blur px-3 py-2 rounded-2xl">
          <div className="size-2 rounded-full bg-(--color-online) animate-pulse" />
          <div>
            <div className="text-sm font-medium text-white">
              {call.peer.displayName}
            </div>
            <div className="text-[11px] text-white/70 font-mono">{t}</div>
          </div>
        </div>

        {/* Local preview */}
        <div className="absolute top-5 right-5 w-40 md:w-56 aspect-3/4 rounded-2xl overflow-hidden bg-linear-to-br from-[#2b5278] to-[#0b1220] border-2 border-white/20 shadow-elegant grid place-items-center">
          {cam ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <VideoOff className="size-8 text-white/60" />
          )}
          <span className="absolute bottom-2 left-2 text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
            You
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="py-5 flex justify-center items-center gap-3 bg-black/60 backdrop-blur">
        <button
          onClick={() => {
            const nextMuted = !muted;

            setMuted(nextMuted);

            webrtcService.setMicrophoneEnabled(!nextMuted);
          }}
          className="size-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
        <button
          onClick={() => {
            setCam(!cam);
            webrtcService.setCameraEnabled(!cam);
          }}
          className="size-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
        >
          {cam ? <Video className="size-5" /> : <VideoOff className="size-5" />}
        </button>
        <button className="size-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition">
          <Monitor className="size-5" />
        </button>
        <button
          onClick={hangUp}
          className="size-14 grid place-items-center rounded-full bg-destructive text-white shadow-elegant hover:scale-105 transition"
        >
          <PhoneOff className="size-6" />
        </button>
      </div>
    </div>
  );
}
