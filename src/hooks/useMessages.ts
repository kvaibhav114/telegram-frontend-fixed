import { useEffect, useState, type MutableRefObject } from "react";
import type { Chat, Message, User } from "@/lib/types";
import { messageApi } from "@/lib/api/messageApi";
import { chatApi } from "@/lib/api/chatApi";
import { websocketService } from "@/lib/services/websocketService";
import { mapMessage } from "@/lib/mappers";
import { formatLocalTime } from "@/lib/time";
import { webrtcService } from "@/lib/services/webrtcService";
import type { FileTransferResponse } from "@/lib/api/messageApi";
import type { WsEvent } from "@/lib/services/websocketService";

type SetChats = (fn: Chat[] | ((prev: Chat[]) => Chat[])) => void;

export function useMessageState(
  userRef: MutableRefObject<User>,
  setChats: SetChats,
) {
  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, Message[]>
  >({});

  useEffect(() => {
    const onTransferEvent = async (event: WsEvent) => {
      const payload = (event.payload ?? {}) as Partial<FileTransferResponse>;
      const transferId = String(
        payload.transferId ?? event.transferId ?? event.callId ?? "",
      );
      if (!transferId) return;

      if (event.type === "FILE_TRANSFER_OFFER") {
        const peerId = Number(payload.senderId ?? event.senderId ?? 0);
        if (!peerId) return;
        webrtcService.markFileTransferReady(transferId);
        if (!webrtcService.hasFileTransfer(transferId)) {
          webrtcService.createFilePeerConnection(
            transferId,
            peerId,
            (candidate) => {
              websocketService.sendFileTransferSignal({
                transferId,
                receiverId: peerId,
                type: "ICE_CANDIDATE",
                payload: JSON.stringify(candidate),
              });
            },
            false,
          );
        }
        return;
      }

      if (event.type === "FILE_TRANSFER_ACCEPTED") {
        webrtcService.markFileTransferReady(transferId);
        return;
      }

      if (
        event.type === "FILE_TRANSFER_REJECTED" ||
        event.type === "FILE_TRANSFER_CANCELLED" ||
        event.type === "FILE_TRANSFER_COMPLETED"
      ) {
        webrtcService.closeFileTransfer(transferId);
      }
    };

    const onTransferSignal = async (event: WsEvent) => {
      const payload =
        typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
      const transferId = String(
        (payload as Record<string, unknown> | undefined)?.transferId ??
          event.transferId ??
          event.callId ??
          "",
      );
      const peerId = Number(event.senderId ?? event.receiverId ?? 0);
      if (!transferId || !peerId) return;

      if (event.type === "OFFER") {
        if (!webrtcService.hasFileTransfer(transferId)) {
          webrtcService.createFilePeerConnection(
            transferId,
            peerId,
            (candidate) => {
              websocketService.sendFileTransferSignal({
                transferId,
                receiverId: peerId,
                type: "ICE_CANDIDATE",
                payload: JSON.stringify(candidate),
              });
            },
            false,
          );
        }
        const desc =
          typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
        await webrtcService.setFileRemoteDescription(
          transferId,
          desc as RTCSessionDescriptionInit,
        );
        const answer = await webrtcService.createFileAnswer(transferId);
        websocketService.sendFileTransferSignal({
          transferId,
          receiverId: peerId,
          type: "ANSWER",
          payload: JSON.stringify(answer),
        });
        return;
      }

      if (event.type === "ANSWER") {
        const desc =
          typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
        await webrtcService.setFileRemoteDescription(
          transferId,
          desc as RTCSessionDescriptionInit,
        );
        webrtcService.markFileTransferReady(transferId);
        return;
      }

      if (event.type === "ICE_CANDIDATE") {
        const candidate =
          typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
        if (candidate && typeof candidate === "object" && "candidate" in candidate) {
          await webrtcService.addFileIceCandidate(
            transferId,
            candidate as RTCIceCandidateInit,
          );
        }
      }
    };

    const unsubEvent = websocketService.onFileTransferEvent(onTransferEvent);
    const unsubSignal = websocketService.onFileTransferSignal(onTransferSignal);
    return () => {
      unsubEvent();
      unsubSignal();
    };
  }, []);

  const getMessages = (chatId: string) => messagesByChat[chatId] ?? [];

  const loadMessages = async (chatId: string): Promise<Message[]> => {
    try {
      const history = await messageApi.getChatMessages(chatId);
      const msgs = history.map(mapMessage).reverse();
      setMessagesByChat((prev) => ({ ...prev, [chatId]: msgs }));
      return msgs;
    } catch {
      return messagesByChat[chatId] ?? [];
    }
  };

  const subscribeChat = (chatId: string, cb: (msgs: Message[]) => void) => {
    return websocketService.subscribeToChat(chatId, (event) => {
      const payload = event.payload;
      if (!payload) return;

      setMessagesByChat((prev) => {
        const current = prev[chatId] ?? [];
        let next = current;

        if (event.type === "NEW_MESSAGE") {
          const msg = mapMessage(payload);
          next = current.some((m) => m.id === msg.id)
            ? current
            : [...current, msg];
          setChats((cs) =>
            cs.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    lastMessage: msg.content,
                    lastTime: formatLocalTime(msg.createdAt),
                    unread:
                      msg.senderId !== userRef.current.id
                        ? c.unread + 1
                        : c.unread,
                  }
                : c,
            ),
          );
        } else if (event.type === "MESSAGE_EDITED") {
          const msgId = String(payload.id);
          next = current.map((m) =>
            m.id === msgId
              ? { ...m, content: payload.content, isEdited: true }
              : m,
          );
        } else if (event.type === "MESSAGE_DELETED") {
          const msgId = String((payload as any).messageId || payload.id);
          next = current.filter((m) => m.id !== msgId);
        } else if (event.type === "MESSAGE_READ") {
          // Backend payload: { chatId, messageId, readByUserId }
          // The reader (other user) has read every message up to messageId.
          // Flip status to "read" on our own messages with id <= messageId.
          const p = payload as any;
          const readByUserId = String(p.readByUserId);
          const upToId = Number(p.messageId);
          const me = userRef.current.id;
          if (readByUserId !== me && !Number.isNaN(upToId)) {
            next = current.map((m) =>
              m.senderId === me && Number(m.id) <= upToId && m.status !== "read"
                ? { ...m, status: "read" }
                : m,
            );
          }
        } else if (event.type === "TYPING") {
          const p = payload as any;
          // Ignore our own typing event — we're subscribed to the same /topic
          if (String(p?.userId) === userRef.current.id) {
            cb(next);
            return prev;
          }
          const isTyping = Boolean(p?.isTyping ?? true);
          setChats((cs) =>
            cs.map((c) => (c.id === chatId ? { ...c, typing: isTyping } : c)),
          );
        }

        cb(next);
        return { ...prev, [chatId]: next };
      });
    });
  };

  const sendMessage = (chatId: string, text: string, replyToId?: string) =>
    websocketService.sendMessage(chatId, text, replyToId);

  const sendFile = async (chatId: string, file: File) => {
    const response = await messageApi.sendFile(Number(chatId), file);

    if ("attachments" in response) {
      return;
    }

    if ("status" in response) {
      const transferId = String(response.transferId ?? "");
      const peerId = Number(response.receiverId ?? 0);
      if (!transferId || !peerId) return;

      webrtcService.createFilePeerConnection(
        transferId,
        peerId,
        (candidate) => {
          websocketService.sendFileTransferSignal({
            transferId,
            receiverId: peerId,
            type: "ICE_CANDIDATE",
            payload: JSON.stringify(candidate),
          });
        },
        true,
      );
      webrtcService.primeOutgoingFileTransfer(transferId, peerId, file, {
        fileName: response.originalFileName ?? response.fileName ?? file.name,
        contentType: response.contentType ?? response.mimeType ?? file.type,
        sizeBytes: response.fileSize ?? response.sizeBytes ?? file.size,
        messageId:
          response.messageId != null ? String(response.messageId) : null,
        attachmentId:
          response.attachmentId != null ? String(response.attachmentId) : null,
      });

      const offer = await webrtcService.createFileOffer(transferId);
      websocketService.sendFileTransferSignal({
        transferId,
        receiverId: peerId,
        type: "OFFER",
        payload: JSON.stringify(offer),
      });
      return;
    }
  };

  const sendTyping = (chatId: string, isTyping: boolean) =>
    websocketService.sendTyping(chatId, isTyping);

  const markAsRead = (chatId: string, messageId: string) =>
    websocketService.markAsRead(chatId, messageId);

  const editMessage = async (messageId: string, content: string) => {
    await messageApi.editMessage(Number(messageId), content);
  };

  const deleteMessage = async (messageId: string, chatId: string) => {
    await messageApi.deleteMessage(messageId);
    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] ?? []).filter((m) => m.id !== messageId),
    }));
  };

  const pinMessage = async (chatId: string, messageId: string) => {
    await chatApi.pinMessage(chatId, messageId);
  };

  const unpinMessage = async (chatId: string, messageId: string) => {
    await chatApi.unpinMessage(chatId, messageId);
  };

  return {
    getMessages,
    loadMessages,
    subscribeChat,
    sendMessage,
    sendFile,
    sendTyping,
    markAsRead,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
  };
}
