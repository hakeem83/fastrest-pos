import React, { useMemo, useState } from 'react';
import {
  AppUser,
  AttendanceRecord,
  Employee,
  FinancialContainerType,
  HRAdjustment,
  PayrollSettlement,
  Voucher,
} from '../types';
import {
  formatCurrency,
  getFinancialContainerLabel,
  getTodayDateString,
  StorageService,
} from '../services/storage';
import {
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

interface Props {
  currency: string;
  activeUser: AppUser;
  employees: Employee[];
  onRefresh: () => void;
  onVoucherCreated?: (voucher: Voucher) => void;
}

export const HRManagementSuite: React.FC<Props> = ({
  currency,
  activeUser,
  employees,
  onRefresh,
}) => {
  const [hrTab, setHrTab] = useState<
    'payroll' | 'attendance' | 'performance_bonuses' | 'staff_profiles'
  >('payroll');

  const today = getTodayDateString();
  const [selectedMonth, setSelectedMonth] = useState<string>(today.slice(0, 7));
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Attendance form state
  const [attEmpId, setAttEmpId] = useState<string>(employees[0]?.id || '');
  const [attStatus, setAttStatus] = useState<
    'present' | 'late' | 'absent' | 'leave'
  >('present');
  const [attLateMinutes, setAttLateMinutes] = useState<string>('0');
  const [attNotes, setAttNotes] = useState<string>('');

  // HR Adjustment (Bonus / Deduction / Commission) state
  const [adjEmpId, setAdjEmpId] = useState<string>(employees[0]?.id || '');
  const [adjType, setAdjType] = useState<
    'bonus' | 'deduction' | 'commission' | 'overtime_pay'
  >('bonus');
  const [adjAmountMajor, setAdjAmountMajor] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');

  // Employee Profile Modal / Form state
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState('');
  const [empJobTitle, setEmpJobTitle] = useState('كاشير / مبيعات');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalaryMajor, setEmpSalaryMajor] = useState('6000');
  const [empShiftHours, setEmpShiftHours] = useState('8');
  const [empCommPercent, setEmpCommPercent] = useState('1');
  const [empDeliveryCommMajor, setEmpDeliveryCommMajor] = useState('10');

  // Payroll Settlement Modal state
  const [settlingRow, setSettlingRow] = useState<{
    employee: Employee;
    baseSalaryMinor: number;
    bonusesMinor: number;
    commissionsMinor: number;
    overtimeMinor: number;
    deductionsMinor: number;
    advancesDeductedMinor: number;
    netPayableMinor: number;
  } | null>(null);
  const [payrollContainer, setPayrollContainer] =
    useState<FinancialContainerType>('main_safe');
  const [payrollNotes, setPayrollNotes] = useState<string>('');

  const attendanceLogs: AttendanceRecord[] = StorageService.getAttendanceLogs();
  const hrAdjustments: HRAdjustment[] = StorageService.getHRAdjustments();
  const payrollSettlements: PayrollSettlement[] =
    StorageService.getPayrollSettlements();
  const allOrders = StorageService.getSaleOrders();

  // Filter attendance & adjustments by selectedMonth
  const monthAttendance = useMemo(
    () =>
      attendanceLogs.filter((a) => a.date.startsWith(selectedMonth)),
    [attendanceLogs, selectedMonth]
  );

  const monthAdjustments = useMemo(
    () => hrAdjustments.filter((h) => h.month === selectedMonth),
    [hrAdjustments, selectedMonth]
  );

  const monthPayrolls = useMemo(
    () => payrollSettlements.filter((p) => p.month === selectedMonth),
    [payrollSettlements, selectedMonth]
  );

  // Live Sales & Delivery Performance Engine for selectedMonth
  const staffPerformanceList = useMemo(() => {
    const validMonthOrders = allOrders.filter(
      (o) =>
        o.date.startsWith(selectedMonth) &&
        !o.isReversed &&
        o.orderStatus !== 'cancelled' &&
        o.paymentStatus === 'paid'
    );

    return employees.map((emp) => {
      const cashierOrders = validMonthOrders.filter(
        (o) =>
          o.cashierName.trim().toLowerCase() === emp.name.trim().toLowerCase()
      );
      const driverOrders = validMonthOrders.filter(
        (o) =>
          (o.deliveryDriverName || '').trim().toLowerCase() ===
            emp.name.trim().toLowerCase() ||
          (emp.linkedDriverId && o.deliveryDriverId === emp.linkedDriverId)
      );

      const cashierSalesMinor = cashierOrders.reduce(
        (s, o) => s + o.totalAmount,
        0
      );
      const driverSalesMinor = driverOrders.reduce(
        (s, o) => s + o.totalAmount,
        0
      );

      const commRate = emp.commissionRatePercent ?? 1;
      const perDeliveryMinor = emp.perDeliveryCommissionMinor ?? 1000; // default 10 EGP per delivery

      const salesCommissionMinor = Math.round(
        cashierSalesMinor * (commRate / 100)
      );
      const deliveryCommissionMinor =
        driverOrders.length * perDeliveryMinor;
      const totalSuggestedCommissionMinor =
        salesCommissionMinor + deliveryCommissionMinor;

      return {
        employee: emp,
        cashierOrdersCount: cashierOrders.length,
        cashierSalesMinor,
        driverOrdersCount: driverOrders.length,
        driverSalesMinor,
        commRate,
        perDeliveryMinor,
        totalSuggestedCommissionMinor,
      };
    });
  }, [employees, allOrders, selectedMonth]);

  // Build Monthly Payroll Sheet Rows
  const payrollSheetRows = useMemo(() => {
    return employees.map((emp) => {
      const empAdjs = monthAdjustments.filter(
        (a) => a.employeeId === emp.id && !a.isSettledInPayroll
      );
      const bonusesMinor = empAdjs
        .filter((a) => a.type === 'bonus')
        .reduce((s, a) => s + a.amountMinor, 0);
      const commissionsMinor = empAdjs
        .filter((a) => a.type === 'commission')
        .reduce((s, a) => s + a.amountMinor, 0);
      const overtimeMinor = empAdjs
        .filter((a) => a.type === 'overtime_pay')
        .reduce((s, a) => s + a.amountMinor, 0);
      const deductionsMinor = empAdjs
        .filter((a) => a.type === 'deduction')
        .reduce((s, a) => s + a.amountMinor, 0);

      const empAtt = monthAttendance.filter((a) => a.employeeId === emp.id);
      const presentDays = empAtt.filter(
        (a) => a.status === 'present' || a.status === 'late'
      ).length;
      const totalLateMinutes = empAtt.reduce((s, a) => s + a.lateMinutes, 0);

      const baseSalaryMinor = emp.monthlySalary;
      const advancesDeductedMinor = emp.currentAdvances || 0;
      const grossMinor =
        baseSalaryMinor + bonusesMinor + commissionsMinor + overtimeMinor;
      const netPayableMinor = Math.max(
        0,
        grossMinor - deductionsMinor - advancesDeductedMinor
      );

      const existingSettlement = monthPayrolls.find(
        (p) => p.employeeId === emp.id
      );

      return {
        employee: emp,
        presentDays,
        totalLateMinutes,
        baseSalaryMinor,
        bonusesMinor,
        commissionsMinor,
        overtimeMinor,
        deductionsMinor,
        advancesDeductedMinor,
        netPayableMinor,
        existingSettlement,
      };
    });
  }, [employees, monthAdjustments, monthAttendance, monthPayrolls]);

  const handleRecordCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attEmpId) return;
    try {
      const rec = StorageService.recordAttendanceCheckIn({
        employeeId: attEmpId,
        status: attStatus,
        lateMinutes: parseInt(attLateMinutes, 10) || 0,
        notes: attNotes,
      });
      setFeedback({
        type: 'success',
        message: `تم تسجيل حضور الموظف «${rec.employeeName}» الساعة ${rec.checkInTime}.`,
      });
      setAttLateMinutes('0');
      setAttNotes('');
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر تسجيل الحضور',
      });
    }
  };

  const handleAddHRAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const major = parseFloat(adjAmountMajor);
    if (!adjEmpId || isNaN(major) || major <= 0) {
      setFeedback({ type: 'error', message: 'يرجى إدخال قيمة صحيحة' });
      return;
    }
    try {
      const item = StorageService.addHRAdjustment({
        employeeId: adjEmpId,
        type: adjType,
        amountMinor: Math.round(major * 100),
        reason: adjReason || 'تسوية موارد بشرية',
        month: selectedMonth,
        recordedBy: activeUser.name,
      });
      setFeedback({
        type: 'success',
        message: `تم إدراج البند في مسير رواتب الموظف «${item.employeeName}» لشهر ${selectedMonth}.`,
      });
      setAdjAmountMajor('');
      setAdjReason('');
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر حفظ البند',
      });
    }
  };

  const handleAccreditSuggestedCommission = (
    emp: Employee,
    amountMinor: number,
    details: string
  ) => {
    if (amountMinor <= 0) {
      setFeedback({
        type: 'error',
        message: 'لا توجد مبيعات أو توصيلات مسجلة باسم هذا الموظف خلال الشهر لاحتساب عمولة.',
      });
      return;
    }
    StorageService.addHRAdjustment({
      employeeId: emp.id,
      type: 'commission',
      amountMinor,
      reason: `عمولة أداء المبيعات والتوصيل عن شهر ${selectedMonth} (${details})`,
      month: selectedMonth,
      recordedBy: activeUser.name,
    });
    setFeedback({
      type: 'success',
      message: `تم اعتماد عمولة الأداء (${formatCurrency(
        amountMinor,
        currency
      )}) للموظف «${emp.name}» وإضافتها لمسير الرواتب.`,
    });
    onRefresh();
  };

  const handleConfirmSettlePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingRow) return;
    try {
      const settlement = StorageService.settleEmployeePayroll({
        employeeId: settlingRow.employee.id,
        month: selectedMonth,
        baseSalaryMinor: settlingRow.baseSalaryMinor,
        bonusesMinor: settlingRow.bonusesMinor,
        commissionsMinor: settlingRow.commissionsMinor,
        overtimeMinor: settlingRow.overtimeMinor,
        deductionsMinor: settlingRow.deductionsMinor,
        advancesDeductedMinor: settlingRow.advancesDeductedMinor,
        financialContainer: payrollContainer,
        paidBy: activeUser.name,
        notes: payrollNotes,
      });
      setFeedback({
        type: 'success',
        message: `تم صرف راتب «${settlement.employeeName}» بموجب المسير (${settlement.payrollNumber}) وسند الصرف (${settlement.voucherNumber}) وترحيله لقائمة الدخل.`,
      });
      setSettlingRow(null);
      setPayrollNotes('');
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'تعذر صرف الراتب',
      });
    }
  };

  const handleSaveEmployeeProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    const salaryMinor = Math.round((parseFloat(empSalaryMajor) || 0) * 100);
    const shiftHours = parseFloat(empShiftHours) || 8;
    const commPercent = parseFloat(empCommPercent) || 0;
    const deliveryCommMinor = Math.round(
      (parseFloat(empDeliveryCommMajor) || 0) * 100
    );

    if (editingEmp) {
      const updated = employees.map((emp) =>
        emp.id === editingEmp.id
          ? {
              ...emp,
              name: empName.trim(),
              jobTitle: empJobTitle.trim(),
              phone: empPhone.trim(),
              monthlySalary: salaryMinor,
              shiftHoursPerDay: shiftHours,
              commissionRatePercent: commPercent,
              perDeliveryCommissionMinor: deliveryCommMinor,
            }
          : emp
      );
      StorageService.saveEmployees(updated);
      setFeedback({
        type: 'success',
        message: `تم تحديث الملف الوظيفي للموظف «${empName}».`,
      });
      setEditingEmp(null);
    } else {
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        code: `EMP-${String(employees.length + 1).padStart(2, '0')}`,
        name: empName.trim(),
        jobTitle: empJobTitle.trim(),
        phone: empPhone.trim(),
        monthlySalary: salaryMinor,
        currentAdvances: 0,
        custodyBalance: 0,
        isActive: true,
        hireDate: today,
        shiftHoursPerDay: shiftHours,
        commissionRatePercent: commPercent,
        perDeliveryCommissionMinor: deliveryCommMinor,
      };
      StorageService.saveEmployees([...employees, newEmp]);
      setFeedback({
        type: 'success',
        message: `تمت إضافة الموظف «${newEmp.name}» إلى منظومة الموارد البشرية.`,
      });
    }
    setEmpName('');
    setEmpPhone('');
    onRefresh();
  };

  const totalBaseSalariesMinor = employees.reduce(
    (s, e) => s + e.monthlySalary,
    0
  );
  const totalAdvancesMinor = employees.reduce(
    (s, e) => s + (e.currentAdvances || 0),
    0
  );
  const totalNetPayableThisMonth = payrollSheetRows.reduce(
    (s, r) => s + r.netPayableMinor,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header & Month Selector */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              منظومة إدارة الموارد البشرية والرواتب والحضور والعمولات (HR & Payroll ERP)
            </h3>
            <p className="text-xs text-slate-400">
              مرتبطة إدارياً بالموظفين وتشغيلياً بمبيعات الكاشير والطيارين ومالياً بالخزينة وقائمة الدخل.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400 font-bold">شهر المسير:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-amber-400 font-mono font-bold focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-[10px] text-slate-400 block">عدد الموظفين</span>
              <span className="font-mono font-black text-white">
                {employees.length}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-[10px] text-slate-400 block">السلف المسحوبة</span>
              <span className="font-mono font-black text-amber-400">
                {formatCurrency(totalAdvancesMinor, currency)}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-[10px] text-slate-400 block">صافي الرواتب المستحقة</span>
              <span className="font-mono font-black text-emerald-400">
                {formatCurrency(totalNetPayableThisMonth, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setHrTab('payroll')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            hrTab === 'payroll'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>1. مسير الرواتب الشهري والصرف المالي</span>
        </button>

        <button
          type="button"
          onClick={() => setHrTab('attendance')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            hrTab === 'attendance'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>2. الحضور والانصراف والورديات ({monthAttendance.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setHrTab('performance_bonuses')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            hrTab === 'performance_bonuses'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>3. تقييم أداء المبيعات والعمولات والمكافآت والجزاءات</span>
        </button>

        <button
          type="button"
          onClick={() => setHrTab('staff_profiles')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            hrTab === 'staff_profiles'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. ملفات شؤون الموظفين وإعدادات العمولات ({employees.length})</span>
        </button>
      </div>

      {/* TAB 1: AUTOMATED MONTHLY PAYROLL SHEET */}
      {hrTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-white">
                  كشف مسير الرواتب الآلي عن شهر ({selectedMonth})
                </h4>
                <p className="text-[11px] text-slate-400">
                  يحتسب الصافي تلقائياً: الراتب الأساسي + المكافآت + العمولات + الإضافي - الجزاءات - السلف المسحوبة
                </p>
              </div>
              <div className="text-xs font-mono text-slate-300">
                إجمالي الرواتب الأساسية:{' '}
                <span className="font-bold text-white">
                  {formatCurrency(totalBaseSalariesMinor, currency)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">الموظف والوظيفة</th>
                    <th className="py-3 px-3">أيام الحضور</th>
                    <th className="py-3 px-3">الراتب الأساسي</th>
                    <th className="py-3 px-3">المكافآت والعمولات</th>
                    <th className="py-3 px-3">الجزاءات</th>
                    <th className="py-3 px-3">خصم السلف</th>
                    <th className="py-3 px-3">صافي المستحق</th>
                    <th className="py-3 px-3 text-left">صرف وترحيل للخزينة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {payrollSheetRows.map((row) => (
                    <tr key={row.employee.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">
                          {row.employee.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {row.employee.jobTitle} · {row.employee.code}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                        {row.presentDays} يوم
                        {row.totalLateMinutes > 0 && (
                          <span className="block text-[10px] text-amber-400">
                            تأخير: {row.totalLateMinutes} د
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums font-bold text-white">
                        {formatCurrency(row.baseSalaryMinor, currency)}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-emerald-400 font-bold">
                        +
                        {formatCurrency(
                          row.bonusesMinor +
                            row.commissionsMinor +
                            row.overtimeMinor,
                          currency
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-rose-400">
                        -{formatCurrency(row.deductionsMinor, currency)}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-amber-400">
                        -{formatCurrency(row.advancesDeductedMinor, currency)}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums font-black text-emerald-300 text-sm">
                        {formatCurrency(row.netPayableMinor, currency)}
                      </td>
                      <td className="py-3 px-3 text-left">
                        {row.existingSettlement ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              تم الصرف ({row.existingSettlement.voucherNumber})
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {formatCurrency(
                                row.existingSettlement.netPaidMinor,
                                currency
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSettlingRow(row)}
                            className="inline-flex items-center gap-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-[11px] transition-colors cursor-pointer"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>اعتماد وصرف الراتب</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Payroll Settlements */}
          {monthPayrolls.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-black text-white mb-3">
                مسيرات الرواتب المنصرفة والمُرحلة للخزينة في شهر ({selectedMonth})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">رقم المسير</th>
                      <th className="py-2 px-3">التاريخ</th>
                      <th className="py-2 px-3">الموظف</th>
                      <th className="py-2 px-3">صافي المنصرف</th>
                      <th className="py-2 px-3">الوعاء المالي</th>
                      <th className="py-2 px-3">رقم سند الخزينة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {monthPayrolls.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono font-bold text-amber-400">
                          {p.payrollNumber}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-300">
                          {p.date} · {p.time}
                        </td>
                        <td className="py-2 px-3 font-bold text-white">
                          {p.employeeName}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums font-bold text-emerald-400">
                          {formatCurrency(p.netPaidMinor, currency)}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {getFinancialContainerLabel(p.financialContainer)}
                        </td>
                        <td className="py-2 px-3 font-mono text-sky-300 font-bold">
                          {p.voucherNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ATTENDANCE & SHIFTS */}
      {hrTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>تسجيل حضور ووردية موظف</span>
            </h4>
            <form onSubmit={handleRecordCheckIn} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  اختر الموظف
                </label>
                <select
                  value={attEmpId}
                  onChange={(e) => setAttEmpId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-amber-500"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.jobTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    الحالة
                  </label>
                  <select
                    value={attStatus}
                    onChange={(e) =>
                      setAttStatus(
                        e.target.value as 'present' | 'late' | 'absent' | 'leave'
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="present">حاضر في الموعد</option>
                    <option value="late">حضور متأخر</option>
                    <option value="absent">غياب بدون إذن</option>
                    <option value="leave">إجازة معتمدة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    دقائق التأخير
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={attLateMinutes}
                    onChange={(e) => setAttLateMinutes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono tabular-nums focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  ملاحظات الوردية
                </label>
                <input
                  type="text"
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                  placeholder="مثال: وردية صباحية / تغطية إضافية..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-colors cursor-pointer"
              >
                تسجيل الحضور الآن
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-black text-white">
                سجل الحضور والانصراف وساعات العمل ({monthAttendance.length})
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">الموظف</th>
                    <th className="py-2.5 px-3">الحضور</th>
                    <th className="py-2.5 px-3">الانصراف</th>
                    <th className="py-2.5 px-3">ساعات العمل</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3 text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {monthAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        لا توجد سجلات حضور مسجلة في هذا الشهر
                      </td>
                    </tr>
                  ) : (
                    monthAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                          {rec.date}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {rec.employeeName}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-emerald-400">
                          {rec.checkInTime}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-sky-400">
                          {rec.checkOutTime || 'قيد العمل'}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-white">
                          {rec.workedHours} ساعة
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              rec.status === 'present'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : rec.status === 'late'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {rec.status === 'present'
                              ? 'حاضر'
                              : rec.status === 'late'
                              ? `متأخر (${rec.lateMinutes} د)`
                              : rec.status === 'absent'
                              ? 'غائب'
                              : 'إجازة'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-left flex items-center justify-end gap-1.5">
                          {!rec.checkOutTime && (
                            <button
                              type="button"
                              onClick={() => {
                                StorageService.recordAttendanceCheckOut({
                                  attendanceId: rec.id,
                                });
                                onRefresh();
                              }}
                              className="py-1 px-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              تسجيل انصراف
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              StorageService.deleteAttendanceRecord(rec.id);
                              onRefresh();
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMANCE COMMISSIONS, BONUSES & DEDUCTIONS */}
      {hrTab === 'performance_bonuses' && (
        <div className="space-y-4">
          {/* Automated POS & Delivery Performance Cards */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>
                    تقييم أداء المبيعات والتوصيل والعمولات المحتسبة آلياً لشهر ({selectedMonth})
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  يقرأ النظام فواتير الكاشير وتوصيلات الطيارين غير المعكوسة ويحسب العمولة المستحقة بضغطة زر لترحيلها للمسير.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {staffPerformanceList.map((perf) => (
                <div
                  key={perf.employee.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-white block">
                        {perf.employee.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {perf.employee.jobTitle}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                      عمولة مقترحة:{' '}
                      {formatCurrency(
                        perf.totalSuggestedCommissionMinor,
                        currency
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">فواتير الكاشير</span>
                      <span className="font-mono font-bold text-white">
                        {perf.cashierOrdersCount} فاتورة (
                        {formatCurrency(perf.cashierSalesMinor, currency)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">توصيلات الدليفري</span>
                      <span className="font-mono font-bold text-sky-300">
                        {perf.driverOrdersCount} طلب توصيل
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleAccreditSuggestedCommission(
                        perf.employee,
                        perf.totalSuggestedCommissionMinor,
                        `${perf.cashierOrdersCount} فاتورة مبيعات + ${perf.driverOrdersCount} توصيلة`
                      )
                    }
                    className="w-full py-2 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    اعتماد العمولة وإدراجها في مسير الراتب
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Bonus / Penalty / Overtime Entry + Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-sm font-black text-white">
                تسجيل مكافأة أو جزاء أو إضافي
              </h4>
              <form onSubmit={handleAddHRAdjustment} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    الموظف
                  </label>
                  <select
                    value={adjEmpId}
                    onChange={(e) => setAdjEmpId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} — {e.jobTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">
                      نوع البند
                    </label>
                    <select
                      value={adjType}
                      onChange={(e) =>
                        setAdjType(
                          e.target.value as
                            | 'bonus'
                            | 'deduction'
                            | 'commission'
                            | 'overtime_pay'
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="bonus">مكافأة إجادة (+)</option>
                      <option value="overtime_pay">بدل ساعات إضافية (+)</option>
                      <option value="commission">عمولة مبيعات (+)</option>
                      <option value="deduction">جزاء / خصم إداري (-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">
                      المبلغ ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={adjAmountMajor}
                      onChange={(e) => setAdjAmountMajor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    البيان / السبب
                  </label>
                  <input
                    type="text"
                    required
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="مثال: مكافأة التزام / خصم تأخير..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer"
                >
                  حفظ وإدراج بالمسير الشهري
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h4 className="text-sm font-black text-white">
                  سجل المكافآت والعمولات والجزاءات لشهر ({selectedMonth})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3">الموظف</th>
                      <th className="py-2.5 px-3">النوع</th>
                      <th className="py-2.5 px-3">المبلغ</th>
                      <th className="py-2.5 px-3">السبب</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3 text-left">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {monthAdjustments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-slate-500"
                        >
                          لا توجد مكافآت أو جزاءات مسجلة في هذا الشهر
                        </td>
                      </tr>
                    ) : (
                      monthAdjustments.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                            {item.date}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {item.employeeName}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                item.type === 'deduction'
                                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {item.type === 'bonus'
                                ? 'مكافأة'
                                : item.type === 'commission'
                                ? 'عمولة مبيعات'
                                : item.type === 'overtime_pay'
                                ? 'إضافي'
                                : 'جزاء / خصم'}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 font-mono tabular-nums font-bold ${
                              item.type === 'deduction'
                                ? 'text-rose-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {item.type === 'deduction' ? '-' : '+'}
                            {formatCurrency(item.amountMinor, currency)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {item.reason}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.isSettledInPayroll ? (
                              <span className="text-[10px] text-sky-300 font-bold">
                                تم الصرف بالمسير
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-300 font-bold">
                                قيد الصرف
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-left">
                            {!item.isSettledInPayroll && (
                              <button
                                type="button"
                                onClick={() => {
                                  StorageService.deleteHRAdjustment(item.id);
                                  onRefresh();
                                }}
                                className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMPLOYEE PROFILES & COMMISSION SETTINGS */}
      {hrTab === 'staff_profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>
                {editingEmp
                  ? `تعديل ملف: ${editingEmp.name}`
                  : 'إضافة موظف جديد وإعداد عمولاته'}
              </span>
            </h4>
            <form onSubmit={handleSaveEmployeeProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  اسم الموظف الكامل
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="مثال: أحمد محمود"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    المسمى الوظيفي
                  </label>
                  <input
                    type="text"
                    required
                    value={empJobTitle}
                    onChange={(e) => setEmpJobTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    الراتب الأساسي الشهري ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={empSalaryMajor}
                    onChange={(e) => setEmpSalaryMajor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    ساعات الوردية اليومية
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={empShiftHours}
                    onChange={(e) => setEmpShiftHours(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    نسبة عمولة المبيعات (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={empCommPercent}
                    onChange={(e) => setEmpCommPercent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    عمولة الأوردر للطيار ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={empDeliveryCommMajor}
                    onChange={(e) => setEmpDeliveryCommMajor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer"
                >
                  {editingEmp ? 'حفظ التعديلات' : 'إضافة الموظف'}
                </button>
                {editingEmp && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmp(null);
                      setEmpName('');
                    }}
                    className="py-2.5 px-3 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h4 className="text-sm font-black text-white">
                قائمة الموظفين وإعدادات الرواتب والعمولات ({employees.length})
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">الكود</th>
                    <th className="py-2.5 px-3">الموظف</th>
                    <th className="py-2.5 px-3">الوظيفة</th>
                    <th className="py-2.5 px-3">الراتب الأساسي</th>
                    <th className="py-2.5 px-3">نسبة العمولة</th>
                    <th className="py-2.5 px-3">السلف الحالية</th>
                    <th className="py-2.5 px-3 text-left">تعديل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                        {emp.code}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {emp.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {emp.jobTitle}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-white">
                        {formatCurrency(emp.monthlySalary, currency)}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-sky-300">
                        {emp.commissionRatePercent ?? 1}% مبيعات ·{' '}
                        {formatCurrency(
                          emp.perDeliveryCommissionMinor ?? 1000,
                          currency
                        )}
                        /توصيلة
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-amber-400">
                        {formatCurrency(emp.currentAdvances, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEmp(emp);
                            setEmpName(emp.name);
                            setEmpJobTitle(emp.jobTitle);
                            setEmpPhone(emp.phone);
                            setEmpSalaryMajor(String(emp.monthlySalary / 100));
                            setEmpShiftHours(String(emp.shiftHoursPerDay || 8));
                            setEmpCommPercent(
                              String(emp.commissionRatePercent ?? 1)
                            );
                            setEmpDeliveryCommMajor(
                              String((emp.perDeliveryCommissionMinor ?? 1000) / 100)
                            );
                          }}
                          className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          تعديل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SETTLE & DISBURSE EMPLOYEE PAYROLL */}
      {settlingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl">
            <div className="border-b border-slate-800 pb-3">
              <h4 className="text-sm font-black text-white">
                اعتماد وصرف صافي راتب: {settlingRow.employee.name}
              </h4>
              <p className="text-[11px] text-slate-400">
                شهر المسير: {selectedMonth} · الوظيفة: {settlingRow.employee.jobTitle}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">الراتب الأساسي:</span>
                <span className="font-mono font-bold text-white">
                  {formatCurrency(settlingRow.baseSalaryMinor, currency)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>(+) المكافآت والعمولات والإضافي:</span>
                <span className="font-mono font-bold">
                  +
                  {formatCurrency(
                    settlingRow.bonusesMinor +
                      settlingRow.commissionsMinor +
                      settlingRow.overtimeMinor,
                    currency
                  )}
                </span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) الجزاءات والخصومات:</span>
                <span className="font-mono font-bold">
                  -{formatCurrency(settlingRow.deductionsMinor, currency)}
                </span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>(-) استرداد السلف المسحوبة:</span>
                <span className="font-mono font-bold">
                  -{formatCurrency(settlingRow.advancesDeductedMinor, currency)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-black text-sm text-emerald-300">
                <span>صافي المبلغ المنصرف الآن:</span>
                <span className="font-mono">
                  {formatCurrency(settlingRow.netPayableMinor, currency)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmSettlePayroll} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  اختر الوعاء المالي للصرف (يُنشئ سند صرف رسمي ويُدرج في قائمة الدخل):
                </label>
                <select
                  value={payrollContainer}
                  onChange={(e) =>
                    setPayrollContainer(e.target.value as FinancialContainerType)
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                >
                  <option value="main_safe">الخزينة الرئيسية للإدارة</option>
                  <option value="shift_drawer">درج نقدية الكاشير (الوردية)</option>
                  <option value="bank_account">الحساب البنكي / تحويل بنكي</option>
                  <option value="ewallet_instapay">
                    محفظة إلكترونية / إنستاباي
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  ملاحظات الصرف (اختياري)
                </label>
                <input
                  type="text"
                  value={payrollNotes}
                  onChange={(e) => setPayrollNotes(e.target.value)}
                  placeholder="مثال: تم التسليم نقداً وتصفية السلف..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl cursor-pointer"
                >
                  تأكيد الصرف وإصدار السند المالي
                </button>
                <button
                  type="button"
                  onClick={() => setSettlingRow(null)}
                  className="py-2.5 px-4 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
