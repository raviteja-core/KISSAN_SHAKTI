import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, LayoutDashboard, Search, Filter, MapPin, TrendingUp, PackageSearch, LogOut, Sprout } from 'lucide-react';

export const BuyerDashboard = ({ crops }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Buyer Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-2 rounded-xl">
                <ShoppingCart size={20} />
              </div>
              <span className="font-black text-xl text-slate-800 tracking-tight">KissanMarket</span>
            </div>
            
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 font-bold text-sm transition-colors ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <LayoutDashboard size={18} />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <button 
                onClick={() => setActiveTab('marketplace')}
                className={`flex items-center gap-2 font-bold text-sm transition-colors ${activeTab === 'marketplace' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <PackageSearch size={18} />
                <span className="hidden sm:inline">Marketplace</span>
              </button>
              
              <div className="h-6 w-px bg-slate-200 mx-2"></div>
              
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {user?.name?.charAt(0) || 'B'}
                </div>
                <button 
                  onClick={logout}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' ? (
          <DashboardOverview user={user} crops={crops} />
        ) : (
          <MarketplaceView crops={crops} />
        )}
      </main>
    </div>
  );
};

const DashboardOverview = ({ user, crops }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Welcome back, {user?.name}</h1>
        <p className="text-slate-500 font-medium mt-1">Here is your market overview for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Cards */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <PackageSearch size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Active Inquiries</p>
            <p className="text-2xl font-black text-slate-800">0</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Market Trends</p>
            <p className="text-sm font-black text-emerald-600">Prices Stable</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Saved Listings</p>
            <p className="text-2xl font-black text-slate-800">0</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Recent Inquiries</h2>
          <button className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</button>
        </div>
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
            <PackageSearch className="text-slate-400" size={24} />
          </div>
          <h3 className="text-slate-800 font-bold mb-1">No recent activity</h3>
          <p className="text-slate-500 text-sm">You haven't made any inquiries yet. Explore the marketplace to find fresh produce.</p>
        </div>
      </div>
    </div>
  );
};

const MarketplaceView = ({ crops = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Basic filtering
  const filteredCrops = crops.filter(crop => 
    crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crop.farmer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Marketplace</h1>
          <p className="text-slate-500 font-medium mt-1">Browse fresh produce directly from farmers.</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search crops or farmers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button className="bg-white border border-slate-200 text-slate-600 p-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCrops.length > 0 ? (
          filteredCrops.map(crop => (
            <div key={crop.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <div className="h-48 bg-slate-100 relative">
                {crop.image ? (
                  <img src={crop.image} alt={crop.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Sprout size={48} />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                  {crop.quality}
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-800">{crop.name}</h3>
                  <p className="font-black text-emerald-600">₹{crop.price}<span className="text-xs font-medium text-slate-500">/{crop.quantity_unit}</span></p>
                </div>
                
                <p className="text-sm text-slate-500 font-medium mb-4">{crop.quantity} Available</p>
                
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded-lg mb-4">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="truncate">{crop.farmer_name} • {crop.location}</span>
                </div>
                
                <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                  View Details
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-100 border-dashed">
            <Sprout className="mx-auto text-slate-300 mb-3" size={32} />
            <h3 className="text-slate-700 font-bold">No crops found</h3>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};
