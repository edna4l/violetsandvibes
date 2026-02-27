export type VerificationStatus = "pending" | "submitted" | "approved" | "rejected";

export type VerificationState = {
  photoStatus: VerificationStatus;
  idStatus: VerificationStatus;
  fullyApproved: boolean;
  submittedForReview: boolean;
  completeForAccess: boolean;
  underReview: boolean;
};

const VALID_STATUS: VerificationStatus[] = ["pending", "submitted", "approved", "rejected"];

function normalizeStatus(value: unknown, fallback: VerificationStatus): VerificationStatus {
  if (typeof value !== "string") return fallback;
  const lowered = value.trim().toLowerCase();
  if (VALID_STATUS.includes(lowered as VerificationStatus)) {
    return lowered as VerificationStatus;
  }
  return fallback;
}

export function getVerificationState(safetySettings: unknown): VerificationState {
  const safety =
    safetySettings && typeof safetySettings === "object"
      ? (safetySettings as Record<string, unknown>)
      : {};

  if (safety.photoVerification === true) {
    return {
      photoStatus: "approved",
      idStatus: "approved",
      fullyApproved: true,
      submittedForReview: true,
      completeForAccess: true,
      underReview: false,
    };
  }

  const photoStatus = normalizeStatus(
    safety.verification_photo_status ?? safety.photo_status,
    "pending"
  );
  const idStatus = normalizeStatus(
    safety.verification_id_status ?? safety.id_status,
    "pending"
  );

  const statusSet = new Set<VerificationStatus>([photoStatus, idStatus]);
  const fullyApproved = photoStatus === "approved" && idStatus === "approved";
  const submittedForReview =
    (photoStatus === "submitted" || photoStatus === "approved") &&
    (idStatus === "submitted" || idStatus === "approved");
  const completeForAccess = fullyApproved;
  const underReview =
    !fullyApproved &&
    submittedForReview &&
    !statusSet.has("pending") &&
    !statusSet.has("rejected");

  return {
    photoStatus,
    idStatus,
    fullyApproved,
    submittedForReview,
    completeForAccess,
    underReview,
  };
}
