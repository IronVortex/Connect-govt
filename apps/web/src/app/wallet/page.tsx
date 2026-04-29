'use client';

import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { CreditCard, ShieldCheck, Wallet } from 'lucide-react';

export default function WalletPage() {
  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="mb-10">
            <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">Document Wallet</h2>
            <p className="text-slate-500 text-[15px] font-medium mt-1">Store your submitted documents and review upload history in one place.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {[
              { icon: Wallet, title: 'Secure storage', text: 'A private place for your verified documents and submission receipts.' },
              { icon: CreditCard, title: 'Fast access', text: 'Find your uploaded documents quickly when preparing a new application.' },
              { icon: ShieldCheck, title: 'Safe review', text: 'Document status and detection history are visible in one panel.' },
            ].map((item) => (
              <div key={item.title} className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm shadow-slate-200/40">
                <div className="w-14 h-14 rounded-[18px] bg-[#EEF2FF] flex items-center justify-center text-[#1D4ED8] mb-5">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-3">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
