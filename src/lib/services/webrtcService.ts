import type { CallType } from "@/lib/types";


const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  // TODO: add a TURN server before going past LAN / for symmetric-NAT peers.
};

type RemoteStreamHandler = (peerId: number, stream: MediaStream) => void;
type PeerClosedHandler = (peerId: number) => void;
type LocalStreamHandler = (stream: MediaStream) => void;

class WebRTCService {
  private localStream: MediaStream | null = null;
  private activeCallType: CallType | null = null;

  private peers = new Map<number, RTCPeerConnection>();
  private remoteStreams = new Map<number, MediaStream>();
  private pendingCandidates = new Map<number, RTCIceCandidateInit[]>();

  private onRemoteStream: RemoteStreamHandler | null = null;
  private onPeerClosed: PeerClosedHandler | null = null;
  private onLocalStream: LocalStreamHandler | null = null;

  // ---- local media -------------------------------------------------------

  async startLocalMedia(callType: CallType = "VIDEO") {
    if (this.localStream && this.activeCallType === callType) return this.localStream;
    this.stopLocalMedia();
    this.activeCallType = callType;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video:
          callType === "VIDEO"
            ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }
            : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      this.activeCallType = null;
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        throw new Error("Camera/microphone access was denied. Please allow permissions and try again.");
      }
      throw new Error("Could not access camera/microphone. Please check your device.");
    }
    this.onLocalStream?.(this.localStream);
    return this.localStream;
  }

  // ---- per-peer connections ---------------------------------------------

  /** Create (or return existing) connection to a remote peer. */
  createPeerConnection(peerId: number, onIce: (candidate: RTCIceCandidate) => void) {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_CONFIG);

    pc.onicecandidate = (e) => {
      if (e.candidate) onIce(e.candidate);
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      this.remoteStreams.set(peerId, stream);
      this.onRemoteStream?.(peerId, stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.closePeer(peerId);
      }
    };

    this.peers.set(peerId, pc);
    this.attachLocalTracks(peerId);
    return pc;
  }

  attachLocalTracks(peerId: number) {
    const pc = this.peers.get(peerId);
    if (!this.localStream || !pc) return;
    const senders = pc.getSenders();
    this.localStream.getTracks().forEach((track) => {
      if (!senders.some((sn) => sn.track?.id === track.id)) {
        pc.addTrack(track, this.localStream!);
      }
    });
  }

  async createOffer(peerId: number) {
    const pc = this.peers.get(peerId);
    if (!pc) throw new Error(`No peer connection for ${peerId}`);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(peerId: number) {
    const pc = this.peers.get(peerId);
    if (!pc) throw new Error(`No peer connection for ${peerId}`);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(peerId: number, desc: RTCSessionDescriptionInit) {
    const pc = this.peers.get(peerId);
    if (!pc) throw new Error(`No peer connection for ${peerId}`);
    await pc.setRemoteDescription(desc);
    const queued = this.pendingCandidates.get(peerId) ?? [];
    for (const c of queued) await pc.addIceCandidate(new RTCIceCandidate(c));
    this.pendingCandidates.delete(peerId);
  }

  async addIceCandidate(peerId: number, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(peerId);
    if (!pc) return;
    if (!pc.remoteDescription) {
      const list = this.pendingCandidates.get(peerId) ?? [];
      list.push(candidate);
      this.pendingCandidates.set(peerId, list);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  hasPeer(peerId: number) {
    return this.peers.has(peerId);
  }

  closePeer(peerId: number) {
    this.peers.get(peerId)?.close();
    this.peers.delete(peerId);
    this.remoteStreams.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.onPeerClosed?.(peerId);
  }

  // ---- accessors / device toggles ---------------------------------------

  getLocalStream() {
    return this.localStream;
  }
  getRemoteStream(peerId: number) {
    return this.remoteStreams.get(peerId) ?? null;
  }
  getRemoteStreams() {
    return new Map(this.remoteStreams);
  }

  setMicrophoneEnabled(on: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = on));
  }
  setCameraEnabled(on: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = on));
  }

  setOnRemoteStream(cb: RemoteStreamHandler) {
    this.onRemoteStream = cb;
  }
  setOnPeerClosed(cb: PeerClosedHandler) {
    this.onPeerClosed = cb;
  }
  setOnLocalStream(cb: LocalStreamHandler) {
    this.onLocalStream = cb;
    if (this.localStream) cb(this.localStream);
  }

  // ---- teardown ----------------------------------------------------------

  stopLocalMedia() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.activeCallType = null;
  }

  reset() {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();
    this.stopLocalMedia();
    this.onRemoteStream = null;
    this.onPeerClosed = null;
    this.onLocalStream = null;
  }
}

export const webrtcService = new WebRTCService();