export interface Department {
  _id: string;
  name: string;
  description?: string;
}

export interface Service {
  _id: string;
  name: string;
  description?: string;
  department: Department | string;
  fee?: number;
  estimatedProcessingTime?: string;
  priorityLevel?: number;
}

export interface RequiredDocument {
  _id: string;
  name: string;
  description?: string;
  service: Service | string;
}

export type VerificationStatus = 'VERIFIED' | 'REVIEW_REQUIRED' | 'REJECTED' | 'UNKNOWN' | 'PENDING';

export interface UploadedDocument {
  _id: string;
  requiredDocument: RequiredDocument | string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  detectionStatus: VerificationStatus;
  detectedType?: string;
  confidence?: number;
  verificationStatus?: string;
  analysis?: {
    detectedType?: string;
    verificationStatus?: string;
    classificationConfidence?: number;
    confidence?: number;
  };
  extractedText?: string;
  matchedExpectedType?: string;
  detectionReasons?: string[];
  verified?: boolean;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationSummary {
  totalDocuments: number;
  verified: number;
  reviewRequired: number;
  rejected: number;
  unknown: number;
  uploads: UploadedDocument[];
  tips: string[];
  feesByService?: { serviceId: string; name: string; fee?: number; estimatedProcessingTime?: string }[];
  totalFee?: number;
  estimatedProcessingTime?: string;
  /** @deprecated */
  matched?: number;
  /** @deprecated */
  detected?: number;
  /** @deprecated */
  needsReview?: number;
  /** @deprecated */
  mismatched?: number;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
}

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_CORRECTION';

export interface Application {
  _id: string;
  appId: string;
  service: Service | string;
  status: ApplicationStatus;
  notes?: string;
  uploadedDocuments?: UploadedDocument[] | string[];
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
