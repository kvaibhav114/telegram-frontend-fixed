// ── Enums (matching backend) ──────────────────────────────────────────

export type ChatType = "PRIVATE" | "GROUP" | "CHANNEL";
export type MessageType = "TEXT" | "VOICE" | "FILE" | "SYSTEM";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
export type CallType = "VOICE" | "VIDEO";
export type CallStatus = "RINGING" | "ACTIVE" | "ENDED" | "REJECTED" | "MISSED" | "CANCELLED";

// ── Frontend models ──────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  description: string;
  avatarUrl: string;
  members: ChatMember[];
  lastMessage: string;
  lastTime: string;
  unread: number;
  typing: boolean;
}

export interface ChatMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  role: MemberRole;
  isOnline: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string;
  type: MessageType;
  content: string;
  replyToId: string | null;
  replyToContent: string | null;
  isEdited: boolean;
  createdAt: string;
  status: "sent" | "delivered" | "read";
}

// ── Call state ────────────────────────────────────────────────────────

export type CallState =
  | { state: "idle" }
  | { state: "incoming"; peer: User; type: CallType; callId: string }
  | { state: "outgoing"; peer: User; type: CallType; callId: string }
  | { state: "active"; peer: User; type: CallType; callId: string };
