'use client';

import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { LifeBuoy, Mail, Phone, MessageCircle } from "lucide-react";
export default function SupportPage() {
  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="mb-10">
            <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">Help & Support</h2>
            <p className="text-slate-500 text-[15px] font-medium mt-1">Need assistance? Our support team is ready to help you complete your document submission.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { icon: MessageCircle, title: 'Live chat', text: 'Start a real-time conversation with our support team.' },
              { icon: Mail, title: 'Email support', text: 'Send a request and receive a detailed response within 24 hours.' },
              { icon: Phone, title: 'Phone support', text: 'Call our helpline for urgent assistance and guidance.' },
            ].map((item) => (
              <div key={item.title} className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm shadow-slate-200/40">
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-[#EFF6FF] text-[#1D4ED8]">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-3">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[32px] border border-[#E0E7FF] bg-[#EEF2FF] p-8 shadow-sm shadow-slate-200/40">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#0F172A]">Need immediate help?</h3>
                <p className="text-sm text-slate-600 mt-1">Reach out to our helpline for fast verification support and document guidance.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="mailto:support@connectgov.example" className="rounded-2xl bg-[#1D61FF] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1553DB] transition-colors">Email support</a>
                <a href="tel:+18001234567" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Call now</a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
