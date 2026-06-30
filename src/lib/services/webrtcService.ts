import type { CallType } from "@/lib/types";


const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  // TODO: add a TURN server before going past LAN / for symmetric-NAT peers.
};

type RemoteStreamHandler = (peerId: number, stream: MediaStream) => void;
type PeerClosedHandler = (peerId: number) => void;
type LocalStreamHandler = (stream: MediaStream) => void;
type FileTransferReceiveHandler = (transferId: string, file: File) => void;

interface FileTransferMeta {
  transferId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  messageId?: string | null;
  attachmentId?: string | null;
}

interface FileTransferRecord {
  transferId: string;
  peerId: number;
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  sendingFile?: File;
  sendingMeta?: FileTransferMeta;
  receivingMeta?: FileTransferMeta;
  receivedChunks: ArrayBuffer[];
  receivedBytes: number;
  remoteReady: boolean;
}

class WebRTCService {
  private localStream: MediaStream | null = null;
  private activeCallType: CallType | null = null;

  private peers = new Map<number, RTCPeerConnection>();
  private remoteStreams = new Map<number, MediaStream>();
  private pendingCandidates = new Map<number, RTCIceCandidateInit[]>();
  private fileTransfers = new Map<string, FileTransferRecord>();
  private filePendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private attachmentUrls = new Map<string, string>();

  private onRemoteStream: RemoteStreamHandler | null = null;
  private onPeerClosed: PeerClosedHandler | null = null;
  private onLocalStream: LocalStreamHandler | null = null;
  private fileReceivedHandlers = new Set<FileTransferReceiveHandler>();

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

  onFileReceived(cb: FileTransferReceiveHandler) {
    this.fileReceivedHandlers.add(cb);
    return () => {
      this.fileReceivedHandlers.delete(cb);
    };
  }

  hasFileTransfer(transferId: string) {
    return this.fileTransfers.has(transferId);
  }

  createFilePeerConnection(
    transferId: string,
    peerId: number,
    onIce: (candidate: RTCIceCandidate) => void,
    createDataChannel = false,
  ) {
    const existing = this.fileTransfers.get(transferId);
    if (existing) return existing.pc;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    const record: FileTransferRecord = {
      transferId,
      peerId,
      pc,
      dc: null,
      receivedChunks: [],
      receivedBytes: 0,
      remoteReady: false,
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) onIce(e.candidate);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.closeFileTransfer(transferId);
      }
    };

    pc.ondatachannel = (e) => {
      this.bindFileDataChannel(transferId, e.channel);
    };

    this.fileTransfers.set(transferId, record);

    if (createDataChannel) {
      const dc = pc.createDataChannel(`file-transfer:${transferId}`);
      this.bindFileDataChannel(transferId, dc);
    }

    return pc;
  }

  async createFileOffer(transferId: string) {
    const pc = this.fileTransfers.get(transferId)?.pc;
    if (!pc) throw new Error(`No file transfer peer connection for ${transferId}`);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async createFileAnswer(transferId: string) {
    const pc = this.fileTransfers.get(transferId)?.pc;
    if (!pc) throw new Error(`No file transfer peer connection for ${transferId}`);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async setFileRemoteDescription(transferId: string, desc: RTCSessionDescriptionInit) {
    const pc = this.fileTransfers.get(transferId)?.pc;
    if (!pc) throw new Error(`No file transfer peer connection for ${transferId}`);
    await pc.setRemoteDescription(desc);
    const queued = this.filePendingCandidates.get(transferId) ?? [];
    for (const c of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    }
    this.filePendingCandidates.delete(transferId);
  }

  async addFileIceCandidate(transferId: string, candidate: RTCIceCandidateInit) {
    const pc = this.fileTransfers.get(transferId)?.pc;
    if (!pc) return;
    if (!pc.remoteDescription) {
      const list = this.filePendingCandidates.get(transferId) ?? [];
      list.push(candidate);
      this.filePendingCandidates.set(transferId, list);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  primeOutgoingFileTransfer(
    transferId: string,
    peerId: number,
    file: File,
    meta: Partial<FileTransferMeta> = {},
  ) {
    const pc = this.createFilePeerConnection(transferId, peerId, () => {}, true);
    const record = this.fileTransfers.get(transferId);
    if (!record) return pc;
    record.sendingFile = file;
    record.sendingMeta = {
      transferId,
      fileName: meta.fileName ?? file.name,
      contentType: meta.contentType ?? file.type ?? "application/octet-stream",
      sizeBytes: meta.sizeBytes ?? file.size,
      messageId: meta.messageId ?? null,
      attachmentId: meta.attachmentId ?? null,
    };
    return pc;
  }

  markFileTransferReady(transferId: string) {
    const record = this.fileTransfers.get(transferId);
    if (!record) return;
    record.remoteReady = true;
    this.maybeSendFile(record);
  }

  setAttachmentFileUrl(keys: string[], file: File) {
    const url = URL.createObjectURL(file);
    keys.filter(Boolean).forEach((key) => this.attachmentUrls.set(key, url));
  }

  getAttachmentFileUrl(keys: string[]) {
    for (const key of keys) {
      const url = this.attachmentUrls.get(key);
      if (url) return url;
    }
    return null;
  }

  closeFileTransfer(transferId: string) {
    const record = this.fileTransfers.get(transferId);
    record?.dc?.close();
    record?.pc.close();
    this.fileTransfers.delete(transferId);
    this.filePendingCandidates.delete(transferId);
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
    this.fileTransfers.forEach((record) => {
      record.dc?.close();
      record.pc.close();
    });
    this.fileTransfers.clear();
    this.filePendingCandidates.clear();
    this.attachmentUrls.forEach((url) => URL.revokeObjectURL(url));
    this.attachmentUrls.clear();
    this.stopLocalMedia();
    this.onRemoteStream = null;
    this.onPeerClosed = null;
    this.onLocalStream = null;
    this.fileReceivedHandlers.clear();
  }

  private bindFileDataChannel(transferId: string, dc: RTCDataChannel) {
    const record = this.fileTransfers.get(transferId);
    if (!record) return;
    record.dc = dc;
    dc.binaryType = "arraybuffer";
    dc.onopen = () => {
      this.maybeSendFile(record);
    };
    dc.onmessage = async (event) => {
      if (typeof event.data === "string") {
        this.handleFileTransferControl(record, event.data);
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        record.receivedChunks.push(event.data);
        record.receivedBytes += event.data.byteLength;
        return;
      }

      if (event.data instanceof Blob) {
        const chunk = await event.data.arrayBuffer();
        record.receivedChunks.push(chunk);
        record.receivedBytes += chunk.byteLength;
      }
    };
  }

  private handleFileTransferControl(record: FileTransferRecord, raw: string) {
    let data: { kind?: string } & Partial<FileTransferMeta>;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (data.kind === "meta") {
      record.receivingMeta = {
        transferId: record.transferId,
        fileName: data.fileName ?? "Attachment",
        contentType: data.contentType ?? "application/octet-stream",
        sizeBytes: data.sizeBytes ?? 0,
        messageId: data.messageId ?? null,
        attachmentId: data.attachmentId ?? null,
      };
      return;
    }

    if (data.kind === "complete") {
      const meta = record.receivingMeta;
      if (!meta) return;
      const file = new File(record.receivedChunks, meta.fileName, {
        type: meta.contentType,
      });
      const keys = [
        record.transferId,
        meta.attachmentId ?? "",
        meta.messageId ?? "",
        `${meta.fileName}:${meta.sizeBytes}`,
      ];
      this.setAttachmentFileUrl(keys, file);
      this.fileReceivedHandlers.forEach((handler) =>
        handler(record.transferId, file),
      );
      record.receivedChunks = [];
      record.receivedBytes = 0;
    }
  }

  private maybeSendFile(record: FileTransferRecord) {
    if (!record.remoteReady || !record.sendingFile || !record.sendingMeta) return;
    const dc = record.dc;
    if (!dc || dc.readyState !== "open") return;
    const file = record.sendingFile;
    const meta = record.sendingMeta;
    record.remoteReady = false;
    this.setAttachmentFileUrl(
      [
        record.transferId,
        meta.attachmentId ?? "",
        meta.messageId ?? "",
        `${meta.fileName}:${meta.sizeBytes}`,
      ],
      file,
    );
    dc.send(
      JSON.stringify({
        kind: "meta",
        transferId: meta.transferId,
        fileName: meta.fileName,
        contentType: meta.contentType,
        sizeBytes: meta.sizeBytes,
        messageId: meta.messageId ?? null,
        attachmentId: meta.attachmentId ?? null,
      }),
    );
    void this.sendFileChunks(dc, record, file);
  }

  private async sendFileChunks(
    dc: RTCDataChannel,
    record: FileTransferRecord,
    file: File,
  ) {
    const chunkSize = 16 * 1024;
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const chunk = file.slice(offset, offset + chunkSize);
      const buffer = await chunk.arrayBuffer();
      dc.send(buffer);
    }
    dc.send(JSON.stringify({ kind: "complete", transferId: record.transferId }));
  }
}

export const webrtcService = new WebRTCService();
