import React, { useState } from 'react';
import { AppUser, RestaurantSettings, UserRole } from '../types';
import {
  formatCurrency,
  getRolePermissions,
  StorageService,
} from '../services/storage';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

interface Props {
  users: AppUser[];
  activeUser: AppUser;
  settings: RestaurantSettings;
  onRefresh: () => void;
  onSettingsUpdated: (newSettings: RestaurantSettings) => void;
}

export const UsersRolesManager: React.FC<Props> = ({
  users,
  activeUser,
  settings,
  onRefresh,
  onSettingsUpdated,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [maxExpenseStr, setMaxExpenseStr] = useState('200');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleRoleSelectChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'cashier') setMaxExpenseStr('200');
    else if (newRole === 'accountant') setMaxExpenseStr('2500');
    else if (newRole === 'manager') setMaxExpenseStr('10000');
    else setMaxExpenseStr('0');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) return;

    const maxExpMinor = Math.max(0, Math.round((parseFloat(maxExpenseStr) || 0) * 100));
    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      code: `USR-0${users.length + 1}`,
      name: name.trim(),
      role,
      pin: pin.trim(),
      phone: phone.trim() || undefined,
      isActive: true,
      maxExpenseLimitMinor: maxExpMinor,
      notes: notes.trim() || undefined,
    };

    StorageService.saveUsers([...users, newUser]);
    setName('');
    setPin('');
    setPhone('');
    setNotes('');
    setFeedback(`تمت إضافة المستخدم "${newUser.name}" بدور (${getRolePermissions(role).labelAr}) بنجاح.`);
    onRefresh();
  };

  const handleUpdateUserLimit = (userId: string, newLimitEgpStr: string) => {
    const valMinor = Math.max(0, Math.round((parseFloat(newLimitEgpStr) || 0) * 100));
    const updated = users.map((u) =>
      u.id === userId ? { ...u, maxExpenseLimitMinor: valMinor } : u
    );
    StorageService.saveUsers(updated);
    onRefresh();
  };

  const handleUpdateUserPin = (userId: string, newPin: string) => {
    if (!newPin.trim()) return;
    const updated = users.map((u) =>
      u.id === userId ? { ...u, pin: newPin.trim() } : u
    );
    StorageService.saveUsers(updated);
    onRefresh();
  };

  const handleDeleteUser = (userId: string) => {
    if (users.length <= 1 || userId === activeUser.id) return;
    const updated = users.filter((u) => u.id !== userId);
    StorageService.saveUsers(updated);
    onRefresh();
  };

  const toggleBlindClose = () => {
    const updated: RestaurantSettings = {
      ...settings,
      enforceBlindCloseForCashier: !settings.enforceBlindCloseForCashier,
    };
    StorageService.saveSettings(updated);
    onSettingsUpdated(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Governance Policy Strip */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-white">
              سياسة الرقابة الداخلية وفصل المسؤوليات (Segregation of Duties)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            يتحكم هذا النظام في صلاحيات كل فرد بالمنشأة (كاشير، محاسب، مدير، شريك) ويفرض سقفاً للصرف المباشر والتوقيع المزدوج.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
          <div className="text-xs">
            <span className="font-bold text-white block">
              نظام التقفيل الأعمى للكاشير (Blind Shift Close)
            </span>
            <span className="text-[11px] text-slate-400">
              يمنع الكاشير من رؤية الرصيد الدفتري المتوقع بالدرج قبل إدخال الجرد الفعلي
            </span>
          </div>
          <button
            type="button"
            onClick={toggleBlindClose}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              settings.enforceBlindCloseForCashier !== false
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {settings.enforceBlindCloseForCashier !== false ? 'مُفعّل (موصى به)' : 'معطّل'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            className="text-emerald-200 underline text-[11px] cursor-pointer"
          >
            إخفاء
          </button>
        </div>
      )}

      {/* Add New User Form */}
      <form
        onSubmit={handleAddUser}
        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <UserPlus className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-black text-white">
            تسجيل مستخدم جديد وتحديد دوره الوظيفي وسقف الصرف المسموح
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-bold">اسم المستخدم / الموظف:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محمد علي"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-bold">الدور الوظيفي (Role):</label>
            <select
              value={role}
              onChange={(e) => handleRoleSelectChange(e.target.value as UserRole)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
            >
              <option value="cashier">كاشير نقطة بيع (Cashier)</option>
              <option value="accountant">محاسب مالي ومخازن (Accountant)</option>
              <option value="manager">مدير فرع وتشغيل (Manager)</option>
              <option value="partner">شريك / مالك (Partner / Owner)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-bold">رمز الدخول السري (PIN):</label>
            <input
              type="text"
              required
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="مثال: 4444"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-400"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-bold">
              سقف الصرف المباشر بدون اعتماد ({settings.currency}):
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={maxExpenseStr}
              onChange={(e) => setMaxExpenseStr(e.target.value)}
              placeholder="0 = مفتوح"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة المستخدم</span>
            </button>
          </div>
        </div>
      </form>

      {/* Users List Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-black text-white">
              قائمة المستخدمين المسجلين وصلاحياتهم الحالية ({users.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            يمكنك تعديل رمز PIN أو سقف الصرف المباشر لكل مستخدم فوراً
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">الكود</th>
                <th className="py-2.5 px-3">الاسم</th>
                <th className="py-2.5 px-3">الدور والصلاحية</th>
                <th className="py-2.5 px-3">رمز PIN</th>
                <th className="py-2.5 px-3">سقف الصرف المنفرد ({settings.currency})</th>
                <th className="py-2.5 px-3">اعتماد السندات الكبرى</th>
                <th className="py-2.5 px-3 text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {users.map((u) => {
                const perms = getRolePermissions(u.role, u.maxExpenseLimitMinor);
                const limitMajor = Math.round((u.maxExpenseLimitMinor || 0) / 100);
                return (
                  <tr key={u.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-mono text-amber-400 font-bold">
                      {u.code}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.id === activeUser.id && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                            نشط الآن
                          </span>
                        )}
                      </div>
                      {u.notes && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {u.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${perms.badgeColor}`}
                      >
                        {perms.labelAr}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          defaultValue={u.pin}
                          maxLength={8}
                          onBlur={(e) => handleUpdateUserPin(u.id, e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-amber-400 text-center"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {u.role === 'partner' ? (
                        <span className="text-purple-300 font-bold">مفتوح (شريك مالك)</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            defaultValue={limitMajor}
                            min="0"
                            step="50"
                            onBlur={(e) => handleUpdateUserLimit(u.id, e.target.value)}
                            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-emerald-400"
                          />
                          <span className="text-[10px] text-slate-400">
                            {settings.currency}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {perms.canApproveHighVouchers ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>مُعتمد للتوقيع</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Lock className="w-3.5 h-3.5" />
                          <span>غير مخول بالاعتماد</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-left">
                      {u.id !== activeUser.id && users.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/15 rounded-lg cursor-pointer"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role & Responsibility Matrix Reference */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-black text-white">
            مصفوفة الصلاحيات القياسية المعتمدة في النظام
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="inline-block px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
              1. الكاشير (Cashier)
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              <li>البيع وإصدار الفواتير وتحصيل النقدية.</li>
              <li>تسجيل عميل جديد (نقدي فقط بدون آجل).</li>
              <li>صرف مصروفات نثرية حتى سقفه المحدد ({formatCurrency(20000, settings.currency)}).</li>
              <li className="text-rose-300">محظور من رؤية التكاليف أو تعديل المخزون.</li>
            </ul>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
              2. المحاسب (Accountant)
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              <li>مراجعة الورديات ومطابقة الجرد الفعلي بالدفتري.</li>
              <li>إدارة حسابات الموردين والعملاء والحد الائتماني.</li>
              <li>إدارة المخزون، التكاليف، والهدر، وسلف الموظفين.</li>
              <li className="text-amber-300">يحتاج اعتماد شريك/مدير للمبالغ فوق سقفه.</li>
            </ul>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
              3. المدير (Manager)
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              <li>اعتماد سندات الصرف التي تتجاوز سقف الكاشير.</li>
              <li>إدارة المنيو، الأسعار، والعروض الترويجية.</li>
              <li>إدارة المستخدمين وتعيين حدود الصرف.</li>
              <li>متابعة سلف الموظفين والعهد النقدية.</li>
            </ul>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="inline-block px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
              4. الشريك / المالك (Partner)
            </span>
            <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              <li>كامل الصلاحيات الرقابية والمالية.</li>
              <li>إدارة حصص الشركاء وجاري الشريك والمسحوبات.</li>
              <li>اعتماد المسحوبات الرأسمالية وتوزيعات الأرباح.</li>
              <li>تصدير التقارير الختامية وإدارة أمان النظام.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
