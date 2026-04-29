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
  detectedType: string;
  uploadedAt: string;
}

export interface ApplicationSummary {
  totalDocuments: number;
  detected: number;
  unknown: number;
  mismatch: number;
  uploads: UploadedDocument[];
  tips: string[];
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
}

