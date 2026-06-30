import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { CallState, CallType, User, CallParticipant } from "@/lib/types";
import type { CallResponse, ParticipantResponse } from "@/lib/api/callApi";
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
  const updateCall = (next: CallState) => {
    callRef.current = next;
    setCall(next);
  };

  const myId = () => Number(userRef.current.id);

  // Map a backend ParticipantResponse → local CallParticipant.
  const toLocalParticipant = (p: ParticipantResponse, meId: number): CallParticipant => ({
    userId: String(p.userId),
    name: p.name,
    avatarUrl: p.avatarUrl,
    status: p.status,
    role: p.role,
    muted: p.muted,
    cameraEnabled: p.cameraEnabled,
    screenSharing: p.screenSharing,
    self: p.userId === meId,
    stream: webrtcService.getRemoteStream(p.userId) ?? undefined,
  });

  const mapParticipants = (resp: CallResponse, meId: number) =>
    resp.participants.map((p) => toLocalParticipant(p, meId));

  // ── outgoing media setup to a single peer (mesh edge) ──────────────────
  const connectToPeer = async (peerId: number, type: CallType, shouldOffer: boolean) => {
    if (peerId === myId() || webrtcService.hasPeer(peerId)) return;
    await webrtcService.startLocalMedia(type);
    webrtcService.createPeerConnection(peerId, (candidate) => {
      websocketService.sendSignal({
        callId: callRef.current.state !== "idle" ? callRef.current.callId : "",
        receiverId: peerId,
        type: "ICE_CANDIDATE",
        payload: JSON.stringify(candidate),
      });
    });
    if (shouldOffer) {
      const offer = await webrtcService.createOffer(peerId);
      websocketService.sendSignal({
        callId: callRef.current.state !== "idle" ? callRef.current.callId : "",
        receiverId: peerId,
        type: "OFFER",
        payload: JSON.stringify(offer),
      });
    }
  };

  // When we (re)enter active state, mesh-connect to every other JOINED peer.
  const meshConnectJoined = async (participants: CallParticipant[], type: CallType) => {
    const me = myId();
    for (const p of participants) {
      const pid = Number(p.userId);
      if (pid === me || p.status !== "JOINED") continue;
      // higher id offers → exactly one offerer per pair
      await connectToPeer(pid, type, me > pid);
    }
  };

  // ── lifecycle events on /queue/calls ───────────────────────────────────
  useEffect(() => {
    const unsubCalls = websocketService.onCallEvent(async (msg) => {
      const resp = msg.payload as CallResponse | undefined;
      const me = myId();

      switch (msg.type) {
        case "INCOMING_CALL": {
          if (!resp || callRef.current.state !== "idle") return;
          updateCall({
            state: "incoming",
            callId: String(resp.callId),
            type: resp.callType,
            creatorId: String(resp.creatorId),
            creatorName: resp.creatorName,
            creatorAvatarUrl: resp.creatorAvatarUrl,
            participants: mapParticipants(resp, me),
          });
          return;
        }
        case "PARTICIPANT_JOINED":
        case "PARTICIPANT_LEFT":
        case "PARTICIPANT_REJECTED": {
          const c = callRef.current;
          if (!resp || c.state === "idle" || String(resp.callId) !== c.callId) return;
          const participants = mapParticipants(resp, me);

          // Creator: first remote JOINED promotes outgoing → active.
          const nextState: CallState["state"] =
            c.state === "outgoing" && msg.type === "PARTICIPANT_JOINED" ? "active" : c.state;

          updateCall({ ...c, state: nextState, participants } as CallState);

          if (nextState === "active") {
            if (msg.type === "PARTICIPANT_JOINED") {
              await meshConnectJoined(participants, c.type);
            } else {
              // someone left/rejected → tear down their edge
              resp.participants
                .filter((p) => p.status === "LEFT" || p.status === "REJECTED")
                .forEach((p) => webrtcService.closePeer(p.userId));
            }
          }
          return;
        }
        case "CALL_ENDED":
        case "CALL_CANCELLED":
        case "CALL_MISSED": {
          const c = callRef.current;
          if (c.state === "idle" || (resp && String(resp.callId) !== c.callId)) return;
          webrtcService.reset();
          updateCall({ state: "idle" });
          return;
        }
        default:
          return;
      }
    });
    return unsubCalls;
  }, [users]);

  // ── WebRTC media signaling on /queue/signal ────────────────────────────
  useEffect(() => {
    const unsubSignal = websocketService.onSignal(async (msg) => {
      const c = callRef.current;
      if (c.state === "idle") return;

      const senderId = Number(msg.senderId ?? 0);
      if (!senderId) return;
      const type = c.type;

      if (msg.type === "OFFER") {
        // Ensure a connection exists (we are the answerer for this edge).
        if (!webrtcService.hasPeer(senderId)) {
          await connectToPeer(senderId, type, /* shouldOffer */ false);
        }
        const desc = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
        await webrtcService.setRemoteDescription(senderId, desc);
        const answer = await webrtcService.createAnswer(senderId);
        websocketService.sendSignal({
          callId: c.callId,
          receiverId: senderId,
          type: "ANSWER",
          payload: JSON.stringify(answer),
        });
        return;
      }

      if (msg.type === "ANSWER") {
        const desc = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
        await webrtcService.setRemoteDescription(senderId, desc);
        return;
      }

      if (msg.type === "ICE_CANDIDATE") {
        const cand = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
        if (cand?.candidate) await webrtcService.addIceCandidate(senderId, cand);
        return;
      }
    });
    return unsubSignal;
  }, [users]);

  // ── Clean up active call when the tab/window closes ────────────────────
  useEffect(() => {
    const cleanup = () => {
      const c = callRef.current;
      if (c.state === "idle") return;
      const endpoint = c.state === "outgoing" ? "cancel" : "end";
      const token = localStorage.getItem("telegrok.authToken");
      fetch(`/api/calls/${c.callId}/${endpoint}`, {
        method: "POST",
        keepalive: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => {});
      webrtcService.reset();
    };
    window.addEventListener("beforeunload", cleanup);
    return () => window.removeEventListener("beforeunload", cleanup);
  }, []);

  // ── actions ─────────────────────────────────────────────────────────────
  const startCall = async (peers: User[], type: CallType) => {
    if (callRef.current.state !== "idle") return;
    const me = userRef.current;
    if (!me.id || me.id === "0") return;
    const ids = peers.map((p) => Number(p.id)).filter((id) => id && String(id) !== me.id);
    if (ids.length === 0) return;
    try {
      const resp = await callApi.initiate(ids, type);
      // We are auto-JOINED by the backend; start our local media now.
      await webrtcService.startLocalMedia(type);
      updateCall({
        state: "outgoing",
        callId: String(resp.callId),
        type,
        creatorId: String(resp.creatorId),
        participants: mapParticipants(resp, Number(me.id)),
      });
    } catch (err) {
      console.error("Failed to initiate call", err);
      webrtcService.reset();
    }
  };

  const acceptCall = async () => {
    const c = callRef.current;
    if (c.state !== "incoming") return;
    try {
      const resp = await callApi.accept(c.callId);
      await webrtcService.startLocalMedia(c.type);
      const participants = mapParticipants(resp, myId());
      updateCall({
        state: "active",
        callId: c.callId,
        type: c.type,
        creatorId: c.creatorId,
        participants,
      });
      await meshConnectJoined(participants, c.type);
    } catch (err) {
      console.error("Failed to accept call", err);
      webrtcService.reset();
      updateCall({ state: "idle" });
    }
  };

  const rejectCall = () => {
    const c = callRef.current;
    if (c.state !== "incoming") return;
    callApi.reject(c.callId).catch(console.error);
    webrtcService.reset();
    updateCall({ state: "idle" });
  };

  const endCall = () => {
    const c = callRef.current;
    if (c.state !== "idle") {
      (c.state === "outgoing" ? callApi.cancel(c.callId) : callApi.end(c.callId)).catch(console.error);
    }
    webrtcService.reset();
    updateCall({ state: "idle" });
  };

  return { call, startCall, acceptCall, rejectCall, endCall };
}