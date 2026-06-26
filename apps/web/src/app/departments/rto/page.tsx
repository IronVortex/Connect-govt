'use client';

import React, { useState } from 'react';
import { PageLayout } from '../../../components/layout/PageLayout';
import { 
  Car, 
  ChevronRight, 
  Search,
  Clock,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../../lib/utils';
import { Input } from '../../../components/ui/Input';

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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout>
      {/* Standard Segment Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-6" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
        <Link href="/departments" className="hover:text-blue-600 transition-colors">Departments</Link>
        <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
        <span className="text-slate-800 font-semibold truncate">Transport Department (RTO)</span>
      </nav>

      {/* Header Profile Summary Component */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">RTO Services</h2>
            <p className="text-slate-500 text-xs font-medium">Select an automated operational workspace to initiate your application.</p>
          </div>
        </div>
        <div className="w-full sm:w-64 shrink-0">
          <Input 
            id="rto-search"
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search RTO workflows..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Workflow Application Matrix Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredServices.map((service) => (
          <Link 
            key={service.id} 
            href="/service-detail"
            className="group bg-white rounded-xl p-5 border border-slate-200/70 hover:border-blue-500 hover:shadow-2xs transition-all duration-150 flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                  {service.name}
                </h3>
                {service.popular && (
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wide shrink-0">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium leading-normal mb-6">
                {service.description}
              </p>
            </div>
            
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] font-medium">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Turnaround Time</span>
                </div>
                <span className="text-slate-700 font-semibold">{service.time}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Statutory Fee</span>
                </div>
                <span className="text-slate-900 font-bold">{service.fee}</span>
              </div>
              
              <div className="mt-4 pt-2">
                <div className="w-full flex items-center justify-center py-2 bg-slate-50 group-hover:bg-blue-50/50 rounded-lg text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-all duration-150">
                  <span>Initialize Service</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform duration-150" />
                </div>
              </div>
            </div>
          </Link>
        ))}

        {filteredServices.length === 0 && (
          <div className="col-span-full text-center py-12 rounded-xl border border-dashed border-slate-200 bg-white">
            <p className="text-xs font-medium text-slate-400">No regulatory tasks correspond with your filter options.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}