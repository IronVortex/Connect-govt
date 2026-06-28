'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, CloudUpload, FileText, Loader2, XCircle, Lock } from 'lucide-react';
import { RequiredDocument, UploadedDocument } from '@connect/types';
import { Badge } from './Badge';
import { cn } from '../lib/utils';
import { normalizeUploadConfidence, normalizeUploadDetectedType, normalizeUploadStatus } from '../lib/uploadHelpers';

export type VerificationStatus = 'VERIFIED' | 'REVIEW_REQUIRED' | 'REJECTED' | 'UNKNOWN' | 'PENDING';

type UploadState = {
  fileName?: string;
  progress: number;
  message?: string;
  tone?: 'success' | 'error';
  status?: VerificationStatus;
  detectedType?: string;
  confidence?: number;
  verificationStatus?: string;
  analysis?: {
    detectedType?: string;
    verificationStatus?: string;
    classificationConfidence?: number;
    confidence?: number;
  };
  reasons?: string[];
  extractedFields?: Record<string, unknown>;
};

interface UploadCardProps {
  document: RequiredDocument;
  persistedUpload?: UploadedDocument;
  state?: UploadState;
  isUploading: boolean;
  isDragging: boolean;
  disabled?: boolean;
  onFileSelect: (file: File | null) => void;
  onDragChange: (isDragging: boolean) => void;
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function getExtractedFieldEntries(fields?: Record<string, unknown>): Array<[string, string]> {
  if (!fields) return [];
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .slice(0, 6)
    .map(([key, value]) => {
      if (Array.isArray(value)) return [formatFieldLabel(key), value.join(', ')];
      if (typeof value === 'object') return [formatFieldLabel(key), JSON.stringify(value)];
      return [formatFieldLabel(key), String(value)];
    });
}

function getUploadStage(progress: number): { label: string; stageIndex: number } {
  if (progress < 15) return { label: 'Preparing upload', stageIndex: -1 };
  if (progress < 40) return { label: 'Uploading file', stageIndex: -1 };
  if (progress < 58) return { label: 'Image quality analysis', stageIndex: 0 };
  if (progress < 72) return { label: 'OCR text extraction', stageIndex: 1 };
  if (progress < 86) return { label: 'AI document classification', stageIndex: 2 };
  if (progress < 97) return { label: 'Field validation', stageIndex: 3 };
  return { label: 'Finalizing result', stageIndex: 3 };
}

const PIPELINE_STAGES = [
  { id: 'image', label: 'Image Analysis', description: 'Blur, brightness, contrast' },
  { id: 'ocr', label: 'OCR Extraction', description: 'Text & field detection' },
  { id: 'classify', label: 'Classification', description: 'AI document type detection' },
  { id: 'validate', label: 'Validation', description: 'Field & authenticity check' },
] as const;

export const UploadCard: React.FC<UploadCardProps> = ({
  document,
  persistedUpload,
  state,
  isUploading,
  isDragging,
  disabled = false,
  onFileSelect,
  onDragChange,
}) => {
  const mergedUpload = { ...persistedUpload, ...state };
  const status = normalizeUploadStatus(mergedUpload);
  const detectedType = normalizeUploadDetectedType(mergedUpload);
  const confidence = normalizeUploadConfidence(mergedUpload) ?? 0;
  const reasons = state?.reasons ?? persistedUpload?.detectionReasons ?? [];
  const progress = state?.progress ?? (persistedUpload ? 100 : 0);
  const extractedEntries = getExtractedFieldEntries(state?.extractedFields);
  
  // A card is locked if general interface uploads are disabled, unless it's the specific active card currently uploading.
  const isLocked = disabled && !isUploading;
  const isInactive = disabled || isUploading;

  const validationReasons = reasons.filter(
    (r) =>
      !r.startsWith('Visual features:') &&
      !r.includes('verified successfully') &&
      r.length > 0,
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={cn(
        'relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 dynamic-blur-container',
        isLocked ? 'blur-[2px] pointer-events-none select-none opacity-40 mix-blend-overlay' : 'hover:border-slate-300 hover:shadow-md/5',
      )}
    >
      {/* Premium Lock Overlay for Blurring Inactive Options */}
      <AnimatePresence>
        {isLocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl bg-slate-50/20 backdrop-blur-[3px] p-6 text-center transition-all duration-300"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200/80 text-slate-500 mb-2">
              <Lock className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-slate-700 max-w-[240px] tracking-tight">
              Upload disabled while another document is verifying
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold text-sm shadow-sm">
            {document.name?.charAt(0) ?? 'D'}
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">
              {document.name || 'Required document'}
            </h3>
            <p className="text-xs leading-normal text-slate-500 max-w-xl">
              {document.description || 'Upload a clear scan or photo for review.'}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Badge status={status || 'PENDING'} />
        </div>
      </div>

      {/* Upload Drop Zone Area */}
      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!isInactive) onDragChange(true);
        }}
        onDragLeave={() => {
          if (!isInactive) onDragChange(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (!isInactive) {
            onDragChange(false);
            onFileSelect(event.dataTransfer.files?.[0] ?? null);
          }
        }}
        className={cn(
          'mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
          isDragging 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50',
          isInactive && 'pointer-events-none opacity-90',
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm border border-slate-100">
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> : <CloudUpload className="h-5 w-5 text-slate-500" />}
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-900">
          {isUploading
            ? 'Uploading and verifying...'
            : isLocked
            ? 'Locked'
            : 'Drop file here or click to upload'}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Vision AI classification and OCR verification run automatically.
        </p>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,application/pdf,image/png,image/jpeg"
          className="hidden"
          disabled={isInactive}
          onChange={(event) => {
            onFileSelect(event.target.files?.[0] ?? null);
            event.currentTarget.value = '';
          }}
        />
      </label>

      {/* Active Scan Results & Progress Details */}
      {(state?.fileName || persistedUpload) && (
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {state?.fileName || persistedUpload?.filename}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  {persistedUpload ? `${(persistedUpload.size / 1024 / 1024).toFixed(2)} MB` : 'Secure upload parsing'}
                </p>
              </div>
            </div>
            {status && <Badge status={status} className="sm:self-center" />}
          </div>

          {/* Clean Progress Bar Container */}
          <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
            <div 
              className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }} 
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-medium">
            <span className="text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-md shadow-2xs">
              {progress}% complete
            </span>
            <span className="text-blue-700 bg-blue-50/60 border border-blue-100/40 px-2 py-0.5 rounded-md font-semibold">
              {getUploadStage(progress).label}
            </span>
          </div>

          {state?.message && (
            <p className={cn('mt-3 flex items-center gap-1.5 text-[11px] font-medium', state.tone === 'error' ? 'text-red-600' : 'text-emerald-700')}>
              {state.tone === 'error' ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
              {state.message}
            </p>
          )}

          {/* Pipeline Verification Timeline */}
          {isUploading && (
            <div className="mt-4 rounded-lg border border-blue-100/60 bg-blue-50/40 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 mb-3">Verification Pipeline</p>
              <div className="space-y-2.5">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const { stageIndex } = getUploadStage(progress);
                  const isActive = stageIndex === idx;
                  const isDone = stageIndex > idx;
                  return (
                    <div key={stage.id} className="flex items-center gap-2.5">
                      <div className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300',
                        isDone ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                        isActive ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' :
                        'bg-slate-100 text-slate-400 border border-slate-200'
                      )}>
                        {isDone ? <CheckCircle2 className="h-3 w-3" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={cn(
                            'text-xs font-semibold transition-colors duration-200',
                            isDone ? 'text-emerald-700' : isActive ? 'text-blue-700' : 'text-slate-400'
                          )}>{stage.label}</p>
                          {isActive && <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />}
                        </div>
                        <p className="text-[10px] text-slate-400">{stage.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extracted Analytics Block */}
          {detectedType && (
            <div className="mt-4 space-y-3 rounded-lg border border-slate-100 bg-white p-3.5 shadow-2xs">
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Document Type</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-900 truncate">{detectedType}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">AI Confidence</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          confidence >= 75 ? 'bg-emerald-500' : confidence >= 45 ? 'bg-amber-400' : 'bg-red-400'
                        )}
                        style={{ width: `${confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 shrink-0">{confidence}%</span>
                  </div>
                </div>
              </div>

              {extractedEntries.length > 0 && (
                <div className="border-t border-slate-50 pt-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">Extracted Information</p>
                  <ul className="space-y-1">
                    {extractedEntries.map(([label, value]) => (
                      <li key={label} className="flex gap-2 text-xs text-slate-700">
                        <span className="font-medium text-slate-400 shrink-0">{label}:</span>
                        <span className="truncate font-medium text-slate-800">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validationReasons.length > 0 && (
                <div className="border-t border-slate-50 pt-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">Verification Checks</p>
                  <ul className="space-y-1">
                    {validationReasons.map((reason, idx) => {
                      const isPass = /detected|verified|passed|present/i.test(reason);
                      return (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-600 leading-normal">
                          {isPass ? (
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                          )}
                          <span className="font-medium">{reason}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
};