import { useRef, useState, useCallback } from "react";
import { Alert, Keyboard, Share } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InviteService } from "../Services/InviteService";
import { UserServices } from "@/src/Services/UserServices";
import { CircleData, InvitationData } from "../types/Circlesmodal.types";
import { CIRCLE_KEYS, useCreateCircle, useGenerateInvitationCode } from "./Usecircle";


// ─── Payload extractors (pure — no side effects) ───────────────────────────────
export const extractCirclePayload = (raw: any): Partial<CircleData> => {
  if (!raw) return {};
  if (raw?.data?.circle) return raw.data.circle;
  if (raw?.circle) return raw.circle;
  if (raw?.data && (raw.data.invitationCode || raw.data.users || raw.data.metadata))
    return raw.data;
  if (raw?.data?.data) return extractCirclePayload(raw.data);
  return raw;
};


export const resolveInvitationDetails = (
  payload: any
): { code?: string; expiresAt?: string } => {
  if (!payload) return {};


  const list: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  if (list.length) {
    const withCode = list.find((i: any) => i?.code || i?.invitationCode);
    console.log(withCode)

    return {
      code: payload?.data?.invitationCode,
      expiresAt:
        payload?.data?.invitationCodeExpiresAt
    };
  }


  const circle: any = extractCirclePayload(payload);
  if (!circle) return {};

  if (circle.code || circle.invitationCode || circle.joinCode) {
    return {
      code: circle.code ?? circle.invitationCode ?? circle.joinCode,
      expiresAt:
        circle.codeExpiresAt ??
        circle.invitationCodeExpiresAt ??
        circle.expiresAt,
    };
  }

  const users: any[] = Array.isArray(circle.users) ? circle.users : [];
  for (const u of users) {
    if (u?.Membership?.code) {
      return { code: u.Membership.code, expiresAt: u.Membership.codeExpiresAt };
    }
  }

  return {};
};

// ─── Hook ──────────────────────────────────────────────────────────────────────
export type ModalView = "list" | "create" | "share" | "invitations";

interface UseCirclesModalProps {
  onRefresh: () => Promise<void> | void;
  shareTargetCircle?: CircleData | null;
  shareRequestId?: number;
  onShareHandled?: () => void;
  onClose: () => void;
}

export const useCirclesModal = ({
  onRefresh,
  shareTargetCircle,
  shareRequestId,
  onShareHandled,
  onClose,
}: UseCirclesModalProps) => {
  const queryClient = useQueryClient();

  // ── View / selection state ──────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<ModalView>("list");
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);

  // ── Create circle form ──────────────────────────────────────────────────────
  const [newCircleName, setNewCircleName] = useState("");

  // ── Invite / share state ────────────────────────────────────────────────────
  const [createdCircleData, setCreatedCircleData] = useState<CircleData | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpiry, setCodeExpiry] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNickname, setInviteNickname] = useState("");
  const [inviteRole] = useState("member");

  // ── Join by code ────────────────────────────────────────────────────────────
  const [joinCode, setJoinCode] = useState("");

  // ── Share-target dedup ref ──────────────────────────────────────────────────
  const lastHandledShareRequestId = useRef<number | null>(null);

  // ── Reset all form/view state ───────────────────────────────────────────────
  const resetStates = useCallback(() => {
    setCurrentView("list");
    setNewCircleName("");
    setInviteEmail("");
    setInviteNickname("");
    setGeneratedCode(null);
    setCodeExpiry(null);
    setCreatedCircleData(null);
  }, []);

  // ── Handle external share target (driven by prop changes) ──────────────────
  const applyShareTarget = useCallback(() => {
    if (!shareTargetCircle || shareRequestId == null) return;
    if (lastHandledShareRequestId.current === shareRequestId) return;

    lastHandledShareRequestId.current = shareRequestId;
    setCreatedCircleData(shareTargetCircle);
    setSelectedCircleId(
      shareTargetCircle.id != null ? String(shareTargetCircle.id) : null
    );
    const { code, expiresAt } = resolveInvitationDetails(shareTargetCircle);
    setGeneratedCode(code ?? null);
    setCodeExpiry(expiresAt ?? null);
    setInviteEmail("");
    setInviteNickname("");
    setCurrentView("share");
    onShareHandled?.();
  }, [shareTargetCircle, shareRequestId, onShareHandled]);

  // ── Circle selection ────────────────────────────────────────────────────────
  const handleCircleSelect = useCallback(
    (id: number | string, onSelectCircle?: (id: number | string) => void) => {
      const idStr = String(id);
      setSelectedCircleId((prev) => (prev === idStr ? null : idStr));
      onSelectCircle?.(id);
    },
    []
  );

  // ── Generate invitation code mutation (shared hook — keeps cache in sync) ───
  const generateCodeMutation = useGenerateInvitationCode();

  const runGenerateCode = useCallback(
    (circleId: string | number, { silent = false }: { silent?: boolean } = {}) => {
      generateCodeMutation.mutate(circleId, {
        onSuccess: (response) => {
          const { code, expiresAt } = resolveInvitationDetails(response);
          if (code) setGeneratedCode(code);
          if (expiresAt) setCodeExpiry(expiresAt ?? null);
          if (!silent) {
            Alert.alert("Success", "Invitation code generated successfully.");
          }
          onRefresh();
        },
        onError: (error: any) => {
          if (!silent) {
            Alert.alert(
              "Error",
              error?.message ?? "Failed to generate invitation code."
            );
          }
        },
      });
    },
    [generateCodeMutation, onRefresh]
  );

  const createCircleMutation = useCreateCircle();

  const handleCreateCircle = useCallback(
    (nameOverride?: string) => {
      const name = (nameOverride ?? newCircleName).trim();
      if (!name) {
        Alert.alert("Required", "Please enter a name for the circle.");
        return;
      }
      createCircleMutation.mutate(
        { name },
        {
          onSuccess: (createResponse) => {
            const circlePayload = extractCirclePayload(createResponse);
            setCreatedCircleData(circlePayload as CircleData);

            const { code, expiresAt } = resolveInvitationDetails(circlePayload);
            if (code) setGeneratedCode(code);
            if (expiresAt) setCodeExpiry(expiresAt);

            setCurrentView("share");
            setNewCircleName("");


            if (!code && circlePayload?.id) {
              runGenerateCode(circlePayload.id, { silent: true });
            }
          },
          onError: (error: any) => {
            Alert.alert("Error", error?.message ?? "Failed to create circle.");
          },
        }
      );
    },
    [newCircleName, createCircleMutation, runGenerateCode]
  );

  // ── Send invite mutation ────────────────────────────────────────────────────
  const [sendingInvite, setSendingInvite] = useState(false);
  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !createdCircleData?.id) {
      Alert.alert("Error", "Please enter an email and ensure a circle exists.");
      return;
    }
    Keyboard.dismiss();
    setSendingInvite(true);
    try {
      await InviteService.InviteToCircle(
        createdCircleData.id as string,
        inviteEmail.trim(),
        inviteRole,
        inviteNickname
      );
      Alert.alert("Success", `Invitation sent to ${inviteEmail}.`);
      setInviteEmail("");
      setInviteNickname("");
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to send invite.");
    } finally {
      setSendingInvite(false);
    }
  }, [inviteEmail, inviteNickname, inviteRole, createdCircleData]);

  // ── Regenerate invitation code (button in the "share" screen) ──────────────
  const handleGenerateInvitationCode = useCallback(() => {
    if (!createdCircleData?.id) {
      Alert.alert("Error", "A circle must be selected to generate a code.");
      return;
    }
    runGenerateCode(createdCircleData.id);
  }, [createdCircleData, runGenerateCode]);

  // ── Share code via native sheet ─────────────────────────────────────────────
  const handleShareCode = useCallback(async () => {
    if (!generatedCode || !createdCircleData) return;
    try {
      await Share.share({
        message: `Join my circle "${createdCircleData.name}" using code: ${generatedCode}`,
      });
    } catch (error: any) {
      Alert.alert("Share error", error?.message ?? "Could not share code.");
    }
  }, [generatedCode, createdCircleData]);

  // ── Pending invitations query ───────────────────────────────────────────────
  const invitationsQuery = useQuery({
    queryKey: ["pendingInvitations"],
    queryFn: async (): Promise<InvitationData[]> => {
      const response = await UserServices.GetPendingRequests();
      return Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : response?.invitations ?? response?.data?.invitations ?? [];
    },
    enabled: false,
  });

  const loadInvitations = useCallback(() => {
    invitationsQuery.refetch();
  }, [invitationsQuery]);

  const openInvitationsView = useCallback(() => {
    setCurrentView("invitations");
    loadInvitations();
  }, [loadInvitations]);

  // ── Join by code mutation ───────────────────────────────────────────────────
  const [joiningCircle, setJoiningCircle] = useState(false);
  const handleJoinByCode = useCallback(async () => {
    if (!joinCode.trim() || joinCode.trim().length < 6) {
      Alert.alert("Invalid Code", "Enter a valid 6-character code.");
      return;
    }
    Keyboard.dismiss();
    setJoiningCircle(true);
    try {
      await InviteService.JoinByCode(joinCode.trim());
      Alert.alert("Success", "Joined circle successfully!");
      setJoinCode("");
      queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.all });
      await onRefresh();
      loadInvitations();
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Invalid or expired code.");
    } finally {
      setJoiningCircle(false);
    }
  }, [joinCode, onRefresh, loadInvitations, queryClient]);

  // ── Accept / Reject invitation ──────────────────────────────────────────────
  const handleAcceptInvitation = useCallback(
    async (circleId: string) => {
      try {
        await InviteService.AcceptInvite(circleId);
        Alert.alert("Joined!");
        queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
        queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.all });
        await onRefresh();
      } catch (error: any) {
        Alert.alert("Error", error?.message ?? "Could not accept invite.");
      }
    },
    [onRefresh, queryClient]
  );

  const handleRejectInvitation = useCallback(
    async (circleId: string) => {
      try {
        await InviteService.RejectInvite(circleId);
        queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      } catch (err: any) {
        console.error("Reject invite error:", err);
      }
    },
    [queryClient]
  );

  return {
    // View
    currentView,
    setCurrentView,
    resetStates,
    applyShareTarget,
    openInvitationsView,

    // Circle selection
    selectedCircleId,
    handleCircleSelect,

    // Create
    newCircleName,
    setNewCircleName,
    handleCreateCircle,
    creatingCircle: createCircleMutation.isPending,

    // Share
    createdCircleData,
    generatedCode,
    codeExpiry,
    inviteEmail,
    setInviteEmail,
    inviteNickname,
    setInviteNickname,
    inviteRole,
    handleSendInvite,
    sendingInvite,
    handleGenerateInvitationCode,
    generatingCode: generateCodeMutation.isPending,
    handleShareCode,

    // Join
    joinCode,
    setJoinCode,
    handleJoinByCode,
    joiningCircle,

    // Invitations
    invitations: invitationsQuery.data ?? [],
    loadingInvitations: invitationsQuery.isFetching,
    refreshingInvitations: invitationsQuery.isRefetching,
    loadInvitations,
    handleAcceptInvitation,
    handleRejectInvitation,
  };
};