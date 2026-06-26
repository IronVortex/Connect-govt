'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronRight, 
  Info, 
  Upload, 
  CheckCircle2, 
  FileText,
  AlertCircle,
  Eye,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  PhoneCall,
  MessageSquare
} from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import { cn } from '../../lib/utils';

const steps = [
  { id: 1, label: 'Select Service', status: 'completed' },
  { id: 2, label: 'Documents Required', status: 'active' },
  { id: 3, label: 'Verification Status', status: 'pending' },
];

const requiredDocs = [
  { id: 'aadhaar', name: 'Aadhaar Card', description: 'Upload front side of Aadhaar Card', status: 'verified', isRequired: true },
  { id: 'address', name: 'Address Proof', description: 'Upload any government issued address proof', status: 'pending', isRequired: true },
  { id: 'pan', name: 'PAN Card', description: 'Upload PAN Card', status: 'pending', isRequired: true },
  { id: 'insurance', name: 'Insurance Certificate', description: 'Upload valid insurance certificate', status: 'pending', isRequired: true },
  { id: 'invoice', name: 'Invoice / Bill of Sale', description: 'Upload car invoice or bill of sale', status: 'pending', isRequired: true },
];

export default function ServiceDetailPage() {
  const [documents, setDocuments] = useState(requiredDocs);

  // Compute stats dynamically for real-time progress presentation
  const totalDocs = documents.length;
  const verifiedDocs = documents.filter(d => d.status === 'verified').length;
  const completionPercentage = totalDocs ? Math.round((verifiedDocs / totalDocs) * 100) : 0;

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 py-2 space-y-6">
        
        {/* Breadcrumbs Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 font-semibold tracking-wide uppercase">
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <Link href="/departments/transport" className="hover:text-blue-600 transition-colors">RTO</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-slate-600 font-bold">New Car Registration</span>
        </nav>

        {/* Master Row Grid Definition */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Action Workspace Column Segment */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Identity Board */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-50/40 via-transparent to-transparent rounded-full pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 shrink-0 shadow-xs">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="National Emblem of India" className="w-full h-full object-contain opacity-90" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">New Car Registration</h1>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Transport Department (RTO)</p>
                </div>
              </div>
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-blue-100 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50/50 hover:border-blue-200 transition-all shadow-2xs shrink-0 self-start sm:self-auto">
                <Info className="w-4 h-4" />
                About service
              </button>
            </div>

            {/* Premium Stepper Indicator Track */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between relative px-4 sm:px-12">
                <div className="absolute top-[18px] left-[40px] sm:left-[100px] right-[40px] sm:right-[100px] h-[3px] bg-slate-100 -z-0">
                  <div className="h-full bg-blue-600 w-1/2 rounded-full transition-all duration-700 ease-out" />
                </div>
                {steps.map((step) => (
                  <div key={step.id} className="flex flex-col items-center gap-2.5 relative z-10">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm",
                      step.status === 'completed' ? "bg-blue-600 text-white" : 
                      step.status === 'active' ? "bg-white border-2 border-blue-600 text-blue-600 ring-4 ring-blue-50" : 
                      "bg-white border-2 border-slate-100 text-slate-300"
                    )}>
                      {step.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-white" /> : step.id}
                    </div>
                    <span className={cn(
                      "text-[11px] font-bold tracking-tight",
                      step.status === 'active' || step.status === 'completed' ? 'text-slate-800' : 'text-slate-400'
                    )}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Checklist Area */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Required Documents</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Compile and audit documentation metrics before submittal</p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 sm:p-5 gap-4 bg-white hover:bg-slate-50/40 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 bg-blue-50 border border-blue-100/40 rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight">{doc.name}</h4>
                          {doc.isRequired && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-extrabold rounded-md uppercase tracking-wider border border-emerald-100/50">Required</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium leading-normal">{doc.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      {doc.status === 'verified' ? (
                        <>
                          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50/50 border border-emerald-100 px-3 py-1.5 rounded-xl shadow-2xs">
                            <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
                            Verified
                          </div>
                          <button className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all">
                            View
                          </button>
                        </>
                      ) : (
                        <button className="flex items-center justify-center gap-2 px-5 py-2 border border-blue-200 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-2xs group/btn">
                          <Upload className="w-3.5 h-3.5 transition-transform group-hover/btn:-translate-y-0.5" />
                          Upload
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Notification Context Alert Banner */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100/80 rounded-2xl flex items-start gap-3.5">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs shadow-emerald-200">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-emerald-900">Pipeline Pipeline Encryption Active</h4>
                  <p className="text-[11px] text-emerald-700/80 leading-relaxed font-semibold">
                    Our AI validation layer confirms matching syntax variables on upload. Final system endorsement occurs at the regional desk level.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions Row Block */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button className="px-5 py-3 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-white hover:border-slate-300 transition-all shadow-2xs active:scale-98">
                ← Return to Desk
              </button>
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-200 flex items-center gap-2 active:scale-98 group">
                Begin Verification Process
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Sticky Sidebar Operations Control Column Panel Container */}
          <div className="space-y-6 lg:sticky lg:top-6">
            
            {/* Completion Matrix Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspace Matrix</p>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Compilation Progress</h3>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 bg-slate-100 rounded-full border border-slate-200/40 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 font-semibold px-0.5">
                  <span>{verifiedDocs} of {totalDocs} sections compiled</span>
                  <span className="text-blue-600 font-bold">{completionPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Interactive Help Desk Module Component Block */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-blue-400">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-white">Need Operational Help?</h4>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">RTO Support Terminal</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5 backdrop-blur-xs group/btn">
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400 group-hover/btn:text-white" />
                    View System Guide
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5 backdrop-blur-xs group/btn">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400 group-hover/btn:text-white" />
                    Secure Chat Protocol
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-900/50">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Hotline Routing</p>
                  <p className="text-sm font-bold text-white mt-1.5 leading-none">1800-123-4567</p>
                </div>
              </div>
            </div>

            {/* Framework Standard Pipeline Audit Metrics Section */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Metadata Audits</h4>
              <ul className="space-y-3">
                {[
                  "Ensure string data parameters match clear structural scans",
                  "Max single file block execution threshold: 5MB",
                  "Permitted binary execution paths: JPG, PNG, PDF",
                  "Original files bypass automated verification blocks faster"
                ].map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-500 font-semibold leading-normal group">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5 transition-transform group-hover:scale-125" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

      </div>
    </PageLayout>
  );
}