import type { CallType } from "@/lib/types";

class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;

  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;

  private pendingCandidates: RTCIceCandidateInit[] = [];
  private activeCallType: CallType | null = null;

  async startLocalMedia(callType: CallType = "VIDEO") {
    if (this.localStream && this.activeCallType === callType)
      return this.localStream;
    this.stopLocalMedia();
    this.activeCallType = callType;
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video:
        callType === "VIDEO"
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 24 },
            }
          : false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return this.localStream;
  }

  createPeerConnection() {
    this.peerConnection?.close();
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (e) => {
      this.remoteStream = e.streams[0];

      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(e.streams[0]);
      }
    };

    return this.peerConnection;
  }

  attachLocalTracks() {
    if (!this.localStream || !this.peerConnection) return;

    const senders = this.peerConnection.getSenders();

    this.localStream.getTracks().forEach((track) => {
      const exists = senders.some((sender) => sender.track?.id === track.id);

      if (!exists) {
        this.peerConnection!.addTrack(track, this.localStream!);
      }
    });
  }

  async createOffer() {
    if (!this.peerConnection) throw new Error("No peer connection");
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer() {
    if (!this.peerConnection) throw new Error("No peer connection");
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    if (!this.peerConnection) throw new Error("No peer connection");
    await this.peerConnection.setRemoteDescription(desc);
    for (const c of this.pendingCandidates) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(c));
    }
    this.pendingCandidates = [];
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;
    if (!this.peerConnection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  getLocalStream() {
    return this.localStream;
  }
  getRemoteStream() {
    return this.remoteStream;
  }
  getPeerConnection() {
    return this.peerConnection;
  }

  setMicrophoneEnabled(on: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = on;
    });
  }

  setOnRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  setCameraEnabled(on: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = on;
    });
  }

  stopLocalMedia() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.activeCallType = null;
  }

  reset() {
    this.stopLocalMedia();
    this.peerConnection?.close();
    this.peerConnection = null;
    this.remoteStream = null;
    this.pendingCandidates = [];
  }
}

export const webrtcService = new WebRTCService();
