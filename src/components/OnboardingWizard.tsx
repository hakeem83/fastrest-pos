import React, { useRef, useState } from 'react';
import { BusinessType, RestaurantSettings } from '../types';
import { StorageService } from '../services/storage';
import { auth, CloudSyncService } from '../services/firebaseSync';
import { CheckCircle2, CloudDownload, FileUp, Loader2, Store, UtensilsCrossed } from 'lucide-react';

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
  const [isPullingCloud, setIsPullingCloud] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const lockedBranchId = StorageService.getLockedBranchId();
  const targetBranchId = lockedBranchId || initialSettings.businessId || StorageService.getActiveBusinessId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RestaurantSettings = {
      ...initialSettings,
      businessId: targetBranchId,
      restaurantName: restaurantName.trim() || 'مطعم الشرق الأصيل',
      branchName: branchName.trim() || 'الفرع الرئيسي',
      phone: phone.trim(),
      address: address.trim(),
      currency: currency.trim() || 'ج.م',
      businessType,
      isOnboarded: true,
    };
    StorageService.saveSettings(updated);
    StorageService.saveBusinessSnapshot(targetBranchId);
    onComplete(updated);
  };

  const handlePullFromCloud = async () => {
    setStatusMessage(null);
    setIsPullingCloud(true);
    try {
      if (!auth.currentUser) {
        await CloudSyncService.signInWithGoogle();
      }
      const cloudDoc = await CloudSyncService.pullSingleCloudBranchById(targetBranchId, true);
      if (cloudDoc) {
        const loadedSettings = StorageService.getSettings();
        const finalized: RestaurantSettings = {
          ...loadedSettings,
          businessId: targetBranchId,
          isOnboarded: true,
        };
        StorageService.saveSettings(finalized);
        onComplete(finalized);
      } else {
        setStatusMessage({
          type: 'error',
          text: `لم يتم العثور على نسخة سحابية مرفوعة مسبقاً للمعرف (${targetBranchId}). تأكد من ضغط "رفع الفرع للسحابة" من جهاز الإدارة أولاً، أو قم بتأسيس الفرع أدناه.`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر الاتصال بالسحابة لسحب بيانات الفرع',
      });
    } finally {
      setIsPullingCloud(false);
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = StorageService.restoreCurrentBusinessFromBackupJSON(content);
        if (ok) {
          const loadedSettings = StorageService.getSettings();
          const finalized: RestaurantSettings = {
            ...loadedSettings,
            isOnboarded: true,
          };
          StorageService.saveSettings(finalized);
          onComplete(finalized);
        } else {
          setStatusMessage({
            type: 'error',
            text: 'ملف النسخة الاحتياطية (.JSON) غير صالح أو تالف.',
          });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-white">إعداد وتهيئة نظام FastRest POS</h2>
          <p className="text-xs text-slate-400">
            {lockedBranchId
              ? `تهيئة جهاز الفرع المربوط بالمعرف (${lockedBranchId}) لأول مرة`
              : 'حدد بيانات المنشأة لتظهر على الفواتير وسندات القبض والصرف المطبوعة'}
          </p>
        </div>

        {/* Fast Cloud / USB Restore Box for Pre-Configured Branches */}
        <div className="bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-3.5 space-y-2.5">
          <div className="text-xs font-black text-indigo-300">
            هل تم تجهيز هذا الفرع والمنيو مسبقاً على جهاز الإدارة؟
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            يمكنك سحب كامل إعدادات الفرع (المنيو، الأسعار، الأصناف، والمستخدمين) بضغطة واحدة من السحابة أو عبر ملف فلاشة (.JSON):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={isPullingCloud}
              onClick={handlePullFromCloud}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              {isPullingCloud ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudDownload className="w-4 h-4" />
              )}
              <span>سحب بيانات الفرع من السحابة</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <FileUp className="w-4 h-4" />
              <span>استيراد ملف الفرع (.JSON)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJsonFile}
              className="hidden"
            />
          </div>

          {statusMessage && (
            <div
              className={`p-2.5 rounded-xl text-[11px] font-bold border ${
                statusMessage.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-[11px] font-bold text-slate-400 text-center">
            — أو قم بتأسيس بيانات الفرع الجديد مباشرة من هذا الجهاز —
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
                placeholder="مثال: مطعم الشرق الأصيل"
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
    </div>
  );
};

