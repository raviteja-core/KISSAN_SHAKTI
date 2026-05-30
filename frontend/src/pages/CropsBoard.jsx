import React, { useState } from 'react';
import { Plus, Sprout, Trash2, CheckCircle, Clock } from 'lucide-react';

export const CropsBoard = ({
  crops,
  handleAddCrop,
  handleDeleteItem
}) => {
  // Form states - Crops
  const [cropName, setCropName] = useState('');
  const [cropCategory, setCropCategory] = useState('vegetable');
  const [cropQuantity, setCropQuantity] = useState('');
  const [cropPrice, setCropPrice] = useState('');
  const [cropHarvestDate, setCropHarvestDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cropName || !cropQuantity || !cropPrice || !cropHarvestDate) return;

    handleAddCrop({
      name: cropName,
      category: cropCategory,
      quantity: cropQuantity,
      price: cropPrice,
      harvestDate: cropHarvestDate
    });

    setCropName('');
    setCropQuantity('');
    setCropPrice('');
    setCropHarvestDate('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="glass p-6 rounded-3xl shadow-sm border border-emerald-100/50 h-fit">
        <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="text-emerald-600" size={18} />
          List Harvest Crop
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Crop Name</label>
            <input
              type="text"
              placeholder="e.g. Alphonso Mango, Wheat"
              value={cropName}
              onChange={e => setCropName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold transition-all duration-200 bg-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={cropCategory}
                onChange={e => setCropCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white/50"
              >
                <option value="vegetable">Vegetable</option>
                <option value="grain">Grain</option>
                <option value="fruit">Fruit</option>
                <option value="legume">Legume</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Quantity (kg)</label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={cropQuantity}
                onChange={e => setCropQuantity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white/50 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Price / kg (₹)</label>
              <input
                type="number"
                placeholder="e.g. 45"
                value={cropPrice}
                onChange={e => setCropPrice(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white/50 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Harvest Date</label>
              <input
                type="date"
                value={cropHarvestDate}
                onChange={e => setCropHarvestDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white/50 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10"
          >
            <Plus size={16} />
            <span>List Local Crop Listing</span>
          </button>
        </form>
      </div>

      {/* List and Sync drawer */}
      <div className="lg:col-span-2 space-y-6">
        {/* Table of Crops */}
        <div className="glass p-6 rounded-3xl border border-emerald-100/50 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center justify-between">
            <span>Persistent Crops Table: <code className="text-xs text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">crops</code></span>
            <span className="text-xs text-slate-400 font-medium">Dexie Local Storage</span>
          </h2>

          {crops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Sprout size={48} className="text-slate-200 mb-2" />
              <p className="text-xs font-extrabold">No crop records found in local memory.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="pb-3">Crop Name</th>
                    <th className="pb-3">Qty & Price</th>
                    <th className="pb-3">Harvest Date</th>
                    <th className="pb-3 text-center">Sync State</th>
                    <th className="pb-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                  {crops.map((crop) => (
                    <tr key={crop.id} className="hover:bg-slate-50/30">
                      <td className="py-3">
                        <div className="font-extrabold text-slate-900">{crop.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-medium">{crop.category}</div>
                      </td>
                      <td className="py-3">
                        <div>{crop.quantity_kg.toLocaleString()} kg</div>
                        <div className="text-[11px] font-bold text-emerald-700">₹{crop.price_per_kg}/kg</div>
                      </td>
                      <td className="py-3 text-slate-500 font-medium">
                        {crop.harvest_date}
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex">
                          {crop.sync_status === 'synced' ? (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-100 font-extrabold flex items-center gap-1">
                              <CheckCircle size={10} /> Synced
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-100 font-extrabold flex items-center gap-1 animate-pulse">
                              <Clock size={10} /> Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteItem('crops', crop.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-all duration-200 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


      </div>
    </div>
  );
};
