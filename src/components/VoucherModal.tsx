import React, { useState } from 'react';
import {
  AccountCategory,
  AppUser,
  Customer,
  Employee,
  FinancialContainerType,
  Partner,
  PartyType,
  Supplier,
  Voucher,
  VoucherType,
} from '../types';
import {
  formatCurrency,
  getFinancialContainerLabel,
  getRolePermissions,
  getVoucherTypeLabel,
  StorageService,
} from '../services/storage';
import { Eye, KeyRound, Lock, Save, ShieldAlert, X } from 'lucide-react';

interface Props {
  shiftId: string;
  cashierName: string;
  activeUser?: AppUser;
  initialType: VoucherType;
  categories: AccountCategory[];
  suppliers: Supplier[];
  customers?: Customer[];
  partners?: Partner[];
  employees?: Employee[];
  currency: string;
  onClose: () => void;
  onSuccess: (newVoucher: Voucher, shouldPrint: boolean) => void;
}

export const VoucherModal: React.FC<Props> = ({
  shiftId,
  cashierName,
  activeUser,
  initialType,
  categories,
  suppliers,
  customers = [],
  partners = [],
  employees = [],
  currency,
  onClose,
  onSuccess,
}) => {
  const currentUser = activeUser || StorageService.getActiveUser();
  const userPerms = getRolePermissions(
    currentUser.role,
    currentUser.maxExpenseLimitMinor
  );

  const [type, setType] = useState<VoucherType>(initialType);
  const [financialContainer, setFinancialContainer] =
    useState<FinancialContainerType>('shift_drawer');

  const isReceiptType =
    type === 'receipt' ||
    type === 'customer_collection' ||
    type === 'partner_deposit' ||
    type === 'staff_custody_settlement';

  const filteredCats = categories.filter((c) =>
    isReceiptType ? c.type === 'receipt' : c.type === 'expense'
  );

  const [categoryId, setCategoryId] = useState<string>(filteredCats[0]?.id || '');
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [partnerId, setPartnerId] = useState<string>(partners[0]?.id || '');
  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id || '');
  const [amountStr, setAmountStr] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [approverPin, setApproverPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  const amountVal = parseFloat(amountStr) || 0;
  const amountMinor = Math.round(amountVal * 100);

  // Determine if Manager / Partner PIN approval is required
  const exceedsLimit =
    !isReceiptType &&
    userPerms.maxDirectExpenseMinor > 0 &&
    amountMinor > userPerms.maxDirectExpenseMinor;

  const restrictedRoleForPartyTx =
    (type === 'partner_drawing' && !userPerms.canIssuePartnerDrawings) ||
    (type === 'staff_advance' && !userPerms.canIssueStaffAdvances) ||
    (type === 'partner_drawing' &&
      currentUser.role !== 'partner' &&
      currentUser.role !== 'manager');

  const requiresManagerApproval = exceedsLimit || restrictedRoleForPartyTx;

  const handleTypeChange = (nextType: VoucherType) => {
    setType(nextType);
    setError('');
    const nextIsReceipt =
      nextType === 'receipt' ||
      nextType === 'customer_collection' ||
      nextType === 'partner_deposit' ||
      nextType === 'staff_custody_settlement';
    const nextCats = categories.filter((c) =>
      nextIsReceipt ? c.type === 'receipt' : c.type === 'expense'
    );
    if (nextCats.length > 0) {
      setCategoryId(nextCats[0].id);
    }
  };

  const handleSave = (shouldPrint: boolean) => {
    setError('');
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('يرجى إدخال قيمة صحيحة للسند أكبر من صفر.');
      return;
    }

    let approvedByUserName: string | undefined =
      currentUser.role === 'partner' || currentUser.role === 'manager'
        ? `${currentUser.name} (${userPerms.labelAr})`
        : undefined;

    if (requiresManagerApproval) {
      const approver = StorageService.verifyApproverPin(approverPin);
      if (!approver) {
        setError(
          'هذا السند يتجاوز صلاحية الصرف المباشر أو يخص الشركاء/الموظفين. يرجى إدخال رمز PIN المدير (3333) أو الشريك المالك (1234) للاعتماد.'
        );
        return;
      }
      approvedByUserName = `${approver.name} (${
        approver.role === 'partner' ? 'شريك مالك' : 'مدير فرع'
      })`;
    }

    const cat = categories.find((c) => c.id === categoryId) || filteredCats[0];
    let partyType: PartyType = 'general';
    let partyId: string | undefined;
    let resolvedRecipient = recipient.trim() || 'غير محدد';
    let defaultDesc = 'معاملة خزينة وردية';

    if (type === 'supplier_payment') {
      const sup = suppliers.find((s) => s.id === supplierId);
      if (!sup) {
        setError('يرجى اختيار المورد المستفيد.');
        return;
      }
      partyType = 'supplier';
      partyId = sup.id;
      resolvedRecipient = sup.name;
      defaultDesc = `سداد دفعة نقدية للمورد ${sup.name}`;
    } else if (type === 'customer_collection') {
      const cust = customers.find((c) => c.id === customerId);
      if (!cust) {
        setError('يرجى اختيار العميل المسدد للمديونية.');
        return;
      }
      partyType = 'customer';
      partyId = cust.id;
      resolvedRecipient = cust.name;
      defaultDesc = `تحصيل دفعة نقدية من حساب العميل ${cust.name}`;
    } else if (type === 'partner_drawing' || type === 'partner_deposit') {
      const prt = partners.find((p) => p.id === partnerId);
      if (!prt) {
        setError('يرجى اختيار الشريك المعني بالحركة.');
        return;
      }
      partyType = 'partner';
      partyId = prt.id;
      resolvedRecipient = prt.name;
      defaultDesc =
        type === 'partner_drawing'
          ? `مسحوبات نقدية للشريك ${prt.name} (تخصم من جاري الشريك)`
          : `إيداع وتمويل نقدي من الشريك ${prt.name} (يضاف لجاري الشريك)`;
    } else if (type === 'staff_advance' || type === 'staff_custody_settlement') {
      const emp = employees.find((e) => e.id === employeeId);
      if (!emp) {
        setError('يرجى اختيار الموظف / العامل المعني بالحركة.');
        return;
      }
      partyType = 'employee';
      partyId = emp.id;
      resolvedRecipient = emp.name;
      defaultDesc =
        type === 'staff_advance'
          ? `صرف سلفة / دفعة من الراتب للموظف ${emp.name}`
          : `رد وتسوية عهدة / سلفة من الموظف ${emp.name}`;
    }

    const created = StorageService.addVoucher({
      shiftId,
      type,
      amount: amountMinor,
      accountCode: cat ? cat.code : 'GEN-100',
      accountName: cat ? cat.name : getVoucherTypeLabel(type),
      recipient: resolvedRecipient,
      description: description.trim() || defaultDesc,
      cashierName: currentUser.name || cashierName,
      partyType,
      partyId,
      supplierId: type === 'supplier_payment' ? partyId : undefined,
      customerId: type === 'customer_collection' ? partyId : undefined,
      partnerId:
        type === 'partner_drawing' || type === 'partner_deposit'
          ? partyId
          : undefined,
      employeeId:
        type === 'staff_advance' || type === 'staff_custody_settlement'
          ? partyId
          : undefined,
      financialContainer,
      performedByUserId: currentUser.id,
      performedByRole: currentUser.role,
      approvedByUserName,
    });

    onSuccess(created, shouldPrint);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white">
              {getVoucherTypeLabel(type)}
            </h3>
            <p className="text-[11px] text-slate-400">
              المنفذ الحالي: <strong className="text-amber-400">{currentUser.name}</strong> ({userPerms.labelAr})
              {userPerms.maxDirectExpenseMinor > 0 && (
                <span>
                  {' '}
                  · سقف الصرف المنفرد:{' '}
                  <strong className="font-mono text-emerald-400">
                    {formatCurrency(userPerms.maxDirectExpenseMinor, currency)}
                  </strong>
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Outgoing vs Incoming Voucher Type Grid */}
        <div className="space-y-2">
          <span className="text-[11px] text-slate-400 font-bold block">
            1. اختر نوع الحركة والطرف المرتبط بها:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 px-2 rounded-xl border cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              مصروف تشغيل
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('supplier_payment')}
              className={`py-2 px-2 rounded-xl border cursor-pointer ${
                type === 'supplier_payment'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              سداد مورد آجل
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('staff_advance')}
              className={`py-2 px-2 rounded-xl border cursor-pointer ${
                type === 'staff_advance'
                  ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              سلفة / راتب موظف
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('partner_drawing')}
              className={`py-2 px-2 rounded-xl border cursor-pointer ${
                type === 'partner_drawing'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              مسحوبات شريك
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('receipt')}
              className={`py-2 px-2 rounded-xl border cursor-pointer ${
                type === 'receipt'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              قبض إيراد عام
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('customer_collection')}
              className={`py-2 px-2 rounded-xl border cursor-pointer ${
                type === 'customer_collection'
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              تحصيل عميل آجل
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('partner_deposit')}
              className={`py-2 px-2 rounded-xl border cursor-pointer ${
                type === 'partner_deposit'
                  ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              إيداع/تمويل شريك
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('staff_custody_settlement')}
              className={`py-2 px-2 rounded-xl border cursor-pointer ${
                type === 'staff_custody_settlement'
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              رد عهدة موظف
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="space-y-3 text-xs">
          {/* Financial Container Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">
                2. الوعاء النقدي المتأثر بالحركة:
              </label>
              <select
                value={financialContainer}
                onChange={(e) =>
                  setFinancialContainer(e.target.value as FinancialContainerType)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-amber-300 font-bold"
              >
                <option value="shift_drawer">
                  درج نقدية الكاشير (يؤثر على عهدة الوردية)
                </option>
                <option value="main_safe">الخزينة الرئيسية للإدارة</option>
                <option value="bank_account">الحساب البنكي / فيزا</option>
                <option value="ewallet_instapay">محفظة إلكترونية / إنستاباي</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">
                3. بند التوجيه في دليل الحسابات:
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
              >
                {filteredCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Party Selector based on VoucherType */}
          {type === 'supplier_payment' && (
            <div>
              <label className="font-bold text-amber-300 block mb-1">
                اختر المورد المستحق (يرتبط بكشف حساب الموردين فوراً):
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2.5 text-white font-bold"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — مستحق له حالياً: {formatCurrency(s.creditBalance, currency)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'customer_collection' && (
            <div>
              <label className="font-bold text-sky-300 block mb-1">
                اختر العميل المسدد للمديونية (يخصم من رصيد مديونيته):
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-sky-500/40 rounded-xl px-3 py-2.5 text-white font-bold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — مديونية حالية: {formatCurrency(c.currentDebt, currency)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(type === 'partner_drawing' || type === 'partner_deposit') && (
            <div>
              <label className="font-bold text-purple-300 block mb-1">
                اختر الشريك / المالك (يرحل مباشرة إلى حساب جاري الشريك):
              </label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-2.5 text-white font-bold"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.roleTitle} - {p.equityPercent}%) — رصيد جاري الشريك:{' '}
                    {formatCurrency(p.currentBalance, currency)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(type === 'staff_advance' || type === 'staff_custody_settlement') && (
            <div>
              <label className="font-bold text-orange-300 block mb-1">
                اختر الموظف / العامل (يرحل إلى كشف الرواتب والسلف):
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-slate-950 border border-orange-500/40 rounded-xl px-3 py-2.5 text-white font-bold"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.jobTitle}) — راتب:{' '}
                    {formatCurrency(emp.monthlySalary, currency)} | سلف مسحوبة:{' '}
                    {formatCurrency(emp.currentAdvances, currency)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(type === 'expense' || type === 'receipt') && (
            <div>
              <label className="font-bold text-slate-300 block mb-1">
                {type === 'receipt'
                  ? 'المودع / المسلم للنقدية:'
                  : 'المستفيد / المستلم للنقدية:'}
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="اسم الشخص أو الجهة المستلمة..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">
                المبلغ ({currency}):
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-base font-mono text-amber-400"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">
                البيان / التفاصيل:
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="شرح سبب الصرف أو القبض..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
              />
            </div>
          </div>

          {/* Dual Approval / Manager PIN Box when required */}
          {requiresManagerApproval && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/40 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-black">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  {exceedsLimit
                    ? `المبلغ يتجاوز سقف الصرف المنفرد المسموح لك (${formatCurrency(
                        userPerms.maxDirectExpenseMinor,
                        currency
                      )})`
                    : 'هذه الحركة تتطلب اعتماد المدير أو الشريك المالك (مبدأ التوقيع المزدوج)'}
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  maxLength={8}
                  value={approverPin}
                  onChange={(e) => setApproverPin(e.target.value)}
                  placeholder="أدخل رمز PIN المدير (3333) أو الشريك المالك (1234) للاعتماد الفوري..."
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-xl pr-9 pl-3 py-2 font-mono text-amber-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>
              {requiresManagerApproval
                ? 'اعتماد وحفظ ومعاينة الطباعة'
                : 'حفظ ومعاينة الطباعة'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {requiresManagerApproval ? (
              <Lock className="w-4 h-4 text-amber-400" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>حفظ وترحيل للحساب فقط</span>
          </button>
        </div>
      </div>
    </div>
  );
};
