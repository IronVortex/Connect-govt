import { UploadedDocument, VerificationStatus } from '@connect/types';

const LEGACY_STATUS_MAP: Record<string, VerificationStatus> = {
  VERIFIED: 'VERIFIED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  REJECTED: 'REJECTED',
  UNKNOWN: 'UNKNOWN',
  PENDING: 'PENDING',
  MATCHED: 'VERIFIED',
  DETECTED: 'VERIFIED',
  MISMATCHED: 'REJECTED',
  NEEDS_REVIEW: 'REVIEW_REQUIRED',
};

export function normalizeUploadStatus(data: any): VerificationStatus {
  const raw = String(
    data?.analysis?.verificationStatus ??
      data?.verificationStatus ??
      data?.status ??
      data?.detectionStatus ??
      '',
  ).toUpperCase();

  return LEGACY_STATUS_MAP[raw] ?? 'PENDING';
}

export function normalizeUploadDetectedType(data: any): string {
  return (
    data?.analysis?.detectedType ??
    data?.detectedType ??
    data?.documentType ??
    'UNKNOWN'
  );
}

export function normalizeUploadConfidence(data: any): number | undefined {
  if (!data) return undefined;

  return (
    data?.analysis?.classificationConfidence ??
    data?.analysis?.confidence ??
    data?.confidence
  );
}

export function normalizeUploadDocument<T extends Record<string, any>>(
  data: T,
): T & Partial<UploadedDocument> {
  return {
    ...data,
    detectionStatus: normalizeUploadStatus(data),
    detectedType: normalizeUploadDetectedType(data),
    confidence: normalizeUploadConfidence(data),
  };
}