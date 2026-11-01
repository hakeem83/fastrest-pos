import React, { useState } from 'react';
import { RestaurantSettings } from '../types';
import { StorageService } from '../services/storage';
import { Play, X } from 'lucide-react';

interface Props {
  settings: RestaurantSettings;
  onClose: () => void;
  onShiftOpened: () => void;
}

export const OpenShiftModal: React.FC<Props> = ({ settings, onClose, onShiftOpened }) => {
  const [cashierName, setCashierName] = useState('أحمد كمال');
  const [custodyStr, setCustodyStr] = useState('1500');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const custodyMinor = Math.max(0, Math.round((parseFloat(custodyStr) || 0) * 100));
    StorageService.openShift(cashierName.trim() || 'كاشير الفترة', custodyMinor);
    onShiftOpened();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white">فتح وردية كاشير جديدة</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">اسم الكاشير المستلم:</label>
            <input
              type="text"
              required
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">
              عهدة بداية الوردية النقدية بالدرج ({settings.currency}):
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={custodyStr}
              onChange={(e) => setCustodyStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-mono text-amber-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>بدء واستلام الوردية</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
};
