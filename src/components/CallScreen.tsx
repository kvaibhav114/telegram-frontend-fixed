import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { webrtcService } from "@/lib/services/webrtcService";
import type { CallParticipant } from "@/lib/types";

/**
 * One screen for both VOICE and VIDEO group calls. Renders a responsive grid of
 * remote participants plus a local self-tile, and subscribes to webrtcService
 * stream events so tiles populate as media arrives.
 */
export function CallScreen() {
  const { call, endCall } = useApp();
  const [muted, setMuted] = useState(false);
  const [cam, setCam] = useState(true);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);
  // bump to re-read streams from the service when they change
  const [, force] = useState(0);
  const localRef = useRef<HTMLVideoElement>(null);

  const isActive = call.state === "active";
  const isVideo = call.state !== "idle" && call.type === "VIDEO";

  // Subscribe to media stream changes.
  useEffect(() => {
    if (call.state === "idle") return;
    webrtcService.setOnLocalStream((stream) => {
      if (localRef.current) localRef.current.srcObject = stream;
    });
    webrtcService.setOnRemoteStream(() => force((v) => v + 1));
    webrtcService.setOnPeerClosed(() => force((v) => v + 1));
  }, [call.state]);

  // Call duration timer.
  useEffect(() => {
    if (!isActive) return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  if (!isActive) return null;

  const t = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  // Remote participants are everyone JOINED except self.
  const remotes = call.participants.filter((p) => !p.self && p.status === "JOINED");
  const self = call.participants.find((p) => p.self);

  // Grid columns by participant count (incl. self tile).
  const total = remotes.length + 1;
  const cols = total <= 1 ? 1 : total <= 4 ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="px-5 py-3 flex items-center gap-3 bg-black/40 backdrop-blur">
        <div className="size-2 rounded-full bg-(--color-online) animate-pulse" />
        <span className="text-sm font-medium text-white">
          {isVideo ? "Video call" : "Voice call"} · {total} in call
        </span>
        <span className="ml-auto text-[11px] text-white/70 font-mono">{t}</span>
      </div>

      <div
        className="flex-1 grid gap-2 p-2 overflow-auto"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {remotes.map((p) => (
          <RemoteTile key={p.userId} participant={p} video={isVideo} speaker={speaker} />
        ))}

        {/* Self tile */}
        <div className="relative rounded-2xl overflow-hidden bg-linear-to-br from-[#2b5278] to-[#0b1220] grid place-items-center min-h-40">
          {isVideo && cam ? (
            <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <Avatar name={self?.name ?? "You"} url={self?.avatarUrl} />
          )}
          <span className="absolute bottom-2 left-2 text-[11px] text-white/85 bg-black/40 px-1.5 py-0.5 rounded">
            You{muted ? " · muted" : ""}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="py-5 flex justify-center items-center gap-3 bg-black/60 backdrop-blur">
        <button
          onClick={() => {
            const next = !muted;
            setMuted(next);
            webrtcService.setMicrophoneEnabled(!next);
          }}
          className="size-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>

        {isVideo && (
          <button
            onClick={() => {
              const next = !cam;
              setCam(next);
              webrtcService.setCameraEnabled(next);
            }}
            className="size-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            aria-label={cam ? "Turn camera off" : "Turn camera on"}
          >
            {cam ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>
        )}

        <button
          onClick={() => setSpeaker((s) => !s)}
          className="size-12 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          aria-label={speaker ? "Mute speaker" : "Unmute speaker"}
        >
          {speaker ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>

        <button
          onClick={endCall}
          className="size-14 grid place-items-center rounded-full bg-destructive text-white shadow-elegant hover:scale-105 transition"
          aria-label="Leave call"
        >
          <PhoneOff className="size-6" />
        </button>
      </div>
    </div>
  );
}

function RemoteTile({
  participant,
  video,
  speaker,
}: {
  participant: CallParticipant;
  video: boolean;
  speaker: boolean;
}) {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const stream = webrtcService.getRemoteStream(Number(participant.userId));

  useEffect(() => {
    if (mediaRef.current && stream) mediaRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (mediaRef.current) mediaRef.current.muted = !speaker;
  }, [speaker]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-linear-to-br from-[#1a2a3f] to-[#0b1220] grid place-items-center min-h-40">
      {video ? (
        <video ref={mediaRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <>
          {/* audio-only: hidden media element carries sound, avatar shown */}
          <video ref={mediaRef} autoPlay playsInline className="hidden" />
          <Avatar name={participant.name} url={participant.avatarUrl} />
        </>
      )}
      <span className="absolute bottom-2 left-2 text-[11px] text-white/85 bg-black/40 px-1.5 py-0.5 rounded">
        {participant.name}
      </span>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null | undefined }) {
  return url ? (
    <img src={url} alt={name} className="size-24 rounded-full object-cover ring-4 ring-primary/30" />
  ) : (
    <div className="size-24 rounded-full grid place-items-center bg-primary/20 text-2xl text-white ring-4 ring-primary/30">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}