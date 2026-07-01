
import type { Chat, Message, User } from "@/lib/types";
import type { AttachmentResponse, ChatResponse, MessageResponse } from "@/lib/api/chatApi";
import type { UserProfileResponse } from "@/lib/api/userApi";
import { formatLocalTime } from "@/lib/time";

function s(value: unknown): string {
  return String(value ?? "");
}



export function mapUser(p: UserProfileResponse): User {
  const id = s(p.id);
  return {
    id,
    username: p.username ?? "",
    displayName: p.displayName ?? p.username ?? `User ${id}`,
    email: p.email ?? "",
    bio: p.bio ?? "",
    avatarUrl: p.avatarUrl ?? `https://i.pravatar.cc/150?u=${id}`,
    isOnline: p.isOnline ?? false,
    lastSeenAt: p.lastSeenAt ?? null,
  };
}

export function mapMessage(r: MessageResponse): Message {
  return {
    id: s(r.id),
    chatId: s(r.chatId),
    senderId: s(r.senderId),
    senderName: r.senderName ?? "",
    senderAvatarUrl: r.senderAvatarUrl ?? `https://i.pravatar.cc/150?u=${r.senderId}`,
    type: r.type ?? "TEXT",
    content: r.content ?? "",
    attachments: r.attachments?.map(mapAttachment),
    replyToId: r.replyToId ? s(r.replyToId) : null,
    replyToContent: r.replyToContent ?? null,
    isEdited: r.isEdited ?? false,
    createdAt: r.createdAt ?? new Date().toISOString(),
    status: "sent",
  };
}

function mapAttachment(r: AttachmentResponse) {
  return {
    id: r.id != null ? s(r.id) : null,
    fileName: r.fileName ?? "Attachment",
    mimeType: r.mimeType ?? null,
    fileSize: r.fileSize ?? null,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
  };
}

export function mapChat(c: ChatResponse, meId: string): Chat {
  const other = c.type === "PRIVATE"
    ? c.members.find((m) => s(m.userId) !== meId)
    : null;

  return {
    id: s(c.id),
    type: c.type,
    title: c.type === "PRIVATE"
      ? (other?.displayName ?? "Unknown")
      : (c.title ?? "Group"),
    description: c.description ?? "",
    avatarUrl: c.type === "PRIVATE"
      ? (other?.avatarUrl ?? `https://i.pravatar.cc/150?u=${other?.userId}`)
      : (c.avatarUrl ?? ""),
    inviteLink: c.inviteLink ?? null,
    members: c.members.map((m) => ({
      userId: s(m.userId),
      username: m.username,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl ?? `https://i.pravatar.cc/150?u=${m.userId}`,
      role: m.role,
      isOnline: m.isOnline,
    })),
    lastMessage: c.lastMessage?.content ?? "",
    lastTime: formatLocalTime(c.lastMessage?.createdAt),
    unread: c.unreadCount ?? 0,
    typing: false,
  };
}
