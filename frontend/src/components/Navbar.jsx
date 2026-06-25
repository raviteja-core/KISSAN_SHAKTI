import React, { useState, useEffect, useRef } from 'react';
import { Sprout, Wifi, WifiOff, Layers, Users, Briefcase, Wrench, LogOut, ShieldCheck, BriefcaseIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({
  activeTab,
  setActiveTab,
  isOnline
}) => {
  const { user, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menuName) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  return (
    <header className="glass sticky top-0 z-40 border-b border-emerald-100 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center">
            <Sprout size={28} className="animate-pulse" />
          </div>
          <div>
            <span className="text-xl font-extrabold text-emerald-950 tracking-tight flex items-center gap-1.5">
              KissanShakthi
            </span>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center gap-4">
          <nav ref={menuRef} className="flex bg-slate-100 p-1 rounded-xl">
            {(!user || user.role === 'farmer') && (
              <>
                {/* Market Place Menu */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setOpenMenu('crops')}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button
                    onClick={() => toggleMenu('crops')}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'dashboard' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers size={14} />
                    <span>Market Place</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${openMenu === 'crops' ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <div className={`absolute top-full left-0 pt-2 transition-all duration-200 z-50 ${openMenu === 'crops' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                    <div className="w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 overflow-hidden">
                      <button
                        onClick={() => { setActiveTab('dashboard'); setOpenMenu(null); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${activeTab === 'dashboard' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-600 font-semibold'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Layers size={14} />
                          <span>Crops Board</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Labor & Equipment Menu */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setOpenMenu('labor')}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button
                    onClick={() => toggleMenu('labor')}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                      ['equipment', 'workers', 'jobs'].includes(activeTab) ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users size={14} />
                    <span>Labor & Equipment</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${openMenu === 'labor' ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`absolute top-full left-0 pt-2 transition-all duration-200 z-50 ${openMenu === 'labor' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                    <div className="w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 overflow-hidden">
                      <button
                        onClick={() => { setActiveTab('equipment'); setOpenMenu(null); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${activeTab === 'equipment' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-600 font-semibold'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Wrench size={14} />
                          <span>Equipment Board</span>
                        </div>
                      </button>
                      <button
                        onClick={() => { setActiveTab('workers'); setOpenMenu(null); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${activeTab === 'workers' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-600 font-semibold'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users size={14} />
                          <span>Workers Registry</span>
                        </div>
                      </button>
                      <button
                        onClick={() => { setActiveTab('jobs'); setOpenMenu(null); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${activeTab === 'jobs' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-600 font-semibold'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Briefcase size={14} />
                          <span>Jobs Board</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {user?.role === 'laborer' && (
              <div className="px-3 py-2 rounded-lg text-xs sm:text-sm font-bold text-indigo-900 bg-white shadow-sm flex items-center gap-1.5">
                <BriefcaseIcon size={14} className="text-indigo-600" />
                <span>Labour Workspace Dashboard</span>
              </div>
            )}

            {user?.role === 'admin' && (
              <div className="px-3 py-2 rounded-lg text-xs sm:text-sm font-bold text-amber-900 bg-white shadow-sm flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-600" />
                <span>Admin Moderation Console</span>
              </div>
            )}
          </nav>

          {/* Hardware Connection Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200/50 text-xs font-bold select-none transition-all duration-300">
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse"></span>
                <Wifi size={14} className="text-emerald-600" />
                <span className="text-emerald-800 hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-md shadow-amber-500/50 animate-pulse"></span>
                <WifiOff size={14} className="text-amber-600 animate-bounce" />
                <span className="text-amber-800 hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* Logout / User Info */}
          {user && (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block text-[10px] uppercase font-extrabold tracking-wider text-slate-500 bg-slate-100 px-2.5 py-2 rounded-xl border border-slate-200">
                Role: {user.role}
              </span>
              <button
                onClick={logout}
                className="p-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-slate-500 transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
