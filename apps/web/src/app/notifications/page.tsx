'use client';

import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { Bell, Clock, Info } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="mb-10">
            <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">Notifications</h2>
            <p className="text-slate-500 text-[15px] font-medium mt-1">Stay informed with the latest updates on your document uploads and service requests.</p>
          </div>

          <div className="space-y-4">
            {[
              { title: 'Document detected', description: 'Your Aadhaar card upload was matched successfully.', time: '2 minutes ago', icon: Info },
              { title: 'Application progress', description: 'Your passport renewal request is now in review.', time: '1 hour ago', icon: Clock },
              { title: 'Verification reminder', description: 'Upload the remaining address proof to complete your application.', time: 'Yesterday', icon: Bell },
            ].map((item) => (
              <div key={item.title} className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm shadow-slate-200/40 flex items-start gap-5">
                <div className="w-12 h-12 rounded-3xl bg-[#EEF2FF] flex items-center justify-center text-[#1D4ED8]">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-[#0F172A]">{item.title}</h3>
                    <span className="text-sm text-slate-400">{item.time}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
