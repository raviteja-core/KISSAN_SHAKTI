import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const Toast = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
      <div className={`px-6 py-3.5 rounded-2xl shadow-xl backdrop-blur-md border font-extrabold text-sm flex items-center gap-3 transition-all duration-300 ${
        toast.type === 'online' 
          ? 'bg-emerald-600/95 text-white border-emerald-400' 
          : 'bg-amber-600/95 text-white border-amber-500'
      }`}>
        {toast.type === 'online' ? <Wifi size={18} /> : <WifiOff size={18} />}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
