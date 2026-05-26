'use client';

import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, CloudUpload, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { RequiredDocument, UploadedDocument } from '@connect/types';
import { Badge } from './Badge';
import { cn } from '../lib/utils';

export type UploadState = {
  fileName?: string;
  progress: number;
  message?: string;
  tone?: 'success' | 'error';
  status?: 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'NEEDS_REVIEW' | 'DETECTED';
  detectedType?: string;
  confidence?: number;
  reasons?: string[];
};

interface UploadCardProps {
  document: RequiredDocument;
  persistedUpload?: UploadedDocument;
  state?: UploadState;
  isUploading: boolean;
  isDragging: boolean;
  onFileSelect: (file: File | null) => void;
  onDragChange: (isDragging: boolean) => void;
}

const acceptedFormats = 'JPG, PNG, PDF';

export const UploadCard: React.FC<UploadCardProps> = ({
  document,
  persistedUpload,
  state,
  isUploading,
  isDragging,
  onFileSelect,
  onDragChange,
}) => {
  const status = state?.status || persistedUpload?.detectionStatus;
  const detectedType = state?.detectedType || persistedUpload?.detectedType;
  const confidence = state?.confidence ?? persistedUpload?.confidence ?? 0;
  const reasons = state?.reasons ?? persistedUpload?.detectionReasons ?? [];
  const progress = state?.progress ?? (persistedUpload ? 100 : 0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_35px_80px_rgba(15,23,42,0.08)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg">
            <span className="text-base font-black">{document.name?.charAt(0) ?? 'D'}</span>
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-950">{document.name || 'Required document'}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{document.description || 'Upload a clear scan or photo for review.'}</p>
          </div>
        </div>
        <Badge status={status || 'PENDING'} />
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          onDragChange(true);
        }}
        onDragLeave={() => onDragChange(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDragChange(false);
          onFileSelect(event.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          'mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed p-7 text-center transition duration-300',
          isDragging ? 'border-blue-400 bg-blue-50/80' : 'border-slate-300 bg-slate-50/90 hover:border-blue-300 hover:bg-blue-50/70',
          isUploading && 'pointer-events-none opacity-80',
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
          {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <CloudUpload className="h-6 w-6" />}
        </div>
        <p className="mt-4 text-sm font-black text-slate-950">
          {isUploading ? 'Uploading and verifying...' : 'Drop file here or click to upload'}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">AI-assisted verification runs automatically after upload.</p>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,application/pdf,image/png,image/jpeg"
          className="hidden"
          disabled={isUploading}
          onChange={(event) => {
            onFileSelect(event.target.files?.[0] ?? null);
            event.currentTarget.value = '';
          }}
        />
      </label>

      {(state?.fileName || persistedUpload) && (
        <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{state?.fileName || persistedUpload?.filename}</p>
                <p className="text-xs text-slate-500">
                  {persistedUpload ? `${(persistedUpload.size / 1024 / 1024).toFixed(2)} MB` : 'Preparing secure upload'}
                  {detectedType ? ` · Detected as ${detectedType}` : ''}
                  {confidence > 0 && ` (${confidence}% confidence)`}
                </p>
              </div>
            </div>
            {status && <Badge status={status} className="uppercase" />}
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          {state?.message && (
            <p className={cn('mt-3 flex items-center gap-2 text-xs font-semibold', state.tone === 'error' ? 'text-red-600' : 'text-emerald-700')}>
              {state.tone === 'error' ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {state.message}
            </p>
          )}

          {reasons && reasons.length > 0 && (
            <div className="mt-4 space-y-2 rounded-lg bg-white p-3">
              <p className="text-xs font-bold text-slate-700">Detection Details:</p>
              <ul className="space-y-1">
                {reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-1 inline-block h-1 w-1 rounded-full bg-slate-400" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {persistedUpload && (
            <div className="mt-4 text-xs text-slate-500">
              <span className="font-bold">Record</span> saved to your upload history.
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
};
