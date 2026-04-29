'use client';

import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { User, ShieldCheck, Settings2, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex w-full min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[280px]">
        <Topbar />
        <main className="flex-1 p-10 max-w-[1400px] mx-auto w-full">
          <div className="mb-10">
            <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">Profile Settings</h2>
            <p className="text-slate-500 text-[15px] font-medium mt-1">Manage your account details, notification preferences, and security settings.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { icon: User, title: 'Account details', description: 'Update your name, email, and profile information.' },
              { icon: Bell, title: 'Notifications', description: 'Customize alerts for document status and service updates.' },
              { icon: ShieldCheck, title: 'Security', description: 'Change password and protect your account with strong credentials.' },
            ].map((item) => (
              <div key={item.title} className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm shadow-slate-200/40">
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-[#EFF6FF] text-[#1D4ED8]">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-3">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
