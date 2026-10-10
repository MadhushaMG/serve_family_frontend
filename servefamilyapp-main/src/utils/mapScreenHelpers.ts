import { CircleMember } from "@/src/types/models";

export const normalizeIdentifier = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

export const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveMembershipLocationId = (
  member: CircleMember | null | undefined,
): string | null => {
  const membership = member?.Membership as Record<string, unknown> | undefined;
  if (!membership) {
    return null;
  }

  const candidates: unknown[] = [
    membership.locationId,
    membership.LocationId,
    membership.location_id,
    membership.specialLocationId,
    membership.assignedLocationId,
    (membership as any)?.location?.id,
  ];

  const resolved = candidates.find(
    (candidate) => candidate !== undefined && candidate !== null,
  );
  return normalizeIdentifier(resolved ?? null);
};

export const isValidCoordinate = (lat: number, lon: number) => {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon)
  );
};

export const normalizeRole = (role?: string | null) => {
  if (typeof role !== "string") return null;
  const trimmed = role.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

export const formatRoleLabel = (role: string | null) => {
  if (!role) return "Member";
  if (role === "creator") return "Creator";
  if (role === "admin") return "Admin";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const resolveMemberId = (member: CircleMember | null | undefined) => {
  if (!member) {
    return null;
  }

  const membershipRecord = ((member as any)?.Membership ?? {}) as Record<
    string,
    unknown
  >;
  const primaryCandidates: unknown[] = [
    (member as any)?.id,
    (member as any)?.userId,
    (member as any)?.UserId,
    (member as any)?.user_id,
    (member as any)?.memberId,
    (member as any)?.member_id,
    (member as any)?.profileId,
    (member as any)?.profile_id,
    (member as any)?._id,
    (member as any)?.uuid,
    membershipRecord.id,
    membershipRecord.userId,
    membershipRecord.user_id,
    membershipRecord.memberId,
    membershipRecord.member_id,
    membershipRecord.profileId,
    membershipRecord.profile_id,
    (member as any)?.user?.id,
    (member as any)?.user?.userId,
    (member as any)?.user?.user_id,
    (member as any)?.user?._id,
    (member as any)?.user?.uuid,
    (member as any)?.account?.id,
    (member as any)?.Account?.id,
    (member as any)?.person?.id,
    (member as any)?.Person?.id,
  ];

  for (const candidate of primaryCandidates) {
    const normalized = normalizeIdentifier(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const fallbackEmail = asNonEmptyString(
    (member as any)?.email ?? (member as any)?.Email,
  );
  if (fallbackEmail) {
    return fallbackEmail.toLowerCase();
  }

  return null;
};
