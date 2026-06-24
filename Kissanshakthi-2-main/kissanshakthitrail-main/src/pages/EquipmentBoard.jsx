import React, { useState } from 'react';
import { Plus, Wrench, Trash2, Search, Contact, MapPin, Phone, MessageCircle } from 'lucide-react';

export const EquipmentBoard = () => {
  // Mock initial equipment listings matching the screenshot
  const [equipmentList, setEquipmentList] = useState([
    {
      id: 1,
      name: "Maschio Gaspardo Rotavator",
      owner: "Vikas Patil",
      phone: "+91 98556 67788",
      location: "Sinnar Region",
      rate: 1200,
      sync_status: "synced"
    },
    {
      id: 2,
      name: "Preet 982 Paddy Harvester",
      owner: "Gurpreet Singh",
      phone: "+91 98765 43210",
      location: "Sinnar Region",
      rate: 5000,
      sync_status: "synced"
    },
    {
      id: 3,
      name: "Mahindra 275 DI Tractor",
      owner: "Rajesh Kumar",
      phone: "+91 91234 56789",
      location: "Pimplad Village",
      rate: 1500,
      sync_status: "synced"
    }
  ]);

  // Sub-tabs: Available Machinery vs Rental Requests
  const [subTab, setSubTab] = useState('available');

  // Form states
  const [machineName, setMachineName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [location, setLocation] = useState('Sinnar Region');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected contact for the direct modal
  const [selectedContact, setSelectedContact] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!machineName || !ownerName || !ownerPhone || !dailyRate || !location) return;

    const newEquipment = {
      id: Date.now(),
      name: machineName,
      owner: ownerName,
      phone: ownerPhone,
      location: location,
      rate: parseFloat(dailyRate),
      sync_status: "synced" // Auto-synced for prototype consistency
    };

    setEquipmentList([newEquipment, ...equipmentList]);

    // Reset fields
    setMachineName('');
    setOwnerName('');
    setOwnerPhone('');
    setDailyRate('');
  };

  const handleDelete = (id) => {
    setEquipmentList(equipmentList.filter(item => item.id !== id));
  };

  // Filter listings based on search query
  const filteredEquipment = equipmentList.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex gap-2 border-b border-slate-100 pb-2">
        <button
          onClick={() => setSubTab('available')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
            subTab === 'available' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Available Machinery ({filteredEquipment.length})
        </button>
        <button
          onClick={() => setSubTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
            subTab === 'requests' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Rental Requests (1)
        </button>
      </div>

      {subTab === 'available' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Side */}
          <div className="glass p-6 rounded-3xl shadow-sm border border-emerald-100/50 h-fit">
            <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="text-emerald-600" size={18} />
              List Machine for Rent
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Machine Name & Model</label>
                <input
                  type="text"
                  placeholder="e.g. Mahindra 275 DI Tractor"
                  value={machineName}
                  onChange={e => setMachineName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold transition-all duration-200 bg-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Owner Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vikas Patil"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold transition-all duration-200 bg-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Owner Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98556 67788"
                    value={ownerPhone}
                    onChange={e => setOwnerPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white/50 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Daily Rate (₹)</label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={dailyRate}
                    onChange={e => setDailyRate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white/50 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Location (Village/Region)</label>
                <input
                  type="text"
                  placeholder="Sinnar Region"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white/50 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10 text-sm"
              >
                <Plus size={16} />
                <span>List Machinery for Rent</span>
              </button>
            </form>
          </div>

          {/* Listings Drawer */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-base font-extrabold text-slate-800">
                  Persistent Equipment listings: <code className="text-xs text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">equipment</code>
                </h2>
                
                {/* Search box */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search machines or locations..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              {filteredEquipment.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Wrench size={48} className="text-slate-200 mb-2" />
                  <p className="text-xs font-extrabold">No machinery matching search criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEquipment.map((machine) => (
                    <div key={machine.id} className="bg-white/50 border border-slate-100 rounded-2xl p-5 space-y-4 hover:border-emerald-100 hover:shadow-sm transition-all duration-200">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                            <Wrench size={14} className="text-emerald-600" />
                            {machine.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-100 font-extrabold flex items-center gap-1">
                              Synced
                            </span>
                            <button
                              onClick={() => handleDelete(machine.id)}
                              className="text-slate-350 hover:text-red-500 transition-colors duration-150 p-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1 text-xs text-slate-500 font-medium">
                          <p className="flex items-center gap-1.5">
                            <Contact size={12} className="text-slate-400" /> {machine.owner}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-slate-400" /> {machine.location}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100/50">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Rental Cost</span>
                          <span className="text-sm font-extrabold text-emerald-800">₹{machine.rate} / Day</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedContact({ owner: machine.owner, phone: machine.phone })}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            Contact
                          </button>
                          <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer">
                            Request Rental
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm text-center py-12 text-slate-400">
          <Wrench size={36} className="mx-auto mb-2 text-slate-200" />
          <p className="text-xs font-bold">Rental Requests</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Pending rental requests will be shown here.</p>
          
          <div className="mt-6 max-w-md mx-auto p-4 bg-white/50 border border-slate-100 rounded-2xl text-left text-xs font-semibold text-slate-700 flex justify-between items-center">
            <div>
              <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-100 font-extrabold inline-block mb-1.5">
                Pending Approval
              </span>
              <h4 className="font-extrabold text-slate-800 text-sm">Tractor Soil Tilling Request</h4>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Requester: Vikas Patil • Area: Pimplad Village</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">Estimated Cost</span>
              <strong className="text-emerald-800 text-sm">₹1,500/Day</strong>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal Popup Overlay */}
      {selectedContact && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-extrabold text-slate-800">
              Connect Directly with {selectedContact.owner}
            </h3>
            
            <p className="text-xs text-slate-500 font-semibold px-4 leading-relaxed">
              You are accessing contact details offline. Choose how to connect directly:
            </p>

            <div className="bg-slate-50 border border-slate-100 py-3.5 px-6 rounded-2xl font-bold text-slate-800 tracking-wider text-sm select-all">
              {selectedContact.phone}
            </div>

            <div className="flex gap-4 pt-2">
              <a 
                href={`tel:${selectedContact.phone.replace(/\s+/g, '')}`}
                className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs transition duration-200 shadow-sm"
              >
                <Phone size={14} className="text-slate-500" />
                <span>Call Phone</span>
              </a>
              <a 
                href={`https://wa.me/${selectedContact.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-[#00a884] hover:bg-[#009675] text-white rounded-2xl font-bold flex items-center justify-center gap-2 text-xs transition duration-200 shadow-sm"
              >
                <MessageCircle size={14} />
                <span>WhatsApp</span>
              </a>
            </div>

            <button 
              onClick={() => setSelectedContact(null)}
              className="text-slate-400 hover:text-slate-600 font-bold transition-all text-xs cursor-pointer block mx-auto pt-2 hover:underline"
            >
              Cancel / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
