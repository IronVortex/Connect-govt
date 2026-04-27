'use client';

import React, { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { 
  ChevronRight, 
  Info, 
  Upload, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  FileText,
  AlertCircle,
  Eye,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
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
  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-[13px] text-slate-400 mb-8 font-medium">
            <Link href="/dashboard" className="hover:text-[#1D61FF] transition-colors">Dashboard</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/departments/transport" className="hover:text-[#1D61FF] transition-colors">RTO</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600">New Car Registration</span>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
              <div className="w-[72px] h-[72px] bg-white border border-slate-100 rounded-full flex items-center justify-center overflow-hidden shadow-sm shadow-slate-200/50">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem" className="w-10 h-10 opacity-80" />
              </div>
              <div>
                <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">New Car Registration</h2>
                <p className="text-slate-500 text-[15px] font-medium mt-0.5">Transport Department (RTO)</p>
              </div>
            </div>
            <button className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-[#1D61FF] text-[#1D61FF] rounded-xl text-[14px] font-bold hover:bg-[#F0F5FF] transition-all shadow-sm shadow-[#1D61FF]/5 group">
              <Info className="w-4.5 h-4.5" />
              About this service
            </button>
          </div>

          {/* Stepper */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-8 mb-10 shadow-sm shadow-slate-200/50">
            <div className="flex items-center justify-between relative px-12">
              <div className="absolute top-[18px] left-[100px] right-[100px] h-[3px] bg-slate-100 -z-0">
                <div className="h-full bg-[#1D61FF] w-[50%] rounded-full transition-all duration-700 ease-out"></div>
              </div>
              {steps.map((step) => (
                <div key={step.id} className="flex flex-col items-center gap-3 relative z-10">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold transition-all duration-500",
                    step.status === 'completed' ? "bg-[#1D61FF] text-white shadow-lg shadow-[#1D61FF]/20" : 
                    step.status === 'active' ? "bg-white border-[3px] border-[#1D61FF] text-[#1D61FF] shadow-lg shadow-[#1D61FF]/10 ring-8 ring-[#1D61FF]/5" : 
                    "bg-white border-2 border-slate-100 text-slate-300"
                  )}>
                    {step.status === 'completed' ? <CheckCircle2 className="w-6 h-6 stroke-[2.5px]" /> : step.id}
                  </div>
                  <span className={cn(
                    "text-[13px] font-bold whitespace-nowrap tracking-tight transition-colors duration-300",
                    step.status === 'active' || step.status === 'completed' ? 'text-slate-800' : 'text-slate-400'
                  )}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 items-start">
            {/* Main Content */}
            <div className="space-y-8">
              <div className="bg-white border border-slate-100 rounded-[24px] p-10 shadow-sm shadow-slate-200/50">
                <h3 className="text-[22px] font-extrabold text-[#0F172A] mb-1 tracking-tight">Documents Required</h3>
                <p className="text-[14px] text-slate-400 mb-10 font-medium">Please upload the following documents to proceed</p>

                <div className="space-y-5">
                  {requiredDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[20px] hover:border-[#1D61FF]/30 hover:shadow-md hover:shadow-slate-200/40 transition-all group">
                      <div className="flex items-center gap-6">
                        <div className="w-[52px] h-[52px] bg-[#F0F5FF] rounded-xl flex items-center justify-center text-[#1D61FF] shadow-sm shadow-[#1D61FF]/5">
                          <FileText className="w-7 h-7 stroke-[2.5px]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-[16px] font-bold text-[#0F172A] tracking-tight">{doc.name}</h4>
                            {doc.isRequired && (
                              <span className="px-2 py-1 bg-[#F0FDF4] text-[#10B981] text-[10px] font-extrabold rounded-md uppercase tracking-wider">Required</span>
                            )}
                          </div>
                          <p className="text-[13px] text-slate-400 mt-1 font-medium">{doc.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {doc.status === 'verified' ? (
                          <>
                            <div className="flex items-center gap-2 text-[#10B981] text-[14px] font-bold">
                              <CheckCircle2 className="w-5 h-5 fill-current" />
                              Verified
                            </div>
                            <button className="px-7 py-2.5 bg-white border border-slate-100 text-slate-600 text-[14px] font-bold rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm">
                              View
                            </button>
                          </>
                        ) : (
                          <button className="flex items-center gap-2.5 px-7 py-2.5 border border-[#1D61FF]/20 text-[#1D61FF] text-[14px] font-bold rounded-xl hover:bg-[#1D61FF] hover:text-white hover:border-[#1D61FF] transition-all duration-300 shadow-sm shadow-[#1D61FF]/5">
                            <Upload className="w-4.5 h-4.5" />
                            Upload
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Verification Notice */}
                <div className="mt-10 p-6 bg-[#F0FDF9] border border-[#DCFCE7] rounded-[20px] flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#10B981] rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-[#10B981]/20">
                    <CheckCircle2 className="w-6 h-6 stroke-[3px]" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-[#166534]">Basic Verification</h4>
                    <p className="text-[13px] text-[#166534]/70 mt-1 leading-relaxed font-medium">
                      We verify document type, format and basic authenticity. Final verification will be done by the department.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button className="px-8 py-3.5 border border-slate-200 text-slate-600 text-[15px] font-bold rounded-2xl hover:bg-white hover:border-slate-300 transition-all shadow-sm active:scale-95">
                  ← Back
                </button>
                <button className="px-10 py-3.5 bg-[#1D61FF] text-white text-[15px] font-bold rounded-2xl hover:bg-[#1553DB] transition-all shadow-xl shadow-[#1D61FF]/30 flex items-center gap-3 active:scale-[0.98]">
                  Start Verification
                  <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                </button>
              </div>
            </div>

            {/* Help & Tips Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Help Card */}
              <div className="bg-[#111827] rounded-[24px] p-8 text-white shadow-xl shadow-slate-900/10">
                <h4 className="text-[18px] font-bold mb-6 tracking-tight">Need Help?</h4>
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 bg-white/10 rounded-[18px] text-[13px] font-bold hover:bg-white/20 transition-all group backdrop-blur-sm">
                    View Process Guide
                    <Eye className="w-5 h-5 text-white/40 group-hover:text-white" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 bg-white/10 rounded-[18px] text-[13px] font-bold hover:bg-white/20 transition-all group backdrop-blur-sm">
                    Chat with Support
                    <AlertCircle className="w-5 h-5 text-white/40 group-hover:text-white" />
                  </button>
                </div>
                <div className="mt-8 flex items-center gap-3 pt-6 border-t border-white/10">
                  <div className="w-10 h-10 bg-[#1D61FF] rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest leading-none">Call Us</p>
                    <p className="text-[15px] font-bold text-white mt-1 leading-none">1800-123-4567</p>
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-8 shadow-sm shadow-slate-200/50">
                <h4 className="text-[18px] font-bold text-[#0F172A] mb-6 tracking-tight">Quick Tips</h4>
                <ul className="space-y-4">
                  {[
                    "Ensure documents are clear and readable",
                    "File size should be less than 5MB",
                    "Allowed formats: JPG, PNG, PDF",
                    "Original documents preferred over photocopies"
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-slate-500 font-medium">
                      <div className="w-5 h-5 bg-[#F0FDF4] text-[#10B981] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[3px]" />
                      </div>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
