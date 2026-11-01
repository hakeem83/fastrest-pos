import React, { useState } from 'react';
import { Customer } from '../types';
import { StorageService } from '../services/storage';
import { AlertCircle, CheckCircle2, Lock, ShieldAlert, UserPlus, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (newCustomer: Customer) => void;
}

export const QuickCustomerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCustomerCreated,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('يرجى إدخال اسم العميل الرباعي أو الثنائي.');
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم هاتف العميل للتواصل وتسجيل الطلبات.');
      return;
    }

    try {
      // Strictly enforced: Cashier can ONLY register cash-paying customers
      // allowCredit is ALWAYS false, creditLimit is ALWAYS 0
      const newCustomer = StorageService.addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        allowCredit: false,
        creditLimit: 0,
      });

      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      onCustomerCreated(newCustomer);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ العميل الجديد.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                تسجيل عميل جديد (شاشة الكاشير السريعة)
              </h3>
              <p className="text-[11px] text-slate-400">
                إضافة بيانات العميل وتعيينه تلقائياً لفاتورة البيع النشطة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Customer Base Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                اسم العميل: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أحمد مصطفى إبراهيم"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 text-xs"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">
                رقم الهاتف / الموبايل: <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 01012345678"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 font-mono focus:outline-hidden focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">
              عنوان التوصيل أو السكن:
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="مثال: 12 شارع عباس العقاد، عمارة الأمل، الدور الرابع، شقة 8"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 text-xs"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">
              ملاحظات إضافية أو علامة مميزة:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: بجوار صيدلية العزبي / الاتصال قبل الوصول"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 text-xs"
            />
          </div>

          {/* CASHIER SECURITY RESTRICTION ON CREDIT SETTINGS */}
          <div className="bg-slate-950 border-2 border-dashed border-amber-500/30 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>قيود الصلاحيات: إعدادات الائتمان والبيع الآجل مقفلة للكاشير</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              وفقاً للسياسة المالية للمطعم، يتم تسجيل العميل الجديد كـ{' '}
              <strong className="text-slate-200">عميل نقدي فقط</strong>. لا يمتلك الكاشير صلاحية منح تسهيلات ائتمانية أو تفعيل البيع الآجل. لتفعيل الآجل وتحديد حد ائتماني، يجب مراجعة مدير الفرع من لوحة الإدارة.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">حالة البيع الآجل:</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold text-[10px] flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  غير مصرح (نقدي فقط)
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">الحد الائتماني:</span>
                <span className="font-mono text-slate-400 font-bold text-[11px]">
                  0.00 ج.م (مقفل)
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ العميل وتعيينه للفاتورة مباشرة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
