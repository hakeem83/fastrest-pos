import React, { useState } from 'react';
import { AppUser, RestaurantSettings, Shift } from '../types';
import {
  formatCurrency,
  getRolePermissions,
  StorageService,
} from '../services/storage';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck, X } from 'lucide-react';

interface Props {
  shift: Shift;
  currency: string;
  activeUser?: AppUser;
  settings?: RestaurantSettings;
  onClose: () => void;
  onShiftClosed: () => void;
}

export const CloseShiftModal: React.FC<Props> = ({
  shift,
  currency,
  activeUser,
  settings,
  onClose,
  onShiftClosed,
}) => {
  const currentUser = activeUser || StorageService.getActiveUser();
  const currentSettings = settings || StorageService.getSettings();
  const perms = getRolePermissions(currentUser.role, currentUser.maxExpenseLimitMinor);

  const isBlindEnforced =
    perms.canBlindCloseOnly && currentSettings.enforceBlindCloseForCashier !== false;

  const calc = StorageService.calculateShiftCash(shift);
  const [actualCashStr, setActualCashStr] = useState(
    isBlindEnforced ? '' : (calc.expectedCashInDrawer / 100).toFixed(2)
  );
  const [closingNotes, setClosingNotes] = useState('');
  const [unlockedBlindView, setUnlockedBlindView] = useState(false);
  const [supervisorPin, setSupervisorPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [autoDownloadBackup, setAutoDownloadBackup] = useState(true);

  const actualMinor = Math.round((parseFloat(actualCashStr) || 0) * 100);
  const variance = actualMinor - calc.expectedCashInDrawer;
  const canSeeBookFigures = !isBlindEnforced || unlockedBlindView;

  const triggerLocalBackupDownload = () => {
    try {
      StorageService.exportBusinessBackupFile();
    } catch {
      // ignore download error if blocked
    }
  };

  const handleUnlockBlind = () => {
    setPinError('');
    if (StorageService.verifyAdminPin(supervisorPin)) {
      setUnlockedBlindView(true);
      setSupervisorPin('');
    } else {
      setPinError('رمز PIN غير صحيح. أدخل رمز المحاسب (2222) أو المدير (3333) أو الشريك (1234).');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.closeShift(shift.id, actualMinor, closingNotes.trim());
    if (autoDownloadBackup) {
      triggerLocalBackupDownload();
    }
    onShiftClosed();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white">
              تقفيل وجرد الوردية #{shift.shiftNumber}
            </h3>
            <span className="text-[11px] text-slate-400">
              المستخدم الحالي: {currentUser.name} ({perms.labelAr})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {canSeeBookFigures ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>كشف المطابقة الدفترية (مفتوح للمحاسب/المدير)</span>
              </span>
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">النقدية المتوقعة بالدرج دفترياً:</span>
              <strong className="font-mono text-amber-400">
                {formatCurrency(calc.expectedCashInDrawer, currency)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">الفرق (الزيادة / العجز):</span>
              <strong
                className={`font-mono ${
                  variance === 0
                    ? 'text-emerald-400'
                    : variance > 0
                    ? 'text-sky-400'
                    : 'text-rose-400'
                }`}
              >
                {variance === 0 ? 'مطابق تماماً' : formatCurrency(variance, currency)}
              </strong>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-black">
              <EyeOff className="w-4 h-4 shrink-0" />
              <span>نظام الجرد الأعمى للكاشير (Blind Cash Drop)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              تطبيقاً لقواعد الرقابة المالية، يرجى عد النقدية الفعلية بالدرج وإدخالها بالأسفل دون إظهار الرصيد الدفتري المسبق. سيقوم النظام بحساب المطابقة وتسجيلها للإدارة والمحاسب.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  placeholder="PIN محاسب/مدير لكشف الرصيد..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-8 pl-2 py-1.5 text-[11px] font-mono text-amber-300"
                />
              </div>
              <button
                type="button"
                onClick={handleUnlockBlind}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                إظهار للمشرف
              </button>
            </div>
            {pinError && <div className="text-[11px] text-rose-300 font-bold">{pinError}</div>}
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">
              النقدية الفعلية المعدودة بالدرج الآن ({currency}):
            </label>
            <input
              type="number"
              step="0.01"
              required
              autoFocus
              placeholder="أدخل المبلغ الفعلي الموجود بالدرج..."
              value={actualCashStr}
              onChange={(e) => setActualCashStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-base font-mono text-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">
              ملاحظات التسليم والتقفيل:
            </label>
            <input
              type="text"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="أي ملاحظات للمحاسب أو الإدارة..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <label className="flex items-center gap-2.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoDownloadBackup}
              onChange={(e) => setAutoDownloadBackup(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
            <span className="text-[11px] text-slate-300 font-bold">
              حفظ نسخة احتياطية محلية (.JSON) تلقائياً على جهاز الويندوز عند إغلاق الوردية (موصى به للأوفلاين)
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>تأكيد إغلاق الوردية نهائياً</span>
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
