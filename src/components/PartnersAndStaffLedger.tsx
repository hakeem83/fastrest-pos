import React, { useState } from 'react';
import {
  AppUser,
  Employee,
  FinancialContainerType,
  Partner,
  PartyType,
  Shift,
  Voucher,
} from '../types';
import {
  formatCurrency,
  getFinancialContainerLabel,
  getPartyTypeLabel,
  getVoucherTypeLabel,
  StorageService,
} from '../services/storage';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Briefcase,
  Building,
  CheckCircle2,
  Filter,
  Landmark,
  Plus,
  Printer,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';

interface Props {
  partners: Partner[];
  employees: Employee[];
  vouchers: Voucher[];
  activeShift: Shift | null;
  activeUser: AppUser;
  currency: string;
  onRefresh: () => void;
  onVoucherCreated?: (voucher: Voucher) => void;
}

export const PartnersAndStaffLedger: React.FC<Props> = ({
  partners,
  employees,
  vouchers,
  activeShift,
  activeUser,
  currency,
  onRefresh,
  onVoucherCreated,
}) => {
  const [subTab, setSubTab] = useState<'partners' | 'employees' | 'unified_ledger'>(
    'partners'
  );

  // Add Partner State
  const [prtName, setPrtName] = useState('');
  const [prtPhone, setPrtPhone] = useState('');
  const [prtRoleTitle, setPrtRoleTitle] = useState('شريك ممول');
  const [prtEquityStr, setPrtEquityStr] = useState('25');
  const [prtCapitalStr, setPrtCapitalStr] = useState('250000');
  const [prtSalaryStr, setPrtSalaryStr] = useState('0');

  // Add Employee State
  const [empName, setEmpName] = useState('');
  const [empJob, setEmpJob] = useState('شيف / طباخ');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalaryStr, setEmpSalaryStr] = useState('7000');

  // Quick Party Transaction Modal State
  const [txTarget, setTxTarget] = useState<{
    mode:
      | 'partner_drawing'
      | 'partner_deposit'
      | 'staff_advance'
      | 'staff_custody_settlement';
    id: string;
    name: string;
    currentBalanceMinor: number;
  } | null>(null);
  const [txAmountStr, setTxAmountStr] = useState('');
  const [txContainer, setTxContainer] =
    useState<FinancialContainerType>('main_safe');
  const [txDesc, setTxDesc] = useState('');
  const [approverPin, setApproverPin] = useState('');
  const [txError, setTxError] = useState('');

  // Unified Ledger Filters
  const [ledgerPartyFilter, setLedgerPartyFilter] = useState<'all' | PartyType>('all');
  const [ledgerContainerFilter, setLedgerContainerFilter] = useState<
    'all' | FinancialContainerType
  >('all');

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prtName.trim()) return;
    const capMinor = Math.round((parseFloat(prtCapitalStr) || 0) * 100);
    const salMinor = Math.round((parseFloat(prtSalaryStr) || 0) * 100);
    const eq = Math.min(100, Math.max(1, parseFloat(prtEquityStr) || 0));

    const newPartner: Partner = {
      id: `prt-${Date.now()}`,
      code: `PRT-0${partners.length + 1}`,
      name: prtName.trim(),
      phone: prtPhone.trim() || '-',
      roleTitle: prtRoleTitle.trim(),
      equityPercent: eq,
      capitalAmount: capMinor,
      monthlyManagementSalary: salMinor,
      totalDeposits: 0,
      totalDrawings: 0,
      currentBalance: 0,
      isActive: true,
    };

    StorageService.savePartners([...partners, newPartner]);
    setPrtName('');
    setPrtPhone('');
    onRefresh();
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    const salMinor = Math.round((parseFloat(empSalaryStr) || 0) * 100);

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      code: `EMP-0${employees.length + 1}`,
      name: empName.trim(),
      jobTitle: empJob.trim(),
      phone: empPhone.trim() || '-',
      monthlySalary: salMinor,
      currentAdvances: 0,
      custodyBalance: 0,
      isActive: true,
    };

    StorageService.saveEmployees([...employees, newEmp]);
    setEmpName('');
    setEmpPhone('');
    onRefresh();
  };

  const handleExecutePartyTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTarget) return;
    setTxError('');

    const val = parseFloat(txAmountStr);
    if (isNaN(val) || val <= 0) {
      setTxError('يرجى إدخال مبلغ صحيح أكبر من صفر.');
      return;
    }
    const amountMinor = Math.round(val * 100);

    // Check if activeUser is Partner/Manager or needs approver PIN
    let approvedByName = activeUser.name;
    if (activeUser.role !== 'partner' && activeUser.role !== 'manager') {
      const approver = StorageService.verifyApproverPin(approverPin);
      if (!approver) {
        setTxError(
          'حركات مسحوبات الشركاء وسلف العاملين تتطلب إدخال رمز PIN المدير (3333) أو الشريك المالك (1234) للاعتماد.'
        );
        return;
      }
      approvedByName = `${approver.name} (${
        approver.role === 'partner' ? 'شريك مالك' : 'مدير'
      })`;
    }

    const isPartnerTx =
      txTarget.mode === 'partner_drawing' || txTarget.mode === 'partner_deposit';

    const newVoucher = StorageService.addVoucher({
      shiftId: activeShift ? activeShift.id : 'shift-admin-safe',
      type: txTarget.mode,
      amount: amountMinor,
      accountCode:
        txTarget.mode === 'partner_drawing'
          ? 'EXP-106'
          : txTarget.mode === 'partner_deposit'
          ? 'REC-203'
          : txTarget.mode === 'staff_advance'
          ? 'EXP-102'
          : 'REC-204',
      accountName: getVoucherTypeLabel(txTarget.mode),
      recipient: txTarget.name,
      description:
        txDesc.trim() ||
        `${getVoucherTypeLabel(txTarget.mode)} — ${txTarget.name} (${getFinancialContainerLabel(
          txContainer
        )})`,
      cashierName: activeUser.name,
      partyType: isPartnerTx ? 'partner' : 'employee',
      partyId: txTarget.id,
      partnerId: isPartnerTx ? txTarget.id : undefined,
      employeeId: !isPartnerTx ? txTarget.id : undefined,
      financialContainer: txContainer,
      performedByUserId: activeUser.id,
      performedByRole: activeUser.role,
      approvedByUserName: approvedByName,
    });

    setTxTarget(null);
    setTxAmountStr('');
    setTxDesc('');
    setApproverPin('');
    onRefresh();
    if (onVoucherCreated) {
      onVoucherCreated(newVoucher);
    }
  };

  const totalCapital = partners.reduce((s, p) => s + p.capitalAmount, 0);
  const totalPartnerDrawings = partners.reduce((s, p) => s + p.totalDrawings, 0);
  const totalStaffSalaries = employees.reduce((s, e) => s + e.monthlySalary, 0);
  const totalStaffAdvances = employees.reduce((s, e) => s + e.currentAdvances, 0);

  const filteredLedger = vouchers.filter((v) => {
    const inferredParty: PartyType =
      v.partyType ||
      (v.partnerId
        ? 'partner'
        : v.employeeId
        ? 'employee'
        : v.supplierId
        ? 'supplier'
        : v.customerId
        ? 'customer'
        : 'general');

    const inferredContainer: FinancialContainerType =
      v.financialContainer || 'shift_drawer';

    const matchParty =
      ledgerPartyFilter === 'all' || inferredParty === ledgerPartyFilter;
    const matchContainer =
      ledgerContainerFilter === 'all' || inferredContainer === ledgerContainerFilter;
    return matchParty && matchContainer;
  });

  return (
    <div className="space-y-5">
      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('partners')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'partners'
                ? 'bg-purple-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>حسابات الشركاء والملاك ({partners.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('employees')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'employees'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>الموظفون والعمال والسلف ({employees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('unified_ledger')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'unified_ledger'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>دفتر الأستاذ الموحد للأطراف والأوعية ({vouchers.length})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>كل دفعة داخلة أو خارجة مربوطة بطرف محدد ووعاء نقدي ومعتمد رسمي</span>
        </div>
      </div>

      {/* SUB-TAB 1: PARTNERS & OWNERS */}
      {subTab === 'partners' && (
        <div className="space-y-5">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block">
                إجمالي رأس المال العامل للشركاء
              </span>
              <strong className="text-base font-black font-mono text-white">
                {formatCurrency(totalCapital, currency)}
              </strong>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block">
                إجمالي مسحوبات الشركاء المسجلة
              </span>
              <strong className="text-base font-black font-mono text-rose-400">
                {formatCurrency(totalPartnerDrawings, currency)}
              </strong>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-3.5">
              <span className="text-[11px] text-purple-300 font-bold block">
                صافي أرصدة جاري الشركاء الحالية
              </span>
              <strong className="text-base font-black font-mono text-purple-300">
                {formatCurrency(
                  partners.reduce((s, p) => s + p.currentBalance, 0),
                  currency
                )}
              </strong>
            </div>
          </div>

          {/* Add Partner Form */}
          <form
            onSubmit={handleAddPartner}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
          >
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>إضافة شريك / مالك جديد في هيكل الملكية</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              <input
                type="text"
                required
                value={prtName}
                onChange={(e) => setPrtName(e.target.value)}
                placeholder="اسم الشريك..."
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="text"
                value={prtRoleTitle}
                onChange={(e) => setPrtRoleTitle(e.target.value)}
                placeholder="الصفة (مثال: شريك مدير)"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={prtEquityStr}
                onChange={(e) => setPrtEquityStr(e.target.value)}
                placeholder="نسبة الملكية %"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-400"
              />
              <input
                type="number"
                min="0"
                value={prtCapitalStr}
                onChange={(e) => setPrtCapitalStr(e.target.value)}
                placeholder="حصة رأس المال"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
              <input
                type="number"
                min="0"
                value={prtSalaryStr}
                onChange={(e) => setPrtSalaryStr(e.target.value)}
                placeholder="راتب الإدارة الشهري"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400"
              />
              <button
                type="submit"
                className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-black rounded-xl py-2 px-3 cursor-pointer"
              >
                + تسجيل الشريك
              </button>
            </div>
          </form>

          {/* Partners Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">الكود</th>
                    <th className="py-3 px-4">اسم الشريك والصفة</th>
                    <th className="py-3 px-4">نسبة الملكية</th>
                    <th className="py-3 px-4">رأس المال</th>
                    <th className="py-3 px-4">راتب الإدارة</th>
                    <th className="py-3 px-4">إجمالي الإيداعات</th>
                    <th className="py-3 px-4">إجمالي المسحوبات</th>
                    <th className="py-3 px-4">صافي جاري الشريك</th>
                    <th className="py-3 px-4 text-left">حركة نقدية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {partners.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-mono text-purple-400 font-bold">
                        {p.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-black text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.roleTitle}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {p.equityPercent}%
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        {formatCurrency(p.capitalAmount, currency)}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400">
                        {p.monthlyManagementSalary > 0
                          ? formatCurrency(p.monthlyManagementSalary, currency)
                          : 'شريك غير متفرغ'}
                      </td>
                      <td className="py-3 px-4 font-mono text-sky-400">
                        {formatCurrency(p.totalDeposits, currency)}
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-400">
                        {formatCurrency(p.totalDrawings, currency)}
                      </td>
                      <td className="py-3 px-4 font-mono font-black">
                        <span
                          className={
                            p.currentBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          {formatCurrency(p.currentBalance, currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setTxTarget({
                                mode: 'partner_drawing',
                                id: p.id,
                                name: p.name,
                                currentBalanceMinor: p.currentBalance,
                              })
                            }
                            className="py-1.5 px-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            <span>سند مسحوبات</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setTxTarget({
                                mode: 'partner_deposit',
                                id: p.id,
                                name: p.name,
                                currentBalanceMinor: p.currentBalance,
                              })
                            }
                            className="py-1.5 px-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5" />
                            <span>إيداع شريك</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EMPLOYEES & WORKERS */}
      {subTab === 'employees' && (
        <div className="space-y-5">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block">
                إجمالي الرواتب الشهرية للعاملين
              </span>
              <strong className="text-base font-black font-mono text-white">
                {formatCurrency(totalStaffSalaries, currency)}
              </strong>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block">
                إجمالي السلف المسحوبة خلال الشهر
              </span>
              <strong className="text-base font-black font-mono text-amber-400">
                {formatCurrency(totalStaffAdvances, currency)}
              </strong>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5">
              <span className="text-[11px] text-emerald-300 font-bold block">
                صافي الرواتب المتبقية للصرف آخر الشهر
              </span>
              <strong className="text-base font-black font-mono text-emerald-400">
                {formatCurrency(
                  Math.max(0, totalStaffSalaries - totalStaffAdvances),
                  currency
                )}
              </strong>
            </div>
          </div>

          {/* Add Employee Form */}
          <form
            onSubmit={handleAddEmployee}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
          >
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>إضافة موظف أو عامل جديد في كشف الأجور والسلف</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
              <input
                type="text"
                required
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                placeholder="اسم الموظف / العامل..."
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="text"
                value={empJob}
                onChange={(e) => setEmpJob(e.target.value)}
                placeholder="المسمى الوظيفي (مثال: شيف)"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="text"
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
                placeholder="رقم الموبايل"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
              <input
                type="number"
                min="0"
                value={empSalaryStr}
                onChange={(e) => setEmpSalaryStr(e.target.value)}
                placeholder="الراتب الشهري الأساسي"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl py-2 px-3 cursor-pointer"
              >
                + تسجيل الموظف
              </button>
            </div>
          </form>

          {/* Employees Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">الكود</th>
                    <th className="py-3 px-4">اسم الموظف والوظيفة</th>
                    <th className="py-3 px-4">الراتب الشهري</th>
                    <th className="py-3 px-4">السلف المسحوبة</th>
                    <th className="py-3 px-4">عهدة مشتريات بطرفته</th>
                    <th className="py-3 px-4">صافي الراتب المتبقي</th>
                    <th className="py-3 px-4 text-left">إصدار سند</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {employees.map((emp) => {
                    const netRemaining = Math.max(
                      0,
                      emp.monthlySalary - emp.currentAdvances
                    );
                    return (
                      <tr key={emp.id} className="hover:bg-slate-900/50">
                        <td className="py-3 px-4 font-mono text-amber-400 font-bold">
                          {emp.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-black text-white">{emp.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {emp.jobTitle} · {emp.phone}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">
                          {formatCurrency(emp.monthlySalary, currency)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-400">
                          {formatCurrency(emp.currentAdvances, currency)}
                        </td>
                        <td className="py-3 px-4 font-mono text-sky-400">
                          {formatCurrency(emp.custodyBalance, currency)}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-400">
                          {formatCurrency(netRemaining, currency)}
                        </td>
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setTxTarget({
                                  mode: 'staff_advance',
                                  id: emp.id,
                                  name: emp.name,
                                  currentBalanceMinor: emp.currentAdvances,
                                })
                              }
                              className="py-1.5 px-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowUpCircle className="w-3.5 h-3.5" />
                              <span>صرف سلفة / راتب</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setTxTarget({
                                  mode: 'staff_custody_settlement',
                                  id: emp.id,
                                  name: emp.name,
                                  currentBalanceMinor: emp.custodyBalance,
                                })
                              }
                              className="py-1.5 px-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowDownCircle className="w-3.5 h-3.5" />
                              <span>رد / تسوية سلفة</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: UNIFIED PARTY & FINANCIAL CONTAINER LEDGER */}
      {subTab === 'unified_ledger' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">تصفية الحركات المالية حسب الطرف والوعاء:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={ledgerPartyFilter}
                onChange={(e) => setLedgerPartyFilter(e.target.value as 'all' | PartyType)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
              >
                <option value="all">كل الأطراف (شركاء / موظفين / موردين / عملاء)</option>
                <option value="partner">حركات الشركاء والملاك فقط</option>
                <option value="employee">حركات الموظفين والعمال فقط</option>
                <option value="supplier">حركات الموردين فقط</option>
                <option value="customer">حركات العملاء فقط</option>
                <option value="general">مصروفات وإيرادات تشغيل عامة</option>
              </select>

              <select
                value={ledgerContainerFilter}
                onChange={(e) =>
                  setLedgerContainerFilter(
                    e.target.value as 'all' | FinancialContainerType
                  )
                }
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
              >
                <option value="all">كل الأوعية النقدية (الدرج / الخزينة / البنك)</option>
                <option value="shift_drawer">درج نقدية الكاشير (الوردية)</option>
                <option value="main_safe">الخزينة الرئيسية للإدارة</option>
                <option value="bank_account">الحساب البنكي / فيزا</option>
                <option value="ewallet_instapay">محفظة إلكترونية / إنستاباي</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">رقم السند</th>
                    <th className="py-3 px-3">نوع الحركة</th>
                    <th className="py-3 px-3">تصنيف الطرف</th>
                    <th className="py-3 px-3">الطرف المستفيد / المودع</th>
                    <th className="py-3 px-3">الوعاء النقدي المتأثر</th>
                    <th className="py-3 px-3">المبلغ</th>
                    <th className="py-3 px-3">المنفذ والمعتمد</th>
                    <th className="py-3 px-3 text-left">طباعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredLedger.map((v) => {
                    const inferredParty: PartyType =
                      v.partyType ||
                      (v.partnerId
                        ? 'partner'
                        : v.employeeId
                        ? 'employee'
                        : v.supplierId
                        ? 'supplier'
                        : v.customerId
                        ? 'customer'
                        : 'general');

                    const isInflow =
                      v.type === 'receipt' ||
                      v.type === 'customer_collection' ||
                      v.type === 'partner_deposit' ||
                      v.type === 'staff_custody_settlement';

                    return (
                      <tr key={v.id} className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          <div>{v.voucherNumber}</div>
                          <div className="text-[10px] text-slate-500">
                            {v.date} · {v.time}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-200">
                          {getVoucherTypeLabel(v.type)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                            {getPartyTypeLabel(inferredParty)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{v.recipient}</div>
                          <div className="text-[10px] text-slate-400">{v.description}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px] font-bold">
                            <Building className="w-3 h-3" />
                            <span>{getFinancialContainerLabel(v.financialContainer)}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-black">
                          <span className={isInflow ? 'text-emerald-400' : 'text-rose-400'}>
                            {isInflow ? '+' : '-'} {formatCurrency(v.amount, currency)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          <div className="text-slate-300">المنفذ: {v.cashierName}</div>
                          {v.approvedByUserName && (
                            <div className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>اعتماد: {v.approvedByUserName}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-left">
                          {onVoucherCreated && (
                            <button
                              type="button"
                              onClick={() => onVoucherCreated(v)}
                              className="p-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg transition-colors cursor-pointer"
                              title="معاينة وطباعة السند"
                            >
                              <Printer className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* QUICK PARTY VOUCHER MODAL */}
      {txTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleExecutePartyTx}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl"
          >
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {getVoucherTypeLabel(txTarget.mode)}
              </h3>
              <p className="text-xs text-amber-400 font-bold mt-0.5">
                الطرف المعني: {txTarget.name}
              </p>
            </div>

            {txError && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
                {txError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  اختر الوعاء النقدي المنفذ منه الحركة:
                </label>
                <select
                  value={txContainer}
                  onChange={(e) =>
                    setTxContainer(e.target.value as FinancialContainerType)
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold"
                >
                  <option value="main_safe">الخزينة الرئيسية للإدارة (Main Safe)</option>
                  <option value="shift_drawer">
                    درج نقدية الكاشير الحالي (يؤثر على عهدة الوردية)
                  </option>
                  <option value="bank_account">الحساب البنكي / تحويل بنكي</option>
                  <option value="ewallet_instapay">محفظة إلكترونية / إنستاباي</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  المبلغ ({currency}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  autoFocus
                  value={txAmountStr}
                  onChange={(e) => setTxAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-base font-mono text-amber-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  البيان / سبب الحركة:
                </label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="تفاصيل السند لإثباته في كشف الحساب..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {activeUser.role !== 'partner' && activeUser.role !== 'manager' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <label className="font-bold text-amber-300 block">
                    اعتماد المدير أو الشريك المالك (PIN):
                  </label>
                  <input
                    type="password"
                    required
                    value={approverPin}
                    onChange={(e) => setApproverPin(e.target.value)}
                    placeholder="أدخل PIN المدير (3333) أو الشريك (1234)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-amber-400"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
              >
                حفظ وترحيل للحساب ومعاينة السند
              </button>
              <button
                type="button"
                onClick={() => setTxTarget(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
