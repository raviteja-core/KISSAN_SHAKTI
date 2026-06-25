import React, { useState } from 'react';
import { Sprout, Users, ShieldAlert, ArrowRight, ShoppingCart } from 'lucide-react';
import { FarmerAuth } from './FarmerAuth';
import { WorkerAuth } from './WorkerAuth';
import { AdminAuth } from './AdminAuth';
import { BuyerAuth } from './BuyerAuth';

export const LoginSelection = () => {
  const [selectedRole, setSelectedRole] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('admin')) return 'admin';
    if (path.includes('buyer')) return 'buyer';
    if (path.includes('farmer')) return 'farmer';
    if (path.includes('labour') || path.includes('worker') || path.includes('labor')) return 'laborer';
    return null;
  });

  const roles = [
    {
      id: 'buyer',
      title: 'Buyer Portal',
      description: 'Access the marketplace, purchase fresh produce directly from farmers, and manage your inquiries.',
      icon: <ShoppingCart size={36} className="text-blue-600 animate-pulse-soft" />,
      colorClass: 'border-blue-100 hover:border-blue-400 bg-blue-50/10'
    },
    {
      id: 'farmer',
      title: 'Farmer Portal',
      description: 'Manage crop listings, hire local labour resources, list agricultural equipment, and request rentals.',
      icon: <Sprout size={36} className="text-emerald-600 animate-pulse-soft" />,
      colorClass: 'border-emerald-100 hover:border-emerald-400 bg-emerald-50/10'
    },
    {
      id: 'laborer',
      title: 'Labourer Registry',
      description: 'Create labour profiles, discover local jobs, track working days, and apply for verified farm tasks.',
      icon: <Users size={36} className="text-indigo-600" />,
      colorClass: 'border-indigo-100 hover:border-indigo-400 bg-indigo-50/10'
    },
    {
      id: 'admin',
      title: 'Admin Console',
      description: 'Monitor identity approvals, evaluate background blacklist checks, and manage regional platform integrity.',
      icon: <ShieldAlert size={36} className="text-amber-600" />,
      colorClass: 'border-amber-100 hover:border-amber-400 bg-amber-50/10'
    }
  ];

  if (selectedRole === 'buyer') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <BuyerAuth onBack={() => setSelectedRole(null)} />
      </div>
    );
  }

  if (selectedRole === 'farmer') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <FarmerAuth onBack={() => setSelectedRole(null)} />
      </div>
    );
  }

  if (selectedRole === 'laborer') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <WorkerAuth onBack={() => setSelectedRole(null)} />
      </div>
    );
  }

  if (selectedRole === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <AdminAuth onBack={() => setSelectedRole(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
            <Sprout size={36} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-black text-slate-900 tracking-tight">
            KissanShakthi
          </h2>
          <p className="mt-2 text-center text-sm font-semibold text-slate-500">
            Empowering Farmers & Labourers with Digital Tools
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-extrabold text-center uppercase tracking-wider">
            Choose Your Account Role Portal
          </p>

          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`w-full p-6 text-left border rounded-[2rem] flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-md cursor-pointer bg-white group ${role.colorClass}`}
            >
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
                  {role.icon}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                    {role.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {role.description}
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-350 group-hover:text-slate-700 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
