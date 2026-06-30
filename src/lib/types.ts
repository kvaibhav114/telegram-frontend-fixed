export type ChatType = "PRIVATE" | "GROUP" | "CHANNEL";
export type MessageType = "TEXT" | "VOICE" | "FILE" | "SYSTEM";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
export type CallType = "VOICE" | "VIDEO";
export type CallStatus = "RINGING" | "ACTIVE" | "ENDED" | "REJECTED" | "MISSED" | "CANCELLED";
export type FileTransferStatus = "PENDING" | "ACCEPTED" | "TRANSFERRING" | "COMPLETED" | "REJECTED" | "CANCELLED" | "FAILED";
export type NotificationType = "NEW_MESSAGE" | "REPLY" | "USER_JOINED_CHAT" | "USER_LEFT_CHAT" | "CALL_INCOMING" | "CALL_MISSED";


export type ParticipantRole = "CREATOR" | "MEMBER";
export type ParticipantStatus = "INVITED" | "RINGING" | "JOINED" | "LEFT" | "REJECTED";

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

export interface ChatMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  role: MemberRole;
  isOnline: boolean;
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  description: string;
  avatarUrl: string;
  inviteLink: string | null;
  members: ChatMember[];
  lastMessage: string;
  lastTime: string;
  unread: number;
  typing: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string;
  type: MessageType;
  content: string;
  attachments: Attachment[];
  replyToId: string | null;
  replyToContent: string | null;
  isEdited: boolean;
  createdAt: string;
  status: "sent" | "delivered" | "read";
}

export interface Attachment {
  id: string | null;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  fileUrl: string | null;
  transferId: string | null;
}

export interface PinnedMessage {
  id: number;
  chatId: number;
  message: Message;
  pinnedById: number;
  pinnedByName: string;
  pinnedAt: string;
}

export interface Notification {
  id: number;
  actorId: number;
  actorName: string;
  type: NotificationType;
  referenceId: number;
  chatId: number | null;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export type StoryMediaType = "IMAGE" | "VIDEO";

export interface Story {
  id: number;
  userId: number;
  username: string;
  avatarUrl: string | null;
  mediaUrl: string;
  caption: string | null;
  type: StoryMediaType;
  createdAt: string;
  expiresAt: string;
  viewerCount: number;
  viewed: boolean;
}

export interface StoryFeedItem {
  userId: number;
  username: string;
  avatarUrl: string | null;
  hasUnseenStories: boolean;
  stories: Story[];
}

export interface StoryViewerEntry {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  viewedAt: string;
}

export interface CallParticipant {
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: ParticipantStatus;
  role: ParticipantRole;
  muted: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  self: boolean;
  stream?: MediaStream; // remote media; undefined for self (use local stream)
}

export type CallState =
  | { state: "idle" }
  | {
      state: "incoming";
      callId: string;
      type: CallType;
      creatorId: string;
      creatorName: string;
      creatorAvatarUrl: string | null;
      participants: CallParticipant[];
    }
  | {
      state: "outgoing";
      callId: string;
      type: CallType;
      creatorId: string;
      participants: CallParticipant[];
    }
  | {
      state: "active";
      callId: string;
      type: CallType;
      creatorId: string;
      participants: CallParticipant[];
    };
