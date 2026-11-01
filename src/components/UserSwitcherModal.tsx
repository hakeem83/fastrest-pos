import React, { useState } from 'react';
import { AppUser } from '../types';
import {
  formatCurrency,
  getRolePermissions,
  StorageService,
} from '../services/storage';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface Props {
  users: AppUser[];
  activeUser: AppUser;
  currency: string;
  onClose: () => void;
  onUserSwitched: (user: AppUser) => void;
}

export const UserSwitcherModal: React.FC<Props> = ({
  users,
  activeUser,
  currency,
  onClose,
  onUserSwitched,
}) => {
  const activeUsers = users.filter((u) => u.isActive);
  const [selectedUserId, setSelectedUserId] = useState<string>(activeUser.id);
  const [pinInput, setPinInput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const selectedUser =
    activeUsers.find((u) => u.id === selectedUserId) || activeUser;
  const perms = getRolePermissions(
    selectedUser.role,
    selectedUser.maxExpenseLimitMinor
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const verified = StorageService.authenticateUser(selectedUser.id, pinInput);
    if (!verified) {
      setError(`رمز PIN غير صحيح للمستخدم "${selectedUser.name}".`);
      setPinInput('');
      return;
    }
    onUserSwitched(verified);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 space-y-5 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                تبديل المستخدم النشط والصلاحية (RBAC Login)
              </h3>
              <p className="text-xs text-slate-400">
                اختر هويتك الوظيفية (كاشير / محاسب / مدير / شريك) وأدخل رمز الـ PIN الخاص بك
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {activeUsers.map((u) => {
            const uPerms = getRolePermissions(u.role, u.maxExpenseLimitMinor);
            const isSelected = u.id === selectedUser.id;
            const isCurrent = u.id === activeUser.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setSelectedUserId(u.id);
                  setError('');
                  setPinInput('');
                }}
                className={`text-right p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 shadow-md'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div>
                    <div className="font-black text-sm text-white flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                          النشط حالياً
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded border font-bold ${uPerms.badgeColor}`}
                    >
                      {uPerms.labelAr}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-400">
                    PIN: {u.pin}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2 w-full">
                  <span>سقف الصرف المباشر:</span>
                  <strong className="font-mono text-amber-300">
                    {uPerms.maxDirectExpenseMinor === 0
                      ? 'مفتوح (صلاحية كاملة)'
                      : formatCurrency(uPerms.maxDirectExpenseMinor, currency)}
                  </strong>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected User Permissions Preview */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300">
              ملخص صلاحيات الدور المحدد ({perms.labelAr}):
            </span>
            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${perms.badgeColor}`}>
              {selectedUser.name}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                البيع وإصدار الفواتير وسندات الخزينة ضمن السقف
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {perms.canViewTheoreticalCost ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className="text-slate-300">
                {perms.canViewTheoreticalCost
                  ? 'مسموح برؤية تكاليف الوجبات وهوامش الربح'
                  : 'محجوب عنه رؤية تكاليف الوجبات وهوامش الربح'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {perms.canApproveHighVouchers ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="text-slate-300">
                {perms.canApproveHighVouchers
                  ? 'معتمد لسندات الصرف الكبرى ومسحوبات الشركاء'
                  : `يتطلب اعتماد مدير/شريك لما يتجاوز ${formatCurrency(
                      perms.maxDirectExpenseMinor,
                      currency
                    )}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {!perms.canBlindCloseOnly ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="text-slate-300">
                {perms.canBlindCloseOnly
                  ? 'تقفيل وردية أعمى (يدخل الجرد الفعلي قبل رؤية الرصيد الدفتري)'
                  : 'مطابقة كاملة مع كشف العجز والزيادة الفوري'}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
            {error}
          </div>
        )}

        {/* PIN Form */}
        <form onSubmit={handleLogin} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-300 block mb-1">
              أدخل رمز الـ PIN السري للمستخدم ({selectedUser.name}) — للتجربة السريعة:{' '}
              <span className="text-amber-400 font-mono">{selectedUser.pin}</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoFocus
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="أدخل رمز PIN..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-base font-mono tracking-widest text-amber-400 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const verified = StorageService.authenticateUser(
                selectedUser.id,
                selectedUser.pin
              );
              if (verified) {
                onUserSwitched(verified);
                onClose();
              }
            }}
            className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
          >
            دخول سريع ({selectedUser.pin})
          </button>

          <button
            type="submit"
            className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>تأكيد التبديل</span>
          </button>
        </form>
      </div>
    </div>
  );
};
