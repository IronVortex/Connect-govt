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

export interface UploadedDocument {
  _id: string;
  requiredDocument: RequiredDocument | string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  detectionStatus: 'DETECTED' | 'MISMATCH' | 'UNKNOWN';
  detectedType?: string;
  verified?: boolean;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationSummary {
  totalDocuments: number;
  detected: number;
  unknown: number;
  mismatch: number;
  uploads: UploadedDocument[];
  tips: string[];
  feesByService?: { serviceId: string; name: string; fee?: number; estimatedProcessingTime?: string }[];
  totalFee?: number;
  estimatedProcessingTime?: string;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
}

