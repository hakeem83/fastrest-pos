import React, { useState } from 'react';
import { BusinessType, RestaurantSettings } from '../types';
import { StorageService } from '../services/storage';
import { CheckCircle2, Store, UtensilsCrossed } from 'lucide-react';

interface Props {
  initialSettings: RestaurantSettings;
  onComplete: (newSettings: RestaurantSettings) => void;
}

export const OnboardingWizard: React.FC<Props> = ({ initialSettings, onComplete }) => {
  const [restaurantName, setRestaurantName] = useState(initialSettings.restaurantName);
  const [branchName, setBranchName] = useState(initialSettings.branchName);
  const [phone, setPhone] = useState(initialSettings.phone);
  const [address, setAddress] = useState(initialSettings.address);
  const [currency, setCurrency] = useState(initialSettings.currency || 'ج.م');
  const [businessType, setBusinessType] = useState<BusinessType>(
    initialSettings.businessType || 'restaurant'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RestaurantSettings = {
      ...initialSettings,
      restaurantName: restaurantName.trim() || 'مطعم الشرق الأصيل',
      branchName: branchName.trim() || 'الفرع الرئيسي',
      phone: phone.trim(),
      address: address.trim(),
      currency: currency.trim() || 'ج.م',
      businessType,
      isOnboarded: true,
    };
    StorageService.saveSettings(updated);
    onComplete(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl"
      >
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-white">إعداد وتهيئة نظام FastRest POS</h2>
          <p className="text-xs text-slate-400">
            حدد بيانات المنشأة لتظهر على الفواتير وسندات القبض والصرف المطبوعة
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setBusinessType('restaurant')}
            className={`p-3.5 rounded-2xl border text-right space-y-1 transition-all cursor-pointer ${
              businessType === 'restaurant'
                ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5" />
            <div className="text-xs font-black text-white">مطعم وجبات ومشويات</div>
            <p className="text-[10px] text-slate-400">منيو أطباق مربوط بوصفات وخامات المخزون</p>
          </button>

          <button
            type="button"
            onClick={() => setBusinessType('retail')}
            className={`p-3.5 rounded-2xl border text-right space-y-1 transition-all cursor-pointer ${
              businessType === 'retail'
                ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            <Store className="w-5 h-5" />
            <div className="text-xs font-black text-white">محل تجزئة / سوبر ماركت</div>
            <p className="text-[10px] text-slate-400">بيع مباشر للأصناف الجاهزة من المخزون</p>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">اسم المطعم / المحل:</label>
            <input
              type="text"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">الفرع:</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">العملة:</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">رقم الهاتف:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">العنوان:</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>حفظ الإعدادات وبدء التشغيل</span>
        </button>
      </form>
    </div>
  );
};
