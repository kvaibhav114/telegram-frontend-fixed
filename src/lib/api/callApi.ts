import { apiFetch } from "./apiClient";
import type { CallType, CallStatus } from "../types";

export interface CallResponse {
  callId: number;
  callerId: number;
  callerName: string;
  callerAvatarUrl: string | null;
  receiverId: number;
  receiverName: string;
  receiverAvatarUrl: string | null;
  callType: CallType;
  status: CallStatus;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
}

export const callApi = {
  initiate: (receiverId: number, callType: CallType) =>
    apiFetch<CallResponse>("/api/calls/initiate", {
      method: "POST",
      body: JSON.stringify({ receiverId, callType }),
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
