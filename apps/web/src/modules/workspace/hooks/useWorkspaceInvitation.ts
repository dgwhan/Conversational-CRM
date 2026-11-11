import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { apiClient } from '../../../lib/api-client/index.js';
import { ROUTES, buildRoute } from '../../../config/routes.js';
import { useUserRole } from '../../auth/UserRoleContext.js';
import { useWorkspaceConfig, WORKSPACE_MEMBER_STATUS } from '../WorkspaceConfigContext.js';
import type { WorkspaceMemberStatus } from '../types/staff.types.js';

export interface InvitationDetails {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug?: string | null;
  membersCount?: number;
  status: WorkspaceMemberStatus;
  invitedAt: string;
  joinedAt?: string | null;
  invitedBy?: { id: string; fullName: string; email: string } | null;
  invitee: { id: string; fullName: string; email: string };
}

export function useWorkspaceInvitation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, userId, userEmail } = useUserRole();
  const { switchWorkspace, fetchMyWorkspaces } = useWorkspaceConfig();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInvalidId = !id || /[<>'"\\;`|\s]/.test(id);
  const fetchInvitation = useCallback(async () => {
    if (isInvalidId || !id) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiClient.getWorkspaceInvitation(id);
      if (user && data.invitee && data.invitee.id !== userId && data.invitee.email !== userEmail) {
        setIsError(true);
        return;
      }
      setInvitation(data);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id, isInvalidId, user, userId, userEmail]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(window.location.pathname)}`, { replace: true });
      return;
    }
    void fetchInvitation();
  }, [isAuthenticated, fetchInvitation, navigate]);

  const handleAccept = async () => {
    if (!id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient.acceptWorkspaceInvitation(id);
      notify.success(response.message, 'Tham gia thành công');
      setInvitation((current) => current ? { ...current, status: WORKSPACE_MEMBER_STATUS.ACTIVE } : null);
      await fetchMyWorkspaces();
      const workspaceId = invitation?.workspaceId ?? response.workspace?.id;
      const workspaceRouteId = invitation?.workspaceSlug ?? workspaceId;
      if (workspaceId && workspaceRouteId) {
        await switchWorkspace(workspaceId);
        navigate(buildRoute.workspace(workspaceRouteId));
      } else {
        navigate(ROUTES.WORKSPACE_DEFAULT);
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Không thể chấp nhận lời mời.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient.declineWorkspaceInvitation(id);
      notify.info(response.message, 'Từ chối lời mời');
      setInvitation((current) => current ? { ...current, status: WORKSPACE_MEMBER_STATUS.DECLINED } : null);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    invitation,
    isLoading,
    isError,
    isSubmitting,
    fetchInvitation,
    handleAccept,
    handleDecline,
    navigate,
    switchWorkspace,
  };
}
