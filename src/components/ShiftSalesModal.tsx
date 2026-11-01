import React, { useState } from 'react';
import { Shift } from '../types';
import { StorageService } from '../services/storage';
import { Save, X } from 'lucide-react';

interface Props {
  shift: Shift;
  currency: string;
  onClose: () => void;
  onUpdated: () => void;
}

export const ShiftSalesModal: React.FC<Props> = ({ shift, currency, onClose, onUpdated }) => {
  const [cashStr, setCashStr] = useState(((shift.cashSales || 0) / 100).toString());
  const [visaStr, setVisaStr] = useState(((shift.visaSales || 0) / 100).toString());
  const [instapayStr, setInstapayStr] = useState(((shift.instapaySales || 0) / 100).toString());
  const [ewalletStr, setEwalletStr] = useState(((shift.ewalletSales || 0) / 100).toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cash = Math.max(0, Math.round((parseFloat(cashStr) || 0) * 100));
    const visa = Math.max(0, Math.round((parseFloat(visaStr) || 0) * 100));
    const instapay = Math.max(0, Math.round((parseFloat(instapayStr) || 0) * 100));
    const ewallet = Math.max(0, Math.round((parseFloat(ewalletStr) || 0) * 100));
    StorageService.updateShiftSales(shift.id, cash, visa, instapay, ewallet);
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white">
            تعديل إجماليات مبيعات الوردية #{shift.shiftNumber}
          </h3>
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
            <label className="font-bold text-slate-300 block mb-1">
              مبيعات الكاش النقدية ({currency}):
            </label>
            <input
              type="number"
              step="0.01"
              value={cashStr}
              onChange={(e) => setCashStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-emerald-400"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">
              مبيعات الفيزا والبطاقات ({currency}):
            </label>
            <input
              type="number"
              step="0.01"
              value={visaStr}
              onChange={(e) => setVisaStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-sky-400"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">
              مبيعات إنستاباي InstaPay ({currency}):
            </label>
            <input
              type="number"
              step="0.01"
              value={instapayStr}
              onChange={(e) => setInstapayStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-purple-400"
            />
          </div>
          <div>
            <label className="font-bold text-slate-300 block mb-1">
              مبيعات المحافظ الإلكترونية ({currency}):
            </label>
            <input
              type="number"
              step="0.01"
              value={ewalletStr}
              onChange={(e) => setEwalletStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-amber-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ التعديلات</span>
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
