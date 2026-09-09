export type UUID = string;
export type ISODateString = string;

export type PickupStatus =
  | "requested"
  | "assigned"
  | "en_route"
  | "completed"
  | "verified"
  | "flagged"
  | "cancelled";

export type MaterialGrade = "clean_pet" | "mixed_recyclables" | "contaminated";

export const QUALITY_MULTIPLIER: Record<MaterialGrade, number> = {
  clean_pet: 1.0,
  mixed_recyclables: 0.7,
  contaminated: 0.3,
};

// pointsAwarded = kg * BASE_POINTS_PER_KG * QUALITY_MULTIPLIER[grade].
// e.g. 10kg of Clean PET = 10 * 20 * 1.0 = 200 points.
export const BASE_POINTS_PER_KG = 20;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Zone {
  id: UUID;
  name: string;
  city: string;
}

export interface AppUser {
  id: UUID;
  fullName: string;
  phone: string;
  organizationId: UUID | null;
  zoneId: UUID | null;
  createdAt: ISODateString;
}

export type AgentReputationStatus = "good_standing" | "flagged_for_review" | "suspended";

export interface Agent {
  id: UUID;
  fullName: string;
  phone: string;
  zoneId: UUID;
  reputationStatus: AgentReputationStatus;
  rejectionRate: number;
  createdAt: ISODateString;
}

export interface Organization {
  id: UUID;
  name: string;
  type: "school" | "business" | "community";
  zoneId: UUID;
}

export interface Pickup {
  id: UUID;
  userId: UUID;
  agentId: UUID | null;
  zoneId: UUID;
  status: PickupStatus;
  requestedAt: ISODateString;
  scheduledAt: ISODateString | null;
  pickupLocation: Coordinates;
  completedAt: ISODateString | null;
}

export interface PickupEvidence {
  id: UUID;
  pickupId: UUID;
  photoUrl: string;
  scaleReadingKg: number;
  materialGrade: MaterialGrade;
  gpsLocation: Coordinates;
  capturedAt: ISODateString;
  isAuditSample: boolean;
}

export interface PointsLedgerEntry {
  id: UUID;
  userId: UUID;
  pickupId: UUID;
  kgVerified: number;
  multiplier: number;
  pointsAwarded: number;
  createdAt: ISODateString;
}

export type BadgeTier = "bronze" | "silver" | "gold";

export const BADGE_THRESHOLD_KG: Record<BadgeTier, number> = {
  bronze: 50,
  silver: 200,
  gold: 500,
};

export interface Badge {
  id: UUID;
  userId: UUID;
  tier: BadgeTier;
  awardedAt: ISODateString;
}

export type FraudFlagReason =
  | "suspicious_pattern"
  | "audit_mismatch"
  | "duplicate_evidence"
  | "manual_report";

export interface FraudFlag {
  id: UUID;
  pickupId: UUID;
  agentId: UUID | null;
  reason: FraudFlagReason;
  createdAt: ISODateString;
  resolvedAt: ISODateString | null;
}

export interface Reward {
  id: UUID;
  name: string;
  description: string;
  pointsCost: number;
  isActive: boolean;
}

export interface Challenge {
  id: UUID;
  name: string;
  zoneId: UUID | null;
  startsAt: ISODateString;
  endsAt: ISODateString;
  targetKg: number;
}
