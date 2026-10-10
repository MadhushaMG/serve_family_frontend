// ─── Domain types ──────────────────────────────────────────────────────────────
export interface LocationPoint {
  id?: number;
  latitude: number;
  longitude: number;
  name?: string;
  metadata?: { radius?: number };
}

export type CircleUserWithMembership = {
  Membership?: {
    code?: string;
    codeExpiresAt?: string;
  };
};

export interface CircleData {
  id: number | string;
  name?: string;
  Locations?: LocationPoint[];
  metadata?: { radius?: number };
  creatorId?: string;
  creator?: { id: string; name?: string };
  invitationCode?: string;
  invitationCodeExpiresAt?: string;
  joinCode?: string;
  code?: string;
  users?: CircleUserWithMembership[];
}

export interface InvitationData {
  id: string;
  userId?: string;
  circleId: string;
  role?: string;
  status?: string;
  circleName?: string;
  code?: string;
  user?: { email?: string; name?: string };
  Circle?: {
    id: string;
    name?: string;
    creator?: { id: string; name?: string };
  };
  inviterName?: string;
  circle_id?: string;
  expiresAt?: string;
  invitationCode?: string;
  codeExpiresAt?: string;
}

// ─── Component props ───────────────────────────────────────────────────────────
export interface CirclesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  circles: CircleData[];
  loadingCircles?: boolean;
  onSelectCircle?: (circleId: number | string) => void;
  shareTargetCircle?: CircleData | null;
  shareRequestId?: number;
  onShareHandled?: () => void;
}