import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { CallState, CallType, User } from "@/lib/types";
import { callApi } from "@/lib/api/callApi";
import { websocketService } from "@/lib/services/websocketService";
import { webrtcService } from "@/lib/services/webrtcService";

export function useCallSignaling(
  user: User,
  users: Record<string, User>,
  userRef: MutableRefObject<User>,
) {
  const [call, setCall] = useState<CallState>({ state: "idle" });
  const callRef = useRef(call);
  const updateCall = (next: CallState) => { callRef.current = next; setCall(next); };

  const getPeer = (senderId: number): User =>
    users[String(senderId)] ?? {
      id: String(senderId), username: "", displayName: `User ${senderId}`,
      email: "", bio: "", avatarUrl: `https://i.pravatar.cc/150?u=${senderId}`,
      isOnline: true, lastSeenAt: null,
    };

  // WebSocket signal handler
  useEffect(() => {
    const unsub = websocketService.onSignal(async (msg) => {
      const parsePayload = (payload: unknown): Record<string, unknown> | undefined => {
        if (!payload) return undefined;
        if (typeof payload === "string") {
          try { const p = JSON.parse(payload); return p && typeof p === "object" ? p : undefined; } catch { return undefined; }
        }
        return typeof payload === "object" ? (payload as Record<string, unknown>) : undefined;
      };

      const p = parsePayload(msg.payload);
      const senderId = Number(msg.senderId ?? p?.callerId ?? p?.senderId ?? 0);
      const callId = String(msg.callId ?? p?.callId ?? "");
      const resolveCallType = (): CallType => (p?.callType === "VOICE" || p?.callType === "VIDEO") ? p.callType as CallType : "VIDEO";

      if (msg.type === "CALL_REQUEST" || msg.type === "INCOMING_CALL") {
        updateCall({ state: "incoming", peer: getPeer(senderId), type: resolveCallType(), callId });
        return;
      }

      if (msg.type === "CALL_ACCEPT" || msg.type === "CALL_ACCEPTED") {
        const active = callRef.current;
        if (active.state !== "outgoing") return;
        updateCall({ state: "active", peer: active.peer, type: active.type, callId: active.callId });
        try { await webrtcService.startLocalMedia(active.type); } catch { webrtcService.reset(); updateCall({ state: "idle" }); return; }
        const pc = webrtcService.createPeerConnection();
        pc.onicecandidate = (e) => { if (e.candidate) websocketService.sendSignal({ callId: active.callId, receiverId: senderId, type: "ICE_CANDIDATE", payload: JSON.stringify(e.candidate) }); };
        webrtcService.attachLocalTracks();
        const offer = await webrtcService.createOffer();
        websocketService.sendSignal({ callId: active.callId, receiverId: senderId, type: "OFFER", payload: JSON.stringify(offer) });
        return;
      }

      if (msg.type === "ICE_CANDIDATE") {
        const c = typeof msg.payload === "string" ? JSON.parse(msg.payload as string) : msg.payload;
        if (c?.candidate) await webrtcService.addIceCandidate(c);
        return;
      }

      if (msg.type === "OFFER") {
        const active = callRef.current;
        if (active.state === "idle") return;
        updateCall({ state: "active", peer: active.peer, type: active.type, callId });
        try { await webrtcService.startLocalMedia(active.type); } catch { webrtcService.reset(); updateCall({ state: "idle" }); return; }
        const pc = webrtcService.createPeerConnection();
        pc.onicecandidate = (e) => { if (e.candidate) websocketService.sendSignal({ callId, receiverId: senderId, type: "ICE_CANDIDATE", payload: JSON.stringify(e.candidate) }); };
        webrtcService.attachLocalTracks();
        const desc = typeof msg.payload === "string" ? JSON.parse(msg.payload as string) : msg.payload;
        await webrtcService.setRemoteDescription(desc);
        const answer = await webrtcService.createAnswer();
        websocketService.sendSignal({ callId, receiverId: senderId, type: "ANSWER", payload: JSON.stringify(answer) });
        return;
      }

      if (msg.type === "ANSWER") {
        const desc = typeof msg.payload === "string" ? JSON.parse(msg.payload as string) : msg.payload;
        await webrtcService.setRemoteDescription(desc);
        return;
      }

      if (["CALL_REJECT", "CALL_REJECTED", "CALL_END", "CALL_ENDED", "CALL_CANCELLED", "CALL_MISSED"].includes(msg.type)) {
        webrtcService.reset();
        updateCall({ state: "idle" });
      }
    });
    return unsub;
  }, [users]);

  const startCall = async (peer: User, type: CallType) => {
    if (callRef.current.state !== "idle" || !user.id || user.id === "0" || peer.id === user.id) return;
    try {
      const resp = await callApi.initiate(Number(peer.id), type);
      updateCall({ state: "outgoing", peer, type, callId: String(resp.callId) });
      websocketService.sendSignal({ callId: resp.callId, receiverId: Number(peer.id), type: "CALL_REQUEST", payload: JSON.stringify({ callType: type }) });
    } catch (err) { console.error("Failed to initiate call", err); }
  };

  const acceptCall = () => {
    const c = callRef.current;
    if (c.state !== "incoming") return;
    callApi.accept(c.callId).catch(console.error);
    websocketService.sendSignal({ callId: c.callId, receiverId: Number(c.peer.id), type: "CALL_ACCEPT", payload: JSON.stringify({ callType: c.type }) });
    updateCall({ state: "active", peer: c.peer, type: c.type, callId: c.callId });
  };

  const rejectCall = () => {
    const c = callRef.current;
    if (c.state !== "incoming") return;
    websocketService.sendSignal({ callId: c.callId, receiverId: Number(c.peer.id), type: "CALL_REJECT", payload: JSON.stringify({ callType: c.type }) });
    callApi.reject(c.callId).catch(console.error);
    webrtcService.reset(); updateCall({ state: "idle" });
  };

  const endCall = () => {
    const c = callRef.current;
    if (c.state !== "idle") {
      websocketService.sendSignal({ callId: c.callId, receiverId: Number(c.peer.id), type: "CALL_END", payload: "{}" });
      (c.state === "outgoing" ? callApi.cancel(c.callId) : callApi.end(c.callId)).catch(console.error);
    }
    webrtcService.reset(); updateCall({ state: "idle" });
  };

  return { call, startCall, acceptCall, rejectCall, endCall };
}