import { apiFetch } from "./apiClient";
import type { CallType, CallStatus } from "../types";

export type ParticipantRole = "CREATOR" | "MEMBER";
export type ParticipantStatus = "INVITED" | "RINGING" | "JOINED" | "LEFT" | "REJECTED";

export interface ParticipantResponse {
  userId: number;
  name: string;
  avatarUrl: string | null;
  role: ParticipantRole;
  status: ParticipantStatus;
  muted: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
}

export interface CallResponse {
  callId: number;
  creatorId: number;
  creatorName: string;
  creatorAvatarUrl: string | null;
  callType: CallType;
  status: CallStatus;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  participants: ParticipantResponse[];
}

export const callApi = {
  // Was POST /api/calls/initiate { receiverId }. Now group endpoint.
  initiate: (participantIds: number[], callType: CallType) =>
    apiFetch<CallResponse>("/api/calls/group", {
      method: "POST",
      body: JSON.stringify({ participantIds, callType }),
    }),

  accept: (callId: number | string) =>
    apiFetch<CallResponse>(`/api/calls/${callId}/accept`, { method: "POST" }),

  reject: (callId: number | string) =>
    apiFetch<CallResponse>(`/api/calls/${callId}/reject`, { method: "POST" }),

  cancel: (callId: number | string) =>
    apiFetch<CallResponse>(`/api/calls/${callId}/cancel`, { method: "POST" }),

  end: (callId: number | string) =>
    apiFetch<CallResponse>(`/api/calls/${callId}/end`, { method: "POST" }),

  getCall: (callId: number | string) =>
    apiFetch<CallResponse>(`/api/calls/${callId}`),

  getHistory: (page = 0, size = 20) =>
    apiFetch<CallResponse[]>(`/api/calls/history?page=${page}&size=${size}`),
};