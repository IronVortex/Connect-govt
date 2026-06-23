'use client';

import React from 'react';
import { PageLayout } from '../../../components/layout/PageLayout';
import { 
  Car, 
  ChevronRight, 
  ArrowRight,
  Search,
  Clock,
  Info,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../../lib/utils';

const services = [
  { 
    id: 'new-car-registration',
    name: 'New Car Registration', 
    description: 'Register a new private vehicle with the RTO.',
    time: '7-10 Working Days',
    fee: '₹1,500',
    popular: true
  },
  { 
    id: 'driving-license',
    name: 'Driving License Renewal', 
    description: 'Renew your permanent driving license before expiry.',
    time: '3-5 Working Days',
    fee: '₹450',
    popular: true
  },
  { 
    id: 'transfer-ownership',
    name: 'Transfer of Ownership', 
    description: 'Transfer vehicle ownership to another person.',
    time: '15-20 Working Days',
    fee: '₹2,000',
    popular: false
  },
  { 
    id: 'duplicate-rc',
    name: 'Duplicate RC', 
    description: 'Apply for a duplicate Registration Certificate.',
    time: '10-12 Working Days',
    fee: '₹800',
    popular: false
  },
  { 
    id: 'address-change',
    name: 'Change of Address', 
    description: 'Update your address in the vehicle registration records.',
    time: '7-10 Working Days',
    fee: '₹600',
    popular: false
  },
  { 
    id: 'hypothecation-termination',
    name: 'Hypothecation Termination', 
    description: 'Remove loan entry from your vehicle RC after loan closure.',
    time: '5-7 Working Days',
    fee: '₹500',
    popular: false
  },
];

export default function RtoServicesPage() {
  return (
    <PageLayout>
          <nav className="flex items-center gap-2 text-[13px] text-slate-400 mb-8 font-medium">
            <Link href="/dashboard" className="hover:text-[#1D61FF] transition-colors">Dashboard</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/departments" className="hover:text-[#1D61FF] transition-colors">Departments</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600">Transport Department (RTO)</span>
          </nav>

          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-500 rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Car className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">RTO Services</h2>
                <p className="text-slate-500 text-[15px] font-medium mt-1">Select a service to start your application.</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search RTO services..."
                className="pl-11 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1D61FF]/10 focus:border-[#1D61FF] transition-all w-72"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Link 
                key={service.id} 
                href="/service-detail"
                className="group bg-white rounded-[24px] p-8 border border-slate-100 hover:border-[#1D61FF] hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col relative overflow-hidden"
              >
                {service.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-[#10B981] text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-sm">
                      Popular
                    </div>
                  </div>
                )}
                
                <h3 className="text-[18px] font-extrabold text-[#0F172A] group-hover:text-[#1D61FF] transition-colors tracking-tight mb-2">
                  {service.name}
                </h3>
                <p className="text-[13px] text-slate-400 font-medium mb-8 flex-1">
                  {service.description}
                </p>
                
                <div className="space-y-3 pt-6 border-t border-slate-50">
                  <div className="flex items-center justify-between text-[12px] font-bold">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      Time
                    </div>
                    <span className="text-slate-600">{service.time}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] font-bold">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Fee
                    </div>
                    <span className="text-[#0F172A]">{service.fee}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center py-3 bg-slate-50 group-hover:bg-[#F0F5FF] rounded-xl text-[13px] font-bold text-slate-500 group-hover:text-[#1D61FF] transition-all">
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
    </PageLayout>
  );
}
