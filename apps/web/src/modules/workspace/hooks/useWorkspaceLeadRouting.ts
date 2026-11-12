import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../../lib/api-client/index.js';

export interface WorkShiftMember {
  id: string;
  workspaceMemberId: string;
  leadCapacity: number;
  isShiftManager: boolean;
  workspaceMember?: { userId: string; user: { fullName: string; email: string; status: string } };
}

export interface WorkShift {
  id: string;
  workspaceId: string;
  name: string;
  startTime: string;
  endTime: string;
  timezone: string;
  weekdays: number[];
  isActive: boolean;
  usedAt: string | null;
  members: WorkShiftMember[];
}

export interface StaffRoutingStatus {
  workspaceMemberId: string;
  userId: string;
  fullName: string;
  email: string;
  shifts: string[];
  shiftIds: string[];
  isShiftManager: boolean;
  assignmentLocked: boolean;
  isOnShift: boolean;
  isEligible: boolean;
  isAvailable: boolean;
  hasOvertimeConsent: boolean;
  overtimeConsentUntil: string | null;
  openConversations: number;
  effectiveCapacity: number;
  activeLeaveExceptionId: string | null;
}

export interface LeadQueueItem {
  id: string;
  conversationId: string;
  reason: string;
  priority: number;
  queuedAt: string;
  escalationLevel: number;
  conversation: { id: string; snippet?: string | null; customer?: { fullName?: string | null } | null };
}

export const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function useWorkspaceLeadRouting(workspaceId: string) {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [roster, setRoster] = useState<StaffRoutingStatus[]>([]);
  const [queue, setQueue] = useState<LeadQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentWorkspaceId = useRef(workspaceId);

  useEffect(() => {
    currentWorkspaceId.current = workspaceId;
    setShifts([]);
    setRoster([]);
    setQueue([]);
  }, [workspaceId]);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    const requestedWorkspaceId = workspaceId;
    setIsLoading(true);
    try {
      const requestOptions = { headers: { 'x-workspace-id': requestedWorkspaceId }, skipToast: true };
      const [shiftResult, rosterResult, queueResult] = await Promise.allSettled([
        apiClient.get<WorkShift[]>('/workspaces/current/shifts', requestOptions),
        apiClient.get<StaffRoutingStatus[]>('/workspaces/current/staff-roster', requestOptions),
        apiClient.get<LeadQueueItem[]>('/workspaces/current/lead-queue', requestOptions),
      ]);
      if (currentWorkspaceId.current !== requestedWorkspaceId) return;
      if (shiftResult.status === 'fulfilled') setShifts(shiftResult.value);
      if (rosterResult.status === 'fulfilled') setRoster(rosterResult.value);
      if (queueResult.status === 'fulfilled') setQueue(queueResult.value);
    } finally {
      if (currentWorkspaceId.current === requestedWorkspaceId) setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);

  const createShift = async (data: Partial<WorkShift>) => {
    const result = await apiClient.post('/workspaces/current/shifts', data, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
    return result;
  };
  const updateShift = async (id: string, data: Partial<WorkShift>) => {
    const result = await apiClient.patch(`/workspaces/current/shifts/${id}`, data, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
    return result;
  };
  const deleteShift = async (id: string) => {
    const result = await apiClient.delete(`/workspaces/current/shifts/${id}`, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
    return result;
  };
  const replaceMembers = async (id: string, members: Array<{ workspaceMemberId: string; leadCapacity: number; isShiftManager: boolean }>) => {
    const result = await apiClient.put(`/workspaces/current/shifts/${id}/members`, { members }, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
    return result;
  };
  const setAssignmentLock = async (memberId: string, locked: boolean, handoverMode?: 'QUEUE' | 'TRANSFER', targetMemberId?: string) => {
    const result = await apiClient.patch<{ overCapacity?: boolean; handedOverCount?: number }>(`/workspaces/current/staff/${memberId}/assignment-lock`, { locked, handoverMode, targetMemberId }, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
    return result;
  };
  const recordUnexpectedLeave = async (shiftId: string, memberId: string, mode: 'QUEUE' | 'TRANSFER', assigneeId?: string, note?: string) => {
    const result = await apiClient.post<{ overCapacity?: boolean }>(`/workspaces/current/shifts/${shiftId}/members/${memberId}/unexpected-leave`, { mode, assigneeId, note }, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
    return result;
  };
  const endUnexpectedLeave = async (exceptionId: string) => {
    await apiClient.post(`/workspaces/current/availability-exceptions/${exceptionId}/end`, {}, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
  };
  const claimLead = async (conversationId: string) => {
    await apiClient.post(`/workspaces/current/lead-queue/${conversationId}/claim`, {}, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
  };
  const handoverLead = async (conversationId: string, targetMemberId?: string | null) => {
    await apiClient.post(`/workspaces/current/conversations/${conversationId}/handover`, { targetMemberId }, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
  };
  const offboardMember = async (memberId: string, mode: 'QUEUE' | 'TRANSFER', targetMemberId?: string) => {
    const result = await apiClient.post<{
      success: boolean;
      handedOverCount: number;
      mode: 'QUEUE' | 'TRANSFER';
      overCapacity: boolean;
    }>(`/workspaces/current/staff/${memberId}/offboard`, { mode, targetMemberId }, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
    return result;
  };
  const handoverMemberOpen = async (memberId: string, mode: 'QUEUE' | 'TRANSFER', targetMemberId?: string) => {
    const result = await apiClient.post<{ handedOverCount: number; overCapacity?: boolean }>(`/workspaces/current/staff/${memberId}/handover-open`, { mode, targetMemberId }, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
    return result;
  };
  const recordOvertimeConsent = async (shiftId: string, startsAt: string, endsAt: string) => {
    const result = await apiClient.post('/workspaces/current/shifts/' + shiftId + '/overtime-consent', { startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() }, { headers: { 'x-workspace-id': workspaceId } });
    await refresh();
    return result;
  };

  return {
    shifts, roster, queue, isLoading, refresh, createShift, updateShift, deleteShift,
    replaceMembers, setAssignmentLock, recordUnexpectedLeave, endUnexpectedLeave,
    claimLead, handoverLead, offboardMember, handoverMemberOpen, recordOvertimeConsent,
  };
}
