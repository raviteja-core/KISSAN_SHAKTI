import React, { useState, useEffect } from 'react';
import { Plus, Wrench, Trash2, Search, Contact, MapPin, Phone, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const EquipmentBoard = () => {
  const { user } = useAuth();

  // State lists
  const [equipmentList, setEquipmentList] = useState([]);
  const [rentalsList, setRentalsList] = useState([]);

  // Sub-tabs: Available Machinery vs Rental Requests
  const [subTab, setSubTab] = useState('available');

  // Form states
  const [machineName, setMachineName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [location, setLocation] = useState('Sinnar Region');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Interactivity
  const [selectedContact, setSelectedContact] = useState(null);
  const [rentingEquipment, setRentingEquipment] = useState(null);
  const [startDate, setStartDate] = useState('2026-06-26');
  const [endDate, setEndDate] = useState('2026-06-28');
  const [rentalMessage, setRentalMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form owner details
  useEffect(() => {
    if (user) {
      setOwnerName(user.full_name || '');
      setOwnerPhone(user.phone || '');
    }
  }, [user]);

  // Load equipment and rentals
  const loadData = async () => {
    setIsLoading(true);
    try {
      const eqData = await api.listEquipment();
      setEquipmentList(eqData.items || []);
      
      if (user && user.id) {
        const rentalData = await api.listRentals(user.id);
        setRentalsList(rentalData.items || []);
      }
    } catch (err) {
      console.error("Failed to load equipment or rentals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please log in to list equipment");
      return;
    }
    if (!machineName || !dailyRate || !location) return;

    try {
      const res = await api.createEquipment({
        owner_id: user.id,
        name: machineName,
        category: "Machinery",
        description: `Listed by ${ownerName}. Contact: ${ownerPhone}`,
        daily_rate: parseFloat(dailyRate),
        location: location,
        available: true
      });
      if (res && res.item) {
        setEquipmentList([res.item, ...equipmentList]);
        setMachineName('');
        setDailyRate('');
        alert("Equipment listed successfully!");
      }
    } catch (err) {
      alert(err.message || 'Failed to list equipment');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      await api.deleteEquipment(id);
      setEquipmentList(equipmentList.filter(item => item.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete equipment');
    }
  };

  const handleRequestRentalSubmit = async () => {
    if (!user || !rentingEquipment) return;
    try {
      const payload = {
        equipment_id: rentingEquipment.id,
        renter_id: user.id,
        start_date: startDate,
        end_date: endDate,
        message: rentalMessage
      };
      await api.createRental(payload);
      
      // Reload rentals & close modal
      const rentalData = await api.listRentals(user.id);
      setRentalsList(rentalData.items || []);
      setRentingEquipment(null);
      setRentalMessage('');
      alert('Rental request submitted successfully!');
    } catch (err) {
      alert(err.message || 'Failed to request rental');
    }
  };

  const handleUpdateRentalStatus = async (rentalId, status) => {
    try {
      await api.updateRental(rentalId, status);
      // Reload both lists to sync state
      await loadData();
      alert(`Rental request marked as ${status}`);
    } catch (err) {
      alert(err.message || 'Failed to update rental status');
    }
  };

  // Filter listings based on search query
  const filteredEquipment = equipmentList.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.owner?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.location || '').toLowerCase().includes(searchQuery.toLowerCase())
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
          Rental Requests ({rentalsList.length})
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

              {isLoading ? (
                <div className="text-center py-12 text-slate-400 font-bold text-xs">Loading machinery...</div>
              ) : filteredEquipment.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Wrench size={48} className="text-slate-200 mb-2" />
                  <p className="text-xs font-extrabold">No machinery matching search criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEquipment.map((machine) => {
                    const isOwner = user && (machine.owner_id === user.id || machine.owner?.id === user.id);
                    const ownerNameText = machine.owner?.full_name || machine.owner || "Unknown Owner";
                    const ownerPhoneText = machine.owner?.phone || "+91 99999 99999";
                    const dailyRateVal = machine.daily_rate || machine.rate || 0;

                    return (
                      <div key={machine.id} className="bg-white/50 border border-slate-100 rounded-2xl p-5 space-y-4 hover:border-emerald-100 hover:shadow-sm transition-all duration-200">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                              <Wrench size={14} className="text-emerald-600" />
                              {machine.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              {machine.available ? (
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-100 font-extrabold flex items-center gap-1">
                                  Available
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-100 font-extrabold flex items-center gap-1">
                                  Rented Out
                                </span>
                              )}
                              {isOwner && (
                                <button
                                  onClick={() => handleDelete(machine.id)}
                                  className="text-slate-350 hover:text-red-500 transition-colors duration-150 p-1 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 space-y-1 text-xs text-slate-500 font-medium">
                            <p className="flex items-center gap-1.5">
                              <Contact size={12} className="text-slate-400" /> {ownerNameText}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-slate-400" /> {machine.location}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-100/50">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Rental Cost</span>
                            <span className="text-sm font-extrabold text-emerald-800">₹{dailyRateVal} / Day</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedContact({ owner: ownerNameText, phone: ownerPhoneText })}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              Contact
                            </button>
                            {!isOwner && machine.available && (
                              <button 
                                onClick={() => setRentingEquipment(machine)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                Request Rental
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-800 mb-6">
            Rental Requests Queue
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400 font-bold text-xs">Loading rental requests...</div>
          ) : rentalsList.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Wrench size={36} className="mx-auto mb-2 text-slate-200" />
              <p className="text-xs font-bold">No rental requests</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Pending rental requests will be shown here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rentalsList.map((rental) => {
                const isOwner = user && rental.owner_id === user.id;
                const isRenter = user && rental.renter_id === user.id;
                const statusColors = {
                  'REQUESTED': 'bg-amber-50 text-amber-700 border border-amber-100',
                  'ACCEPTED': 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                  'REJECTED': 'bg-red-50 text-red-700 border border-red-100',
                  'COMPLETED': 'bg-slate-100 text-slate-700 border border-slate-200',
                  'ACTIVE': 'bg-blue-50 text-blue-700 border border-blue-100',
                };
                const badgeColor = statusColors[rental.status] || 'bg-slate-50 text-slate-500 border border-slate-100';
                
                const equipName = rental.equipment?.name || "Equipment Rental";
                const renterName = rental.renter?.full_name || "Unknown Farmer";
                const ownerName = rental.owner?.full_name || "Unknown Owner";

                return (
                  <div key={rental.id} className="bg-white/50 border border-slate-100 rounded-2xl p-5 space-y-4 hover:border-emerald-100 hover:shadow-sm transition-all duration-200">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-extrabold inline-block mb-1.5 ${badgeColor}`}>
                            {rental.status}
                          </span>
                          <h4 className="font-extrabold text-slate-800 text-sm">
                            {equipName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            {isOwner ? "Requested from you" : isRenter ? "Requested by you" : ""}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">Total Cost</span>
                          <strong className="text-emerald-800 text-sm">₹{rental.total_cost}</strong>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1 text-xs text-slate-500 font-medium">
                        <p>
                          <span className="font-bold text-slate-600">Duration:</span> {rental.start_date} to {rental.end_date} ({rental.days} days)
                        </p>
                        <p>
                          <span className="font-bold text-slate-600">Renter:</span> {renterName} ({rental.renter?.phone || "N/A"})
                        </p>
                        <p>
                          <span className="font-bold text-slate-600">Owner:</span> {ownerName} ({rental.owner?.phone || "N/A"})
                        </p>
                        {rental.message && (
                          <p className="bg-slate-100/50 p-2.5 rounded-xl text-[11px] text-slate-600 italic mt-2 border border-slate-100">
                            "{rental.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    {isOwner && rental.status === 'REQUESTED' && (
                      <div className="flex gap-2 pt-2 border-t border-slate-100/50">
                        <button
                          onClick={() => handleUpdateRentalStatus(rental.id, 'ACCEPTED')}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Accept Request
                        </button>
                        <button
                          onClick={() => handleUpdateRentalStatus(rental.id, 'REJECTED')}
                          className="flex-1 py-2 bg-red-550 hover:bg-red-650 text-white bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {isOwner && rental.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleUpdateRentalStatus(rental.id, 'COMPLETED')}
                        className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer border-t border-slate-100/50"
                      >
                        Mark Rental Completed & Returned
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Direct Contact Modal Overlay */}
      {selectedContact && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-extrabold text-slate-800">
              Connect Directly with {selectedContact.owner}
            </h3>
            
            <p className="text-xs text-slate-500 font-semibold px-4 leading-relaxed">
              Choose how to connect directly:
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

      {/* Request Rental Modal Overlay */}
      {rentingEquipment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-extrabold text-slate-800 text-center">
              Request Rental: {rentingEquipment.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Message / Requirements</label>
                <textarea
                  value={rentalMessage}
                  onChange={e => setRentalMessage(e.target.value)}
                  placeholder="Describe your soil conditions, location or rental requirements..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold h-20 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex justify-between items-center text-emerald-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">Estimated Cost</span>
                  <span className="text-xs font-medium">₹{rentingEquipment.daily_rate || rentingEquipment.rate} / Day</span>
                </div>
                <strong className="text-lg font-extrabold">
                  ₹{(rentingEquipment.daily_rate || rentingEquipment.rate) * Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1 || 1)}
                </strong>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setRentingEquipment(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRentalSubmit}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs transition duration-200 cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
