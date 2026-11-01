import React, { useState } from 'react';
import { RestaurantSettings } from '../types';
import { StorageService } from '../services/storage';
import { CheckCircle2, Save } from 'lucide-react';

interface Props {
  settings: RestaurantSettings;
  onSettingsUpdated: (newSettings: RestaurantSettings) => void;
}

export const AdminSecurityModal: React.FC<Props> = ({ settings, onSettingsUpdated }) => {
  const [restaurantName, setRestaurantName] = useState(settings.restaurantName);
  const [branchName, setBranchName] = useState(settings.branchName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [taxNumber, setTaxNumber] = useState(settings.taxNumber || '');
  const [footerNote, setFooterNote] = useState(settings.footerNote);
  const [adminPin, setAdminPin] = useState(settings.adminPin || '1234');
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RestaurantSettings = {
      ...settings,
      restaurantName: restaurantName.trim(),
      branchName: branchName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      taxNumber: taxNumber.trim(),
      footerNote: footerNote.trim(),
      adminPin: adminPin.trim() || '1234',
    };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
    setSavedMsg('تم حفظ إعدادات الهوية والطباعة ورمز PIN بنجاح');
    setTimeout(() => setSavedMsg(''), 3500);
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs max-w-2xl"
    >
      {savedMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-slate-300 block mb-1">اسم المطعم / المنشأة:</label>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="font-bold text-slate-300 block mb-1">اسم الفرع:</label>
          <input
            type="text"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="font-bold text-slate-300 block mb-1">رقم الهاتف:</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />
        </div>
        <div>
          <label className="font-bold text-slate-300 block mb-1">السجل التجاري / الضريبي:</label>
          <input
            type="text"
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="font-bold text-slate-300 block mb-1">العنوان التفصيلي:</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="font-bold text-slate-300 block mb-1">رسالة تذييل الفاتورة:</label>
          <input
            type="text"
            value={footerNote}
            onChange={(e) => setFooterNote(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="font-bold text-slate-300 block mb-1">رمز دخول الإدارة السري (PIN):</label>
          <input
            type="text"
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono"
          />
        </div>
      </div>

      <button
        type="submit"
        className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
      >
        <Save className="w-4 h-4" />
        <span>حفظ الإعدادات</span>
      </button>
    </form>
  );
};
