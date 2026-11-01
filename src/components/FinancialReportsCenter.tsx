import React, { useMemo, useState } from 'react';
import {
  FinancialContainerType,
  InventoryItem,
  MenuItem,
  Shift,
} from '../types';
import {
  formatCurrency,
  getFinancialContainerLabel,
  getTodayDateString,
  StorageService,
} from '../services/storage';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChefHat,
  FileSpreadsheet,
  Landmark,
  Layers,
  PieChart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface Props {
  currency: string;
  inventory: InventoryItem[];
  menuItems: MenuItem[];
  shifts: Shift[];
}

export const FinancialReportsCenter: React.FC<Props> = ({
  currency,
  inventory,
  shifts,
}) => {
  const [reportTab, setReportTab] = useState<
    'pnl' | 'cogs_variance' | 'cash_flow' | 'menu_engineering'
  >('pnl');

  const today = getTodayDateString();
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>(today);
  const [presetPeriod, setPresetPeriod] = useState<
    'all' | 'today' | 'month' | 'custom'
  >('all');

  const applyPreset = (preset: 'all' | 'today' | 'month') => {
    setPresetPeriod(preset);
    if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(today);
    } else if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'month') {
      setStartDate(firstOfMonth);
      setEndDate(today);
    }
  };

  const allOrders = StorageService.getSaleOrders();
  const allVouchers = StorageService.getVouchers();
  const allWaste = StorageService.getWasteLogs();

  // Filtered datasets by date range
  const periodOrders = useMemo(
    () => allOrders.filter((o) => o.date >= startDate && o.date <= endDate),
    [allOrders, startDate, endDate]
  );

  const validOrders = useMemo(
    () =>
      periodOrders.filter(
        (o) => !o.isReversed && o.orderStatus !== 'cancelled'
      ),
    [periodOrders]
  );

  const reversedOrders = useMemo(
    () => periodOrders.filter((o) => o.isReversed),
    [periodOrders]
  );

  const validVouchers = useMemo(
    () =>
      allVouchers.filter(
        (v) =>
          v.date >= startDate &&
          v.date <= endDate &&
          !v.isReversed &&
          !v.reversesVoucherId
      ),
    [allVouchers, startDate, endDate]
  );

  const periodWaste = useMemo(
    () => allWaste.filter((w) => w.date >= startDate && w.date <= endDate),
    [allWaste, startDate, endDate]
  );

  // 1. P&L Calculations
  const pnlMetrics = useMemo(() => {
    const grossMenuSales = validOrders.reduce((s, o) => s + o.subtotal, 0);
    const totalDiscounts = validOrders.reduce((s, o) => s + o.discount, 0);
    const totalDeliveryFees = validOrders.reduce(
      (s, o) => s + (o.deliveryFee || 0),
      0
    );
    const netSalesRevenue = validOrders.reduce((s, o) => s + o.totalAmount, 0);
    const reversedSalesAmount = reversedOrders.reduce(
      (s, o) => s + o.totalAmount,
      0
    );

    const theoreticalCOGS = validOrders.reduce(
      (s, o) => s + o.totalTheoreticalCost,
      0
    );
    const wasteLossMinor = periodWaste.reduce((s, w) => s + w.totalLoss, 0);
    const totalDirectCOGS = theoreticalCOGS + wasteLossMinor;

    const grossProfit = netSalesRevenue - totalDirectCOGS;
    const grossMarginPercent =
      netSalesRevenue > 0 ? (grossProfit / netSalesRevenue) * 100 : 0;

    // Operating Expenses from Vouchers (excluding supplier_payment/credit_purchase for raw materials if EXP-101 is raw materials, and excluding partner_drawing which is equity)
    const payrollAndStaffExpenses = validVouchers
      .filter(
        (v) =>
          v.type === 'payroll_payment' ||
          v.type === 'staff_advance' ||
          v.accountCode === 'EXP-102'
      )
      .reduce((s, v) => s + v.amount, 0);

    const utilitiesAndGeneralExpenses = validVouchers
      .filter(
        (v) =>
          v.type === 'expense' &&
          v.accountCode !== 'EXP-102' &&
          v.accountCode !== 'EXP-101' &&
          v.accountCode !== 'EXP-105'
      )
      .reduce((s, v) => s + v.amount, 0);

    const directKitchenPurchasesVouchers = validVouchers
      .filter((v) => v.type === 'expense' && v.accountCode === 'EXP-101')
      .reduce((s, v) => s + v.amount, 0);

    const creditPurchasesVouchers = validVouchers
      .filter((v) => v.type === 'credit_purchase')
      .reduce((s, v) => s + v.amount, 0);

    const totalOperatingExpenses =
      payrollAndStaffExpenses + utilitiesAndGeneralExpenses;

    const netOperatingProfit = grossProfit - totalOperatingExpenses;
    const netMarginPercent =
      netSalesRevenue > 0 ? (netOperatingProfit / netSalesRevenue) * 100 : 0;

    return {
      grossMenuSales,
      totalDiscounts,
      totalDeliveryFees,
      netSalesRevenue,
      reversedSalesAmount,
      theoreticalCOGS,
      wasteLossMinor,
      totalDirectCOGS,
      grossProfit,
      grossMarginPercent,
      payrollAndStaffExpenses,
      utilitiesAndGeneralExpenses,
      directKitchenPurchasesVouchers,
      creditPurchasesVouchers,
      totalOperatingExpenses,
      netOperatingProfit,
      netMarginPercent,
    };
  }, [validOrders, reversedOrders, periodWaste, validVouchers]);

  // 2. COGS & Inventory Valuation
  const inventoryValuationMinor = useMemo(
    () =>
      inventory.reduce(
        (s, item) => s + Math.round(item.currentStock * item.unitCost),
        0
      ),
    [inventory]
  );

  // 3. Cash Flow across the 4 Financial Containers
  const cashFlowByContainer = useMemo(() => {
    const containers: FinancialContainerType[] = [
      'shift_drawer',
      'main_safe',
      'bank_account',
      'ewallet_instapay',
    ];

    const paidOrders = validOrders.filter((o) => o.paymentStatus === 'paid');

    return containers.map((container) => {
      // Sales inflow mapped to container
      let salesInflow = 0;
      if (container === 'shift_drawer') {
        salesInflow = paidOrders
          .filter((o) => o.paymentMethod === 'cash')
          .reduce((s, o) => s + o.totalAmount, 0);
      } else if (container === 'bank_account') {
        salesInflow = paidOrders
          .filter((o) => o.paymentMethod === 'visa')
          .reduce((s, o) => s + o.totalAmount, 0);
      } else if (container === 'ewallet_instapay') {
        salesInflow = paidOrders
          .filter(
            (o) =>
              o.paymentMethod === 'instapay' || o.paymentMethod === 'ewallet'
          )
          .reduce((s, o) => s + o.totalAmount, 0);
      }

      const containerVouchers = validVouchers.filter(
        (v) => (v.financialContainer || 'shift_drawer') === container
      );

      const voucherReceipts = containerVouchers
        .filter(
          (v) =>
            v.type === 'receipt' ||
            v.type === 'customer_collection' ||
            v.type === 'partner_deposit' ||
            v.type === 'staff_custody_settlement'
        )
        .reduce((s, v) => s + v.amount, 0);

      const voucherOutflows = containerVouchers
        .filter(
          (v) =>
            v.type === 'expense' ||
            v.type === 'supplier_payment' ||
            v.type === 'staff_advance' ||
            v.type === 'partner_drawing' ||
            v.type === 'payroll_payment'
        )
        .reduce((s, v) => s + v.amount, 0);

      const openingCustody =
        container === 'shift_drawer'
          ? shifts
              .filter((sh) => sh.date >= startDate && sh.date <= endDate)
              .reduce((s, sh) => s + sh.openingCustody, 0)
          : 0;

      const totalInflow = openingCustody + salesInflow + voucherReceipts;
      const netCash = totalInflow - voucherOutflows;

      return {
        container,
        label: getFinancialContainerLabel(container),
        openingCustody,
        salesInflow,
        voucherReceipts,
        totalInflow,
        voucherOutflows,
        netCash,
      };
    });
  }, [validOrders, validVouchers, shifts, startDate, endDate]);

  // 4. Item Profitability & Menu Engineering Matrix
  const itemProfitabilityList = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        qtySold: number;
        totalRevenue: number;
        totalCost: number;
        grossProfit: number;
      }
    >();

    for (const order of validOrders) {
      for (const line of order.lines) {
        const existing = map.get(line.menuItemId) || {
          id: line.menuItemId,
          code: line.code,
          name: line.menuItemName,
          qtySold: 0,
          totalRevenue: 0,
          totalCost: 0,
          grossProfit: 0,
        };
        existing.qtySold += line.qty;
        existing.totalRevenue += line.totalPrice;
        existing.totalCost += line.totalTheoreticalCost;
        existing.grossProfit += line.totalPrice - line.totalTheoreticalCost;
        map.set(line.menuItemId, existing);
      }
    }

    const list = Array.from(map.values());
    const avgQty =
      list.length > 0
        ? list.reduce((s, i) => s + i.qtySold, 0) / list.length
        : 0;
    const avgProfitPerUnit =
      list.length > 0
        ? list.reduce(
            (s, i) => s + (i.qtySold > 0 ? i.grossProfit / i.qtySold : 0),
            0
          ) / list.length
        : 0;

    return list
      .map((item) => {
        const marginPercent =
          item.totalRevenue > 0
            ? (item.grossProfit / item.totalRevenue) * 100
            : 0;
        const unitProfit =
          item.qtySold > 0 ? item.grossProfit / item.qtySold : 0;
        const highVolume = item.qtySold >= avgQty;
        const highMargin = unitProfit >= avgProfitPerUnit;

        let classification: {
          code: 'star' | 'plowhorse' | 'puzzle' | 'dog';
          label: string;
          badgeClass: string;
        };

        if (highVolume && highMargin) {
          classification = {
            code: 'star',
            label: 'نجم المنيو (Star) — مبيعات وربحية عالية',
            badgeClass:
              'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          };
        } else if (highVolume && !highMargin) {
          classification = {
            code: 'plowhorse',
            label: 'حصان العمل (Plowhorse) — سحب عالي وهامش منخفض',
            badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
          };
        } else if (!highVolume && highMargin) {
          classification = {
            code: 'puzzle',
            label: 'لغز ربحي (Puzzle) — ربحية عالية يحتاج ترويج',
            badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          };
        } else {
          classification = {
            code: 'dog',
            label: 'ضعيف الأداء (Dog) — مبيعات وربحية منخفضة',
            badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          };
        }

        return {
          ...item,
          marginPercent,
          classification,
        };
      })
      .sort((a, b) => b.grossProfit - a.grossProfit);
  }, [validOrders]);

  return (
    <div className="space-y-4">
      {/* Top Filter & Period Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              مركز التقارير المالية والمحاسبية المتقدمة (P&L · COGS · Cash Flow)
            </h3>
            <p className="text-xs text-slate-400">
              تحليل لحظي لصافي الربح والخسارة وتكلفة البضاعة المباعة والتدفقات النقدية وهندسة المنيو.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`py-1.5 px-2.5 rounded-lg font-bold cursor-pointer ${
                presetPeriod === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              كل الفترات
            </button>
            <button
              type="button"
              onClick={() => applyPreset('month')}
              className={`py-1.5 px-2.5 rounded-lg font-bold cursor-pointer ${
                presetPeriod === 'month'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className={`py-1.5 px-2.5 rounded-lg font-bold cursor-pointer ${
                presetPeriod === 'today'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              اليوم
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPresetPeriod('custom');
              }}
              className="bg-transparent text-white font-mono text-xs focus:outline-hidden"
            />
            <span className="text-slate-500">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPresetPeriod('custom');
              }}
              className="bg-transparent text-white font-mono text-xs focus:outline-hidden"
            />
          </div>

          <button
            type="button"
            onClick={() => StorageService.exportToExcel()}
            className="flex items-center gap-1.5 py-2 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>تصدير Excel الشامل</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>صافي إيرادات المبيعات</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-white">
            {formatCurrency(pnlMetrics.netSalesRevenue, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            عدد الفواتير المعتمدة: {validOrders.length} فاتورة
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>تكلفة البضاعة المباعة والهالك (COGS)</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-amber-400">
            {formatCurrency(pnlMetrics.totalDirectCOGS, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            نسبة التكلفة من المبيعات:{' '}
            {pnlMetrics.netSalesRevenue > 0
              ? (
                  (pnlMetrics.totalDirectCOGS / pnlMetrics.netSalesRevenue) *
                  100
                ).toFixed(1)
              : '0.0'}
            %
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>مجمل الربح (Gross Profit)</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-sky-400">
            {formatCurrency(pnlMetrics.grossProfit, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            هامش مجمل الربح: {pnlMetrics.grossMarginPercent.toFixed(1)}%
          </div>
        </div>

        <div
          className={`bg-slate-950 border rounded-2xl p-4 ${
            pnlMetrics.netOperatingProfit >= 0
              ? 'border-emerald-500/30'
              : 'border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>صافي الربح التشغيلي (Net P&L)</span>
            {pnlMetrics.netOperatingProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-lg font-black font-mono tabular-nums ${
              pnlMetrics.netOperatingProfit >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {formatCurrency(pnlMetrics.netOperatingProfit, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            هامش صافي الربح النهائي: {pnlMetrics.netMarginPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setReportTab('pnl')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'pnl'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>1. قائمة الدخل الشاملة (P&L)</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('cogs_variance')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'cogs_variance'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>2. تكلفة البضاعة المباعة والانحراف (COGS)</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('cash_flow')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'cash_flow'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>3. التدفقات النقدية للأوعية الأربعة</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('menu_engineering')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'menu_engineering'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>4. ربحية الأصناف وهندسة المنيو والهالك</span>
        </button>
      </div>

      {/* REPORT 1: INCOME STATEMENT (P&L) */}
      {reportTab === 'pnl' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-black text-white">
              قائمة الدخل الشاملة (الأرباح والخسائر P&L Statement)
            </h4>
            <span className="text-xs font-mono text-slate-400">
              الفترة: {startDate} → {endDate}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-300 font-semibold">
                إجمالي مبيعات الأصناف والوجبات (قبل الخصم)
              </span>
              <span className="font-mono tabular-nums font-bold text-white">
                {formatCurrency(pnlMetrics.grossMenuSales, currency)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-rose-300">
              <span>(-) خصومات الكوبونات والعروض الترويجية</span>
              <span className="font-mono tabular-nums font-bold">
                ({formatCurrency(pnlMetrics.totalDiscounts, currency)})
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-sky-300">
              <span>(+) إيرادات خدمة التوصيل (Delivery Fees)</span>
              <span className="font-mono tabular-nums font-bold">
                {formatCurrency(pnlMetrics.totalDeliveryFees, currency)}
              </span>
            </div>

            {pnlMetrics.reversedSalesAmount > 0 && (
              <div className="py-2.5 flex items-center justify-between text-slate-400">
                <span>
                  [معلومة رقابية] فواتير ملغاة ومعكوسة بقيود عكسية (مستبعدة من الصافي)
                </span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(pnlMetrics.reversedSalesAmount, currency)}
                </span>
              </div>
            )}

            <div className="py-3 px-3 bg-slate-900/90 rounded-xl flex items-center justify-between font-black text-sm text-white my-1">
              <span>= صافي إيرادات المبيعات المعتمدة (Net Sales)</span>
              <span className="font-mono tabular-nums text-emerald-400">
                {formatCurrency(pnlMetrics.netSalesRevenue, currency)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-amber-300">
              <span>
                (-) تكلفة البضاعة المباعة المعيارية حسب الوصفات (Theoretical COGS)
              </span>
              <span className="font-mono tabular-nums font-bold">
                ({formatCurrency(pnlMetrics.theoreticalCOGS, currency)})
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-rose-300">
              <span>(-) تكلفة الهالك والتالف المسجل بالمخزن (Waste Loss)</span>
              <span className="font-mono tabular-nums font-bold">
                ({formatCurrency(pnlMetrics.wasteLossMinor, currency)})
              </span>
            </div>

            <div className="py-3 px-3 bg-slate-900/90 rounded-xl flex items-center justify-between font-black text-sm text-sky-300 my-1">
              <span>
                = مجمل الربح التشغيلي (Gross Profit —{' '}
                {pnlMetrics.grossMarginPercent.toFixed(1)}%)
              </span>
              <span className="font-mono tabular-nums">
                {formatCurrency(pnlMetrics.grossProfit, currency)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-slate-300">
              <span>
                (-) مصروفات الأجور والرواتب والسلف والعمولات (HR & Payroll)
              </span>
              <span className="font-mono tabular-nums font-bold text-rose-300">
                ({formatCurrency(pnlMetrics.payrollAndStaffExpenses, currency)})
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between text-slate-300">
              <span>
                (-) مصروفات التشغيل والمرافق والكهرباء والصيانة العامة
              </span>
              <span className="font-mono tabular-nums font-bold text-rose-300">
                (
                {formatCurrency(
                  pnlMetrics.utilitiesAndGeneralExpenses,
                  currency
                )}
                )
              </span>
            </div>

            <div
              className={`py-3.5 px-4 rounded-xl flex items-center justify-between font-black text-base mt-2 border ${
                pnlMetrics.netOperatingProfit >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <span>
                = صافي الربح / (الخسارة) التشغيلي النهائي (
                {pnlMetrics.netMarginPercent.toFixed(1)}%)
              </span>
              <span className="font-mono tabular-nums">
                {formatCurrency(pnlMetrics.netOperatingProfit, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: COGS & VARIANCE ANALYSIS */}
      {reportTab === 'cogs_variance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">
                التكلفة المعيارية للأصناف المباعة (حسب الريسبي)
              </span>
              <span className="text-lg font-black font-mono tabular-nums text-white">
                {formatCurrency(pnlMetrics.theoreticalCOGS, currency)}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">
                ما كان يجب استهلاكه نظرياً لإنتاج الوجبات المباعة
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">
                إجمالي مشتريات الخامات المباشرة والآجلة + الهالك
              </span>
              <span className="text-lg font-black font-mono tabular-nums text-amber-400">
                {formatCurrency(
                  pnlMetrics.directKitchenPurchasesVouchers +
                    pnlMetrics.creditPurchasesVouchers +
                    pnlMetrics.wasteLossMinor,
                  currency
                )}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">
                مشتريات نقدية ({formatCurrency(pnlMetrics.directKitchenPurchasesVouchers, currency)}) + آجلة ({formatCurrency(pnlMetrics.creditPurchasesVouchers, currency)}) + هالك ({formatCurrency(pnlMetrics.wasteLossMinor, currency)})
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">
                القيمة المالية لرصيد المخزن الحالي (Inventory Valuation)
              </span>
              <span className="text-lg font-black font-mono tabular-nums text-emerald-400">
                {formatCurrency(inventoryValuationMinor, currency)}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">
                إجمالي قيمة {inventory.length} صنف خام متوفر حالياً بالمخزن
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-black text-white">
                بيان تقييم المخزون الحالي وتكلفة الوحدة
              </h4>
              <span className="text-xs text-slate-400">
                مرتب حسب الأعلى قيمة مالية بالمخزن
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">الكود</th>
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-3">القسم</th>
                    <th className="py-2.5 px-3">الرصيد الحالي</th>
                    <th className="py-2.5 px-3">تكلفة الوحدة</th>
                    <th className="py-2.5 px-3">إجمالي القيمة بالمخزن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {[...inventory]
                    .sort(
                      (a, b) =>
                        b.currentStock * b.unitCost -
                        a.currentStock * a.unitCost
                    )
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono text-amber-400 font-bold">
                          {item.code}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-white">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                          {formatCurrency(item.unitCost, currency)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-emerald-400">
                          {formatCurrency(
                            Math.round(item.currentStock * item.unitCost),
                            currency
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: CASH FLOW ACROSS 4 CONTAINERS */}
      {reportTab === 'cash_flow' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cashFlowByContainer.map((cf) => (
              <div
                key={cf.container}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <h5 className="text-sm font-black text-white">{cf.label}</h5>
                  </div>
                  <span
                    className={`text-sm font-black font-mono tabular-nums px-2.5 py-0.5 rounded-lg border ${
                      cf.netCash >= 0
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    الصافي: {formatCurrency(cf.netCash, currency)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {cf.container === 'shift_drawer' && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>عهدة افتتاح الورديات</span>
                      <span className="font-mono tabular-nums text-white">
                        {formatCurrency(cf.openingCustody, currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-emerald-300">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>مبيعات محصلة مباشرة على الوعاء</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold">
                      +{formatCurrency(cf.salesInflow, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sky-300">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>سندات قبض وتحصيلات عملاء وإيداعات</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold">
                      +{formatCurrency(cf.voucherReceipts, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-rose-300">
                    <span className="flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>سندات صرف ومصروفات ورواتب وموردين</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold">
                      -{formatCurrency(cf.voucherOutflows, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORT 4: MENU ENGINEERING & ITEM PROFITABILITY + WASTE */}
      {reportTab === 'menu_engineering' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-white">
                  مصفوفة هندسة المنيو وربحية الأصناف (Menu Engineering Matrix)
                </h4>
                <p className="text-[11px] text-slate-400">
                  تصنيف آلي للأصناف إلى (نجوم المنيو Stars · أحصنة العمل Plowhorses · الألغاز المربحة Puzzles · الأصناف الضعيفة Dogs)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">الكود</th>
                    <th className="py-3 px-3">الصنف / الوجبة</th>
                    <th className="py-3 px-3">الكمية المباعة</th>
                    <th className="py-3 px-3">إجمالي الإيراد</th>
                    <th className="py-3 px-3">إجمالي التكلفة</th>
                    <th className="py-3 px-3">مجمل الربح</th>
                    <th className="py-3 px-3">هامش الربح %</th>
                    <th className="py-3 px-3">تصنيف هندسة المنيو</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {itemProfitabilityList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        لا توجد مبيعات مسجلة في هذه الفترة لتحليل ربحية الأصناف
                      </td>
                    </tr>
                  ) : (
                    itemProfitabilityList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {item.code}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums font-bold text-white">
                          {item.qtySold}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                          {formatCurrency(item.totalRevenue, currency)}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-amber-300">
                          {formatCurrency(item.totalCost, currency)}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums font-bold text-emerald-400">
                          {formatCurrency(item.grossProfit, currency)}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums font-bold text-sky-300">
                          {item.marginPercent.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${item.classification.badgeClass}`}
                          >
                            {item.classification.label}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Waste Log Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-black text-white">
                سجل الهالك والتالف المسجل خلال الفترة ({periodWaste.length})
              </h4>
              <span className="text-xs font-mono font-bold text-rose-400">
                إجمالي خسائر الهالك:{' '}
                {formatCurrency(pnlMetrics.wasteLossMinor, currency)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-3">الكمية المهدرة</th>
                    <th className="py-2.5 px-3">قيمة الخسارة</th>
                    <th className="py-2.5 px-3">السبب</th>
                    <th className="py-2.5 px-3">المسجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {periodWaste.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        لا توجد سجلات هالك خلال هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    periodWaste.map((w) => (
                      <tr key={w.id}>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                          {w.date}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {w.itemName}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-amber-300">
                          {w.qty} {w.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-rose-400">
                          {formatCurrency(w.totalLoss, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{w.reason}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {w.recordedBy}
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
    </div>
  );
};
