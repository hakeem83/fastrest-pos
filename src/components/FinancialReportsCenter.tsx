import React, { useMemo, useState } from 'react';
import {
  Customer,
  DeliveryDriver,
  ExtendedFinancialContainerType,
  FinancialContainerType,
  InventoryItem,
  MenuItem,
  Partner,
  Promotion,
  Shift,
  Supplier,
} from '../types';
import {
  formatCurrency,
  getExtendedFinancialContainerLabel,
  getFinancialContainerLabel,
  getPartyTypeLabel,
  getPaymentMethodLabel,
  getTodayDateString,
  getVoucherTypeLabel,
  StorageService,
} from '../services/storage';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChefHat,
  Clock,
  Coins,
  DollarSign,
  FileSpreadsheet,
  Flame,
  HelpCircle,
  Hourglass,
  Info,
  Landmark,
  Layers,
  MessageCircle,
  Package,
  PieChart,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Zap,
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
  menuItems,
  shifts,
}) => {
  const [reportTab, setReportTab] = useState<
    | 'pnl'
    | 'cogs_variance'
    | 'cash_flow'
    | 'liquid_ledger'
    | 'parties_aging_ledger'
    | 'menu_engineering'
    | 'business_insights'
    | 'dead_stock_velocity'
  >('pnl');

  const today = getTodayDateString();
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>(today);
  const [presetPeriod, setPresetPeriod] = useState<
    'all' | 'today' | 'month' | 'custom'
  >('all');

  // Sub-tab state for Liquid Accounts Ledger
  const [selectedContainer, setSelectedContainer] = useState<
    ExtendedFinancialContainerType | 'all'
  >('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Sub-tab state for Parties Ledger
  const [partyTypeTab, setPartyTypeTab] = useState<'customers' | 'suppliers'>(
    'customers'
  );
  const [partiesSearch, setPartiesSearch] = useState<string>('');
  const [partiesFilter, setPartiesFilter] = useState<
    'all' | 'debt_only' | 'over_limit'
  >('all');

  // Toast / feedback message
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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

  const showNotification = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4500);
  };

  const allOrders = StorageService.getSaleOrders();
  const allVouchers = StorageService.getVouchers();
  const allWaste = StorageService.getWasteLogs();
  const allCustomers = StorageService.getCustomers();
  const allSuppliers = StorageService.getSuppliers();
  const allPartners = StorageService.getPartners();
  const allDrivers = StorageService.getDeliveryDrivers();

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

  // 4. Extended Liquid Accounts Balances & Comprehensive Ledger Journal
  const liquidAccountsSummary = useMemo(() => {
    // Current live balances across all 6 financial containers
    const activeShift = StorageService.getActiveShift();
    const allHistoricalOrders = StorageService.getSaleOrders().filter(
      (o) => !o.isReversed && o.orderStatus !== 'cancelled' && o.paymentStatus === 'paid'
    );
    const allHistoricalVouchers = StorageService.getVouchers().filter(
      (v) => !v.isReversed && !v.reversesVoucherId
    );

    // 1. Shift Drawer
    const drawerSales = allHistoricalOrders
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((s, o) => s + o.totalAmount, 0);
    const drawerReceipts = allHistoricalVouchers
      .filter(
        (v) =>
          (v.financialContainer === 'shift_drawer' || !v.financialContainer) &&
          (v.type === 'receipt' || v.type === 'customer_collection')
      )
      .reduce((s, v) => s + v.amount, 0);
    const drawerExpenses = allHistoricalVouchers
      .filter(
        (v) =>
          (v.financialContainer === 'shift_drawer' || !v.financialContainer) &&
          (v.type === 'expense' || v.type === 'supplier_payment' || v.type === 'staff_advance')
      )
      .reduce((s, v) => s + v.amount, 0);
    const drawerBalance =
      (activeShift ? activeShift.openingCustody : 0) +
      drawerSales +
      drawerReceipts -
      drawerExpenses;

    // 2. Main Safe
    const safeReceipts = allHistoricalVouchers
      .filter(
        (v) =>
          v.financialContainer === 'main_safe' &&
          (v.type === 'receipt' ||
            v.type === 'partner_deposit' ||
            v.type === 'customer_collection' ||
            v.type === 'staff_custody_settlement')
      )
      .reduce((s, v) => s + v.amount, 0);
    const safeExpenses = allHistoricalVouchers
      .filter(
        (v) =>
          v.financialContainer === 'main_safe' &&
          (v.type === 'expense' ||
            v.type === 'supplier_payment' ||
            v.type === 'partner_drawing' ||
            v.type === 'payroll_payment' ||
            v.type === 'staff_advance')
      )
      .reduce((s, v) => s + v.amount, 0);
    const safeBalance = Math.max(0, safeReceipts - safeExpenses);

    // 3. Bank / Visa
    const bankVisaSales = allHistoricalOrders
      .filter((o) => o.paymentMethod === 'visa')
      .reduce((s, o) => s + o.totalAmount, 0);
    const bankReceipts = allHistoricalVouchers
      .filter(
        (v) =>
          v.financialContainer === 'bank_account' &&
          (v.type === 'receipt' || v.type === 'partner_deposit')
      )
      .reduce((s, v) => s + v.amount, 0);
    const bankExpenses = allHistoricalVouchers
      .filter(
        (v) =>
          v.financialContainer === 'bank_account' &&
          (v.type === 'expense' || v.type === 'supplier_payment' || v.type === 'payroll_payment')
      )
      .reduce((s, v) => s + v.amount, 0);
    const bankBalance = bankVisaSales + bankReceipts - bankExpenses;

    // 4. E-Wallets / InstaPay
    const walletSales = allHistoricalOrders
      .filter((o) => o.paymentMethod === 'instapay' || o.paymentMethod === 'ewallet')
      .reduce((s, o) => s + o.totalAmount, 0);
    const walletReceipts = allHistoricalVouchers
      .filter(
        (v) =>
          v.financialContainer === 'ewallet_instapay' &&
          (v.type === 'receipt' || v.type === 'customer_collection')
      )
      .reduce((s, v) => s + v.amount, 0);
    const walletExpenses = allHistoricalVouchers
      .filter(
        (v) =>
          v.financialContainer === 'ewallet_instapay' &&
          (v.type === 'expense' || v.type === 'supplier_payment')
      )
      .reduce((s, v) => s + v.amount, 0);
    const walletBalance = walletSales + walletReceipts - walletExpenses;

    // 5. Driver Custody (Sum of all active drivers custody)
    const driverCustodyTotal = allDrivers.reduce(
      (s, d) => s + (d.cashInCustodyMinor || 0),
      0
    );

    // 6. Partners Current Accounts
    const partnersBalanceTotal = allPartners.reduce(
      (s, p) => s + (p.currentBalance || p.capitalAmount || 0),
      0
    );

    const totalLiquidAssets =
      Math.max(0, drawerBalance) +
      safeBalance +
      Math.max(0, bankBalance) +
      Math.max(0, walletBalance) +
      driverCustodyTotal;

    return {
      drawerBalance: Math.max(0, drawerBalance),
      safeBalance,
      bankBalance: Math.max(0, bankBalance),
      walletBalance: Math.max(0, walletBalance),
      driverCustodyTotal,
      partnersBalanceTotal,
      totalLiquidAssets,
    };
  }, [allDrivers, allPartners]);

  // Liquid Ledger Journal Entries (Chronological list of all financial inflows & outflows)
  const liquidJournalEntries = useMemo(() => {
    type LedgerRow = {
      id: string;
      date: string;
      time: string;
      container: ExtendedFinancialContainerType;
      containerLabel: string;
      refType: 'sale' | 'voucher' | 'driver_turnover';
      refNumber: string;
      partyName: string;
      description: string;
      inflowMinor: number;
      outflowMinor: number;
      paymentMethod?: string;
    };

    const rows: LedgerRow[] = [];

    // Add valid sales to journal
    validOrders.forEach((o) => {
      let cont: ExtendedFinancialContainerType = 'shift_drawer';
      if (o.paymentMethod === 'visa') cont = 'bank_account';
      else if (o.paymentMethod === 'instapay' || o.paymentMethod === 'ewallet')
        cont = 'ewallet_instapay';
      else if (o.orderType === 'delivery' && o.deliveryDriverId)
        cont = 'driver_custody';

      rows.push({
        id: `ord-${o.id}`,
        date: o.date,
        time: o.time,
        container: cont,
        containerLabel: getExtendedFinancialContainerLabel(cont),
        refType: 'sale',
        refNumber: o.orderNumber,
        partyName: o.customerName || (o.orderType === 'dine_in' ? `طاولة ${o.tableNumber}` : 'عميل نقدي'),
        description: `فاتورة بيع (${o.lines.map((l) => l.menuItemName).slice(0, 2).join('، ')}${o.lines.length > 2 ? '...' : ''})`,
        inflowMinor: o.totalAmount,
        outflowMinor: 0,
        paymentMethod: getPaymentMethodLabel(o.paymentMethod),
      });
    });

    // Add vouchers to journal
    validVouchers.forEach((v) => {
      const cont = (v.financialContainer as ExtendedFinancialContainerType) || 'shift_drawer';
      const isInflow =
        v.type === 'receipt' ||
        v.type === 'customer_collection' ||
        v.type === 'partner_deposit' ||
        v.type === 'staff_custody_settlement';

      rows.push({
        id: `vch-${v.id}`,
        date: v.date,
        time: v.time,
        container: cont,
        containerLabel: getExtendedFinancialContainerLabel(cont),
        refType: 'voucher',
        refNumber: v.voucherNumber,
        partyName: v.recipient || v.accountName,
        description: `${getVoucherTypeLabel(v.type)} — ${v.description || v.accountName}`,
        inflowMinor: isInflow ? v.amount : 0,
        outflowMinor: isInflow ? 0 : v.amount,
      });
    });

    // Sort descending by date & time
    const sorted = rows.sort((a, b) => {
      const dtA = `${a.date} ${a.time}`;
      const dtB = `${b.date} ${b.time}`;
      return dtB.localeCompare(dtA);
    });

    // Filter by container & search
    return sorted.filter((r) => {
      const matchesContainer =
        selectedContainer === 'all' || r.container === selectedContainer;
      const matchesSearch =
        !ledgerSearch.trim() ||
        r.refNumber.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        r.partyName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        r.description.toLowerCase().includes(ledgerSearch.toLowerCase());
      return matchesContainer && matchesSearch;
    });
  }, [validOrders, validVouchers, selectedContainer, ledgerSearch]);

  // 5. Parties Ledgers & Aging Analysis (Customers & Suppliers)
  const customerAgingAnalysis = useMemo(() => {
    const now = new Date();

    return allCustomers.map((cust) => {
      // Find orders for this customer
      const custOrders = allOrders.filter(
        (o) =>
          o.customerId === cust.id &&
          !o.isReversed &&
          o.orderStatus !== 'cancelled'
      );
      const totalSalesMinor = custOrders.reduce((s, o) => s + o.totalAmount, 0);

      // Collections
      const custCollections = allVouchers
        .filter(
          (v) =>
            v.customerId === cust.id &&
            v.type === 'customer_collection' &&
            !v.isReversed
        )
        .reduce((s, v) => s + v.amount, 0);

      // Calculate debt aging brackets based on unpaid orders
      let under30Days = 0;
      let from30To60Days = 0;
      let over60Days = 0;

      const creditOrders = custOrders.filter((o) => o.paymentMethod === 'credit');
      creditOrders.forEach((o) => {
        const orderDate = new Date(o.date);
        const diffDays = Math.floor(
          (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24)
        );
        if (diffDays <= 30) {
          under30Days += o.totalAmount;
        } else if (diffDays <= 60) {
          from30To60Days += o.totalAmount;
        } else {
          over60Days += o.totalAmount;
        }
      });

      const currentDebt = cust.currentDebt || 0;
      const isOverLimit = cust.creditLimit > 0 && currentDebt > cust.creditLimit;
      const creditUtilizationPercent =
        cust.creditLimit > 0 ? (currentDebt / cust.creditLimit) * 100 : 0;

      return {
        customer: cust,
        totalSalesMinor,
        custCollections,
        currentDebt,
        under30Days,
        from30To60Days,
        over60Days,
        isOverLimit,
        creditUtilizationPercent,
        orderCount: custOrders.length,
      };
    });
  }, [allCustomers, allOrders, allVouchers]);

  const filteredCustomerAging = useMemo(() => {
    return customerAgingAnalysis.filter((item) => {
      const matchesSearch =
        !partiesSearch.trim() ||
        item.customer.name.toLowerCase().includes(partiesSearch.toLowerCase()) ||
        item.customer.phone.includes(partiesSearch) ||
        item.customer.code.toLowerCase().includes(partiesSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (partiesFilter === 'debt_only') return item.currentDebt > 0;
      if (partiesFilter === 'over_limit') return item.isOverLimit;
      return true;
    });
  }, [customerAgingAnalysis, partiesSearch, partiesFilter]);

  const supplierAgingAnalysis = useMemo(() => {
    return allSuppliers.map((sup) => {
      const supVouchers = allVouchers.filter(
        (v) =>
          (v.supplierId === sup.id || v.recipient === sup.name) &&
          !v.isReversed &&
          !v.reversesVoucherId
      );

      const purchasesMinor = supVouchers
        .filter((v) => v.type === 'credit_purchase' || (v.type === 'expense' && v.accountCode === 'EXP-101'))
        .reduce((s, v) => s + v.amount, 0);

      const paymentsMinor = supVouchers
        .filter((v) => v.type === 'supplier_payment')
        .reduce((s, v) => s + v.amount, 0);

      return {
        supplier: sup,
        creditBalance: sup.creditBalance || 0,
        purchasesMinor,
        paymentsMinor,
        voucherCount: supVouchers.length,
      };
    });
  }, [allSuppliers, allVouchers]);

  const filteredSupplierAging = useMemo(() => {
    return supplierAgingAnalysis.filter((item) => {
      const matchesSearch =
        !partiesSearch.trim() ||
        item.supplier.name.toLowerCase().includes(partiesSearch.toLowerCase()) ||
        item.supplier.phone.includes(partiesSearch) ||
        item.supplier.supplyCategory.toLowerCase().includes(partiesSearch.toLowerCase());

      if (!matchesSearch) return false;
      if (partiesFilter === 'debt_only') return item.creditBalance > 0;
      return true;
    });
  }, [supplierAgingAnalysis, partiesSearch, partiesFilter]);

  // 6. Item Profitability & Menu Engineering Matrix
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

    const items = Array.from(map.values());
    if (items.length === 0) return [];

    const totalQty = items.reduce((s, i) => s + i.qtySold, 0);
    const avgQty = totalQty / items.length;
    const totalProfit = items.reduce((s, i) => s + i.grossProfit, 0);
    const avgProfit = totalProfit / items.length;

    return items
      .map((item) => {
        const marginPercent =
          item.totalRevenue > 0
            ? (item.grossProfit / item.totalRevenue) * 100
            : 0;
        const highVolume = item.qtySold >= avgQty;
        const highMargin = item.grossProfit >= avgProfit;

        let classification: {
          code: 'star' | 'plowhorse' | 'puzzle' | 'dog';
          label: string;
          badgeClass: string;
        };

        if (highVolume && highMargin) {
          classification = {
            code: 'star',
            label: 'نجم مالي (Star) — مبيعات وربحية ممتازة',
            badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
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

  // 7. Smart Business Insights & Cost Advisory Engine
  const businessInsights = useMemo(() => {
    type InsightCard = {
      id: string;
      category: 'bundle' | 'margin_leak' | 'cost_waste' | 'retention';
      priority: 'high' | 'medium' | 'opportunity';
      title: string;
      description: string;
      potentialGainMinor: number;
      actionType: 'create_promo' | 'adjust_price' | 'contact_customer';
      actionLabel: string;
      payload?: {
        promoTitle?: string;
        promoDiscount?: number;
        promoItemCode?: string;
        suggestedPriceMinor?: number;
        customerPhone?: string;
      };
    };

    const cards: InsightCard[] = [];

    // A. Bundle & Cross-Sell Opportunities (Items frequently bought together in same order)
    const pairCounts = new Map<string, { count: number; nameA: string; nameB: string; idA: string; idB: string }>();
    validOrders.forEach((o) => {
      if (o.lines.length >= 2) {
        for (let i = 0; i < o.lines.length; i++) {
          for (let j = i + 1; j < o.lines.length; j++) {
            const idA = o.lines[i].menuItemId;
            const idB = o.lines[j].menuItemId;
            const key = idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
            const existing = pairCounts.get(key) || {
              count: 0,
              nameA: o.lines[i].menuItemName,
              nameB: o.lines[j].menuItemName,
              idA,
              idB,
            };
            existing.count += 1;
            pairCounts.set(key, existing);
          }
        }
      }
    });

    const topPairs = Array.from(pairCounts.values())
      .filter((p) => p.count >= 2)
      .sort((a, b) => b.count - a.count);

    if (topPairs.length > 0) {
      const topPair = topPairs[0];
      cards.push({
        id: `ins-bundle-${topPair.idA}-${topPair.idB}`,
        category: 'bundle',
        priority: 'opportunity',
        title: `فرصة عرض كومبو ذهبي: دمج «${topPair.nameA}» مع «${topPair.nameB}»`,
        description: `تم شراء هذين الصنفين معاً في ${topPair.count} فاتورة مختلفة! إطلاق باقة موحدة بخصم 10% سيرفع متوسط قيمة السلة ويسرع الطلب بنسبة متوقعة تتجاوز 18%.`,
        potentialGainMinor: 250000, // 2,500 EGP
        actionType: 'create_promo',
        actionLabel: 'إنشاء كود عرض الكومبو فوراً',
        payload: {
          promoTitle: `كومبو التوفير: ${topPair.nameA} + ${topPair.nameB}`,
          promoDiscount: 10,
        },
      });
    }

    // B. Margin Leaks & Underpriced Items
    const underpricedItems = itemProfitabilityList.filter(
      (item) => item.marginPercent < 18 && item.qtySold >= 3
    );
    if (underpricedItems.length > 0) {
      const worstItem = underpricedItems[0];
      const suggestedPriceMinor = Math.round(worstItem.totalCost / worstItem.qtySold * 1.45); // target 45% markup
      const marginDeficit = Math.round(worstItem.qtySold * (suggestedPriceMinor - (worstItem.totalRevenue / worstItem.qtySold)));

      cards.push({
        id: `ins-margin-${worstItem.id}`,
        category: 'margin_leak',
        priority: 'high',
        title: `تسرب أرباح حرج في صنف «${worstItem.name}» (الهامش ${worstItem.marginPercent.toFixed(1)}% فقط)`,
        description: `هذا الصنف يباع بهامش منخفض جداً لا يغطي المصروفات التشغيلية والعمالة. بيع ${worstItem.qtySold} قطعة تسبب في فاقد ربحي قدره ${formatCurrency(marginDeficit, currency)}. يُوصى برفع سعر البيع بنسبة 15-20%.`,
        potentialGainMinor: marginDeficit,
        actionType: 'adjust_price',
        actionLabel: 'تعديل سعر الصنف تلقائياً',
        payload: {
          suggestedPriceMinor,
        },
      });
    }

    // C. Operational Waste Spikes & Expense Rationalization
    if (periodWaste.length > 0) {
      const totalWasteMinor = periodWaste.reduce((s, w) => s + w.totalLoss, 0);
      const topWaste = [...periodWaste].sort((a, b) => b.totalLoss - a.totalLoss)[0];
      cards.push({
        id: `ins-waste-alert`,
        category: 'cost_waste',
        priority: 'high',
        title: `ترشيد الهدر التشغيلي: «${topWaste.itemName}» هو الأعلى خسارة`,
        description: `بلغ إجمالي الخسائر من الهالك ${formatCurrency(totalWasteMinor, currency)} خلال الفترة، ويتصدر الصنف «${topWaste.itemName}» بقيمة فاقد ${formatCurrency(topWaste.totalLoss, currency)} بسبب: (${topWaste.reason}). مراجعة كميات التخزين ستوفر سيولة نقدية مباشرة.`,
        potentialGainMinor: totalWasteMinor,
        actionType: 'adjust_price',
        actionLabel: 'مراجعة معايير التخزين والهدر',
      });
    }

    // D. VIP Customers Churn / Inactivity Alerts
    const now = new Date();
    const inactiveVipCustomers = allCustomers.filter((cust) => {
      const custOrders = allOrders.filter((o) => o.customerId === cust.id && !o.isReversed);
      if (custOrders.length < 3) return false;
      const lastOrder = [...custOrders].sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!lastOrder) return false;
      const diffDays = Math.floor((now.getTime() - new Date(lastOrder.date).getTime()) / (1000 * 3600 * 24));
      return diffDays >= 14;
    });

    if (inactiveVipCustomers.length > 0) {
      const topVip = inactiveVipCustomers[0];
      cards.push({
        id: `ins-vip-churn-${topVip.id}`,
        category: 'retention',
        priority: 'opportunity',
        title: `تنشيط العملاء الدائمين: العميل المميز «${topVip.name}» متغيب منذ أسبوعين`,
        description: `يوجد ${inactiveVipCustomers.length} عملاء دائمين توقفوا عن الشراء خلال الـ 14 يوماً الماضية. إرسال رسالة ترحيبية أو كود خصم خاص عبر واتساب سيعيد تنشيطهم ويمنع تسربهم للمنافسين.`,
        potentialGainMinor: 180000,
        actionType: 'contact_customer',
        actionLabel: 'مراسلة العميل عبر واتساب',
        payload: {
          customerPhone: topVip.phone,
        },
      });
    }

    return cards;
  }, [validOrders, itemProfitabilityList, periodWaste, allCustomers, allOrders, currency]);

  // 8. Dead Stock Radar & Inventory Velocity Analytics
  const deadStockAnalysis = useMemo(() => {
    const now = new Date();

    return inventory.map((item) => {
      // Find orders containing this item
      const itemOrders = allOrders.filter(
        (o) =>
          !o.isReversed &&
          o.orderStatus !== 'cancelled' &&
          o.lines.some((l) => l.menuItemId === item.id || l.code === item.code)
      );

      const sortedItemOrders = [...itemOrders].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      const lastSoldOrder = sortedItemOrders[0];
      const lastSoldDate = lastSoldOrder ? lastSoldOrder.date : item.lastUpdated || '2024-01-01';

      const diffDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(lastSoldDate).getTime()) / (1000 * 3600 * 24))
      );

      const tiedCapitalMinor = Math.round(item.currentStock * item.unitCost);

      let velocityClass: 'fast_a' | 'medium_b' | 'dead_c' = 'fast_a';
      if (diffDays >= 45 || (itemOrders.length === 0 && item.currentStock > 0)) {
        velocityClass = 'dead_c';
      } else if (diffDays >= 15) {
        velocityClass = 'medium_b';
      }

      // Unique customers who bought this item
      const custIds = new Set<string>();
      itemOrders.forEach((o) => {
        if (o.customerId) custIds.add(o.customerId);
      });

      return {
        item,
        lastSoldDate: lastSoldOrder ? lastSoldOrder.date : 'لم يُبع بعد',
        daysIdle: diffDays,
        tiedCapitalMinor,
        velocityClass,
        totalSoldOrdersCount: itemOrders.length,
        associatedCustomersCount: custIds.size,
      };
    });
  }, [inventory, allOrders]);

  const deadStockSummary = useMemo(() => {
    const deadItems = deadStockAnalysis.filter((d) => d.velocityClass === 'dead_c');
    const totalTiedCapitalMinor = deadItems.reduce((s, d) => s + d.tiedCapitalMinor, 0);
    return {
      deadItemsCount: deadItems.length,
      totalTiedCapitalMinor,
      deadItems,
    };
  }, [deadStockAnalysis]);

  // Fast action triggers for Smart Advisory & Dead Stock
  const handleApplyPromoAction = (title?: string, discount = 15) => {
    try {
      const promotions = StorageService.getPromotions();
      const code = `OFFER${Math.floor(100 + Math.random() * 900)}`;
      const newPromo: Promotion = {
        id: `prm-${Date.now()}`,
        code,
        title: title || 'عرض ترويجي ذكي',
        description: 'تم إنشاؤه تلقائياً بواسطة محرك ذكاء الأعمال لتحفيز المبيعات',
        type: 'percentage',
        discountValue: discount,
        minOrderAmount: 5000,
        isActive: true,
        usageCount: 0,
        badge: 'عرض حصري',
      };
      StorageService.savePromotions([newPromo, ...promotions]);
      showNotification(`🎉 تم تفعيل العرض الترويجي (${code}) بنجاح! يمكن للكاشير استخدامه فوراً.`);
    } catch {
      showNotification('حدث خطأ أثناء تفعيل العرض');
    }
  };

  const handleCreateClearancePromo = (item: InventoryItem) => {
    try {
      const promotions = StorageService.getPromotions();
      const code = `CLEAR-${item.code.replace(/[^a-zA-Z0-9]/g, '')}`;
      const newPromo: Promotion = {
        id: `prm-clr-${Date.now()}`,
        code,
        title: `تصفية مخزون: خصم 25% على ${item.name}`,
        description: `عرض تصفية لاسترجاع السيولة النقدية وتفادي الركود لصنف ${item.name}`,
        type: 'percentage',
        discountValue: 25,
        minOrderAmount: 0,
        applicableMenuItemId: item.id,
        isActive: true,
        usageCount: 0,
        badge: 'تصفية سريعة',
      };
      StorageService.savePromotions([newPromo, ...promotions]);
      showNotification(`🏷️ تم إنشاء كود تصفية المخزون (${code}) بنسبة 25% للصنف «${item.name}»!`);
    } catch {
      showNotification('حدث خطأ أثناء إنشاء كود التصفية');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback Notification */}
      {actionFeedback && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-black px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs">{actionFeedback}</span>
        </div>
      )}

      {/* Top Filter & Period Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              منظومة التقارير المالية والتحليل المحاسبي الشامل
            </h3>
            <p className="text-xs text-slate-400">
              قائمة الدخل P&L · تكلفة COGS · التدفقات النقدية للأوعية الستة · كشوف العملاء والموردين · ذكاء الأعمال والمخزون الراكد.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`py-1.5 px-2.5 rounded-lg font-bold cursor-pointer transition-colors ${
                presetPeriod === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              كل الفترات
            </button>
            <button
              type="button"
              onClick={() => applyPreset('month')}
              className={`py-1.5 px-2.5 rounded-lg font-bold cursor-pointer transition-colors ${
                presetPeriod === 'month'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className={`py-1.5 px-2.5 rounded-lg font-bold cursor-pointer transition-colors ${
                presetPeriod === 'today'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              اليوم
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
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
            className="flex items-center gap-1.5 py-2 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>تصدير Excel الشامل</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>صافي المبيعات المحققة</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-white">
            {formatCurrency(pnlMetrics.netSalesRevenue, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            {validOrders.length} فاتورة معتمدة · خصومات {formatCurrency(pnlMetrics.totalDiscounts, currency)}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>تكلفة البضاعة المباعة (COGS)</span>
            <ArrowDownRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-amber-400">
            {formatCurrency(pnlMetrics.totalDirectCOGS, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            المعيارية: {formatCurrency(pnlMetrics.theoreticalCOGS, currency)} · هالك: {formatCurrency(pnlMetrics.wasteLossMinor, currency)}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>إجمالي السيولة النقدية بالأوعية</span>
            <Coins className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-sky-300">
            {formatCurrency(liquidAccountsSummary.totalLiquidAssets, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            درج: {formatCurrency(liquidAccountsSummary.drawerBalance, currency)} · خزينة: {formatCurrency(liquidAccountsSummary.safeBalance, currency)}
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
            هامش صافي الربح: {pnlMetrics.netMarginPercent.toFixed(1)}% من الإيرادات
          </div>
        </div>
      </div>

      {/* 8 Report Selector Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto text-xs font-bold scrollbar-thin">
        <button
          type="button"
          onClick={() => setReportTab('pnl')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'pnl'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>1. قائمة الدخل (P&L)</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('cogs_variance')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'cogs_variance'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>2. تكلفة COGS والانحراف</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('cash_flow')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'cash_flow'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>3. التدفقات النقدية</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('liquid_ledger')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'liquid_ledger'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>4. كشوف حركة الأوعية النقدية والعهد</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('parties_aging_ledger')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'parties_aging_ledger'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>5. كشوف العملاء والموردين وأعمار الديون</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('menu_engineering')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'menu_engineering'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>6. ربحية وهندسة الأصناف</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('business_insights')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'business_insights'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>7. ذكاء الأعمال وترشيد التكاليف ({businessInsights.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('dead_stock_velocity')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            reportTab === 'dead_stock_velocity'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Hourglass className="w-4 h-4 text-rose-400" />
          <span>8. ركود المخزون وسلوك العملاء ({deadStockSummary.deadItemsCount})</span>
        </button>
      </div>

      {/* REPORT 1: INCOME STATEMENT (P&L) */}
      {reportTab === 'pnl' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-base font-black text-white">
                قائمة الدخل وصافي الربح والخسارة الشاملة (Income Statement / P&L)
              </h4>
              <p className="text-xs text-slate-400">
                الفترة من {startDate} إلى {endDate} · عملة القيد: {currency}
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              تاريخ استخراج التقرير: {today}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {/* Sales Revenue Section */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-300">
                <span>1. إجمالي مبيعات الأصناف (Gross Sales)</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(pnlMetrics.grossMenuSales, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pr-4">
                <span>(-) الخصومات والكوبونات الترويجية</span>
                <span className="font-mono tabular-nums text-rose-400">
                  - {formatCurrency(pnlMetrics.totalDiscounts, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pr-4">
                <span>(+) رسوم التوصيل والخدمة المحصلة</span>
                <span className="font-mono tabular-nums text-emerald-400">
                  + {formatCurrency(pnlMetrics.totalDeliveryFees, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between font-black text-white pt-2 border-t border-slate-800">
                <span>صافي إيرادات المبيعات (Net Revenue)</span>
                <span className="font-mono tabular-nums text-emerald-400 text-sm">
                  {formatCurrency(pnlMetrics.netSalesRevenue, currency)}
                </span>
              </div>
            </div>

            {/* COGS Section */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-300">
                <span>2. تكلفة البضاعة المباعة المباشرة (COGS)</span>
                <span className="font-mono tabular-nums text-amber-400">
                  - {formatCurrency(pnlMetrics.totalDirectCOGS, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pr-4">
                <span>تكلفة الخامات المعيارية للفواتير المباعة (Recipe COGS)</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(pnlMetrics.theoreticalCOGS, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pr-4">
                <span>تكلفة الهالك والتالف المسجل بالمخزن (Waste Loss)</span>
                <span className="font-mono tabular-nums text-rose-400">
                  {formatCurrency(pnlMetrics.wasteLossMinor, currency)}
                </span>
              </div>
            </div>

            {/* Gross Profit Subtotal */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between text-white font-black">
              <div>
                <span className="text-sm">مجمل الربح (Gross Profit)</span>
                <span className="text-xs text-amber-300 mr-2 font-mono">
                  (الهامش: {pnlMetrics.grossMarginPercent.toFixed(1)}%)
                </span>
              </div>
              <span className="font-mono tabular-nums text-base text-amber-300">
                {formatCurrency(pnlMetrics.grossProfit, currency)}
              </span>
            </div>

            {/* Operating Expenses Section */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-300">
                <span>3. المصروفات التشغيلية والعمومية (OPEX)</span>
                <span className="font-mono tabular-nums text-rose-400">
                  - {formatCurrency(pnlMetrics.totalOperatingExpenses, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pr-4">
                <span>الرواتب والأجور وسلف الموظفين (Payroll & Advances)</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(pnlMetrics.payrollAndStaffExpenses, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pr-4">
                <span>المرافق، الصيانة، والمصروفات الإدارية العامة</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(pnlMetrics.utilitiesAndGeneralExpenses, currency)}
                </span>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div
              className={`rounded-xl p-4 border flex items-center justify-between font-black ${
                pnlMetrics.netOperatingProfit >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              }`}
            >
              <div>
                <div className="text-base">صافي الربح التشغيلي النهائي (Net Operating Income)</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  نسبة صافي الربح من إجمالي المبيعات:{' '}
                  {pnlMetrics.netMarginPercent.toFixed(1)}%
                </div>
              </div>
              <div className="text-xl font-mono tabular-nums font-black">
                {formatCurrency(pnlMetrics.netOperatingProfit, currency)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: COGS VARIANCE & INVENTORY AUDIT */}
      {reportTab === 'cogs_variance' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-base font-black text-white">
              تقرير تكلفة البضاعة المباعة والهالك وتقييم المخزون (COGS & Waste Audit)
            </h4>
            <p className="text-xs text-slate-400">
              مقارنة التكلفة المعيارية التقديرية بالهالك الفعلي وتقييم رأس المال المخزني الحالي.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-400">إجمالي قيمة المخزون الحالي</div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {formatCurrency(inventoryValuationMinor, currency)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                حسب سعر التكلفة لـ {inventory.length} صنف مسجل
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-400">تكلفة الوجبات المباعة معيارياً</div>
              <div className="text-base font-bold font-mono text-amber-400 mt-1">
                {formatCurrency(pnlMetrics.theoreticalCOGS, currency)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                مبنية على المكونات المسجلة ببطاقات الوصفات
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-400">إجمالي خسائر الهالك والتالف</div>
              <div className="text-base font-bold font-mono text-rose-400 mt-1">
                {formatCurrency(pnlMetrics.wasteLossMinor, currency)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                عدد حركات الهالك المسجلة: {periodWaste.length} حركة
              </div>
            </div>
          </div>

          {/* Waste Logs Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden mt-4">
            <div className="bg-slate-900 px-3 py-2 text-xs font-bold text-white border-b border-slate-800">
              سجل تفاصيل الهالك والتالف خلال الفترة المختارة ({periodWaste.length})
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">التاريخ</th>
                    <th className="py-2 px-3">الصنف</th>
                    <th className="py-2 px-3">الكمية</th>
                    <th className="py-2 px-3">قيمة الخسارة</th>
                    <th className="py-2 px-3">السبب</th>
                    <th className="py-2 px-3">القائم بالقيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {periodWaste.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        لا توجد سجلات هالك مسجلة في هذا النطاق الزمني
                      </td>
                    </tr>
                  ) : (
                    periodWaste.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 font-mono text-slate-300">{w.date}</td>
                        <td className="py-2 px-3 font-bold text-white">{w.itemName}</td>
                        <td className="py-2 px-3 font-mono text-amber-300">
                          {w.qty} {w.unit}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-rose-400">
                          {formatCurrency(w.totalLoss, currency)}
                        </td>
                        <td className="py-2 px-3 text-slate-300">{w.reason}</td>
                        <td className="py-2 px-3 text-slate-400">{w.recordedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: CASH FLOW STATEMENT */}
      {reportTab === 'cash_flow' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-base font-black text-white">
              قائمة التدفقات النقدية للأوعية المالية (Cash Flow Statement)
            </h4>
            <p className="text-xs text-slate-400">
              تتبع المقبوضات والمبيعات ومصروفات السندات وصافي السيولة لكل وعاء مالي.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cashFlowByContainer.map((c) => (
              <div
                key={c.container}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
                  <span>{c.label}</span>
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>الرصيد الافتتاحي:</span>
                    <span className="font-mono text-white">
                      {formatCurrency(c.openingCustody, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>مبيعات الوعاء:</span>
                    <span className="font-mono">
                      + {formatCurrency(c.salesInflow, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>سندات قبض وتحصيل:</span>
                    <span className="font-mono">
                      + {formatCurrency(c.voucherReceipts, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>سندات صرف وموردين:</span>
                    <span className="font-mono">
                      - {formatCurrency(c.voucherOutflows, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-800">
                    <span>صافي حركة النقدية:</span>
                    <span
                      className={`font-mono ${
                        c.netCash >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(c.netCash, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORT 4: LIQUID ACCOUNTS & CASH CUSTODY LEDGER */}
      {reportTab === 'liquid_ledger' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>كشف حركة الأوعية النقدية والسيولة والعهد (Liquid Accounts Ledger)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                سجل القيود المحاسبية اللحظي لكافة الأوعية النقدية: درج الوردية، الخزينة، البنك، المحافظ، عهد الطيارين، وجاري الشركاء.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-900 border border-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-xl font-mono">
                إجمالي الأصول النقدية: {formatCurrency(liquidAccountsSummary.totalLiquidAssets, currency)}
              </span>
            </div>
          </div>

          {/* 6 Containers Balance Cards Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div
              onClick={() => setSelectedContainer('shift_drawer')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedContainer === 'shift_drawer'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-bold">1. درج نقدية الكاشير</div>
              <div className="text-sm font-black font-mono mt-1 text-emerald-400">
                {formatCurrency(liquidAccountsSummary.drawerBalance, currency)}
              </div>
            </div>

            <div
              onClick={() => setSelectedContainer('main_safe')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedContainer === 'main_safe'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-bold">2. الخزينة الرئيسية</div>
              <div className="text-sm font-black font-mono mt-1 text-emerald-400">
                {formatCurrency(liquidAccountsSummary.safeBalance, currency)}
              </div>
            </div>

            <div
              onClick={() => setSelectedContainer('bank_account')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedContainer === 'bank_account'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-bold">3. البنك وفيزا الشبكة</div>
              <div className="text-sm font-black font-mono mt-1 text-sky-400">
                {formatCurrency(liquidAccountsSummary.bankBalance, currency)}
              </div>
            </div>

            <div
              onClick={() => setSelectedContainer('ewallet_instapay')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedContainer === 'ewallet_instapay'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-bold">4. محافظ وإنستاباي</div>
              <div className="text-sm font-black font-mono mt-1 text-purple-400">
                {formatCurrency(liquidAccountsSummary.walletBalance, currency)}
              </div>
            </div>

            <div
              onClick={() => setSelectedContainer('driver_custody')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedContainer === 'driver_custody'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-bold">5. عهد كباتن الدليفري</div>
              <div className="text-sm font-black font-mono mt-1 text-amber-400">
                {formatCurrency(liquidAccountsSummary.driverCustodyTotal, currency)}
              </div>
            </div>

            <div
              onClick={() => setSelectedContainer('partner_equity')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedContainer === 'partner_equity'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-bold">6. جاري الشركاء</div>
              <div className="text-sm font-black font-mono mt-1 text-slate-200">
                {formatCurrency(liquidAccountsSummary.partnersBalanceTotal, currency)}
              </div>
            </div>
          </div>

          {/* Ledger Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setSelectedContainer('all')}
                className={`py-1.5 px-3 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
                  selectedContainer === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                كافة الأوعية
              </button>
              <button
                type="button"
                onClick={() => setSelectedContainer('shift_drawer')}
                className={`py-1.5 px-3 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
                  selectedContainer === 'shift_drawer'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                الدرج
              </button>
              <button
                type="button"
                onClick={() => setSelectedContainer('main_safe')}
                className={`py-1.5 px-3 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
                  selectedContainer === 'main_safe'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                الخزينة
              </button>
              <button
                type="button"
                onClick={() => setSelectedContainer('bank_account')}
                className={`py-1.5 px-3 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
                  selectedContainer === 'bank_account'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                البنك
              </button>
              <button
                type="button"
                onClick={() => setSelectedContainer('ewallet_instapay')}
                className={`py-1.5 px-3 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
                  selectedContainer === 'ewallet_instapay'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                المحافظ
              </button>
              <button
                type="button"
                onClick={() => setSelectedContainer('driver_custody')}
                className={`py-1.5 px-3 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
                  selectedContainer === 'driver_custody'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                عهد الطيارين
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="بحث برقم القيد أو الوصف..."
                className="bg-transparent text-white w-full focus:outline-hidden"
              />
            </div>
          </div>

          {/* Ledger Transactions Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">رقم العملية</th>
                    <th className="py-2.5 px-3">الوعاء المالي</th>
                    <th className="py-2.5 px-3">الطرف / العميل</th>
                    <th className="py-2.5 px-3">البيان والشرح</th>
                    <th className="py-2.5 px-3 text-emerald-400 font-bold">وارد (مدين +)</th>
                    <th className="py-2.5 px-3 text-rose-400 font-bold">صادر (دائن -)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {liquidJournalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        لا توجد حركات مالية مسجلة مطابقة للفلاتر المحددة
                      </td>
                    </tr>
                  ) : (
                    liquidJournalEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {row.date} {row.time}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-400">
                          {row.refNumber}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-300">
                            {row.containerLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-white max-w-[150px] truncate">
                          {row.partyName}
                        </td>
                        <td className="py-2 px-3 text-slate-300 max-w-[220px] truncate">
                          {row.description}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                          {row.inflowMinor > 0 ? `+ ${formatCurrency(row.inflowMinor, currency)}` : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-rose-400">
                          {row.outflowMinor > 0 ? `- ${formatCurrency(row.outflowMinor, currency)}` : '—'}
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

      {/* REPORT 5: PARTIES LEDGERS & DEBT AGING (CUSTOMERS & SUPPLIERS) */}
      {reportTab === 'parties_aging_ledger' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>كشوف الذمم وأعمار الديون (Customer & Supplier Ledgers & Aging)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                متابعة مديونيات العملاء الآجلة، أعمار الديون (&lt; 30 يوم، 30-60، &gt; 60)، وحدود الائتمان، وأرصدة الموردين.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPartyTypeTab('customers')}
                  className={`py-1.5 px-3 rounded-lg font-bold cursor-pointer ${
                    partyTypeTab === 'customers'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  كشف العملاء ({allCustomers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPartyTypeTab('suppliers')}
                  className={`py-1.5 px-3 rounded-lg font-bold cursor-pointer ${
                    partyTypeTab === 'suppliers'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  كشف الموردين ({allSuppliers.length})
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setPartiesFilter('all')}
                className={`py-1 px-2.5 rounded-lg font-bold cursor-pointer ${
                  partiesFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setPartiesFilter('debt_only')}
                className={`py-1 px-2.5 rounded-lg font-bold cursor-pointer ${
                  partiesFilter === 'debt_only'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                أرصدة قائمة فقط
              </button>
              {partyTypeTab === 'customers' && (
                <button
                  type="button"
                  onClick={() => setPartiesFilter('over_limit')}
                  className={`py-1 px-2.5 rounded-lg font-bold cursor-pointer ${
                    partiesFilter === 'over_limit'
                      ? 'bg-rose-500 text-white font-black'
                      : 'text-rose-400 hover:text-white'
                  }`}
                >
                  تجاوز الحد الائتماني ⚠️
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={partiesSearch}
                onChange={(e) => setPartiesSearch(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف..."
                className="bg-transparent text-white w-full focus:outline-hidden"
              />
            </div>
          </div>

          {/* CUSTOMERS TABLE */}
          {partyTypeTab === 'customers' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">العميل</th>
                      <th className="py-2.5 px-3">الهاتف</th>
                      <th className="py-2.5 px-3">الحد الائتماني</th>
                      <th className="py-2.5 px-3 text-rose-400">الرصيد المدين (المستحق)</th>
                      <th className="py-2.5 px-3 text-emerald-400">أقل من 30 يوم</th>
                      <th className="py-2.5 px-3 text-amber-400">30 - 60 يوم</th>
                      <th className="py-2.5 px-3 text-rose-400">أكثر من 60 يوم ⚠️</th>
                      <th className="py-2.5 px-3">الحالة والائتمان</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCustomerAging.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          لا يوجد عملاء مطابقين
                        </td>
                      </tr>
                    ) : (
                      filteredCustomerAging.map((row) => (
                        <tr key={row.customer.id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{row.customer.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {row.customer.code} · {row.orderCount} طلبات
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {row.customer.phone || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {row.customer.creditLimit > 0
                              ? formatCurrency(row.customer.creditLimit, currency)
                              : 'بدون سقف'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-400">
                            {formatCurrency(row.currentDebt, currency)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-400">
                            {formatCurrency(row.under30Days, currency)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-400">
                            {formatCurrency(row.from30To60Days, currency)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-400">
                            {formatCurrency(row.over60Days, currency)}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.isOverLimit ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                                متجاوز الحد!
                              </span>
                            ) : row.customer.allowCredit ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold text-[10px]">
                                مصرح بالآجل
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                                كاش فقط
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUPPLIERS TABLE */}
          {partyTypeTab === 'suppliers' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">المورد</th>
                      <th className="py-2.5 px-3">الهاتف</th>
                      <th className="py-2.5 px-3">نشاط التوريد</th>
                      <th className="py-2.5 px-3 text-rose-400 font-bold">الرصيد الدائن المستحق للمورد</th>
                      <th className="py-2.5 px-3 text-slate-300">إجمالي المشتريات</th>
                      <th className="py-2.5 px-3 text-emerald-400">إجمالي المسدد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSupplierAging.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          لا يوجد موردين مطابقين
                        </td>
                      </tr>
                    ) : (
                      filteredSupplierAging.map((row) => (
                        <tr key={row.supplier.id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{row.supplier.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {row.supplier.code}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {row.supplier.phone || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {row.supplier.supplyCategory || 'عام'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-400">
                            {formatCurrency(row.creditBalance, currency)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {formatCurrency(row.purchasesMinor, currency)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-400">
                            {formatCurrency(row.paymentsMinor, currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORT 6: MENU ENGINEERING & ITEM PROFITABILITY */}
      {reportTab === 'menu_engineering' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-base font-black text-white">
              هندسة المنيو وتحليل ربحية الأصناف (Menu Engineering Matrix)
            </h4>
            <p className="text-xs text-slate-400">
              تصنيف الأصناف حسب مساهمتها في الربح وحجم المبيعات (Stars · Plowhorses · Puzzles · Dogs).
            </p>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-3">الكمية المباعة</th>
                    <th className="py-2.5 px-3">إجمالي الإيراد</th>
                    <th className="py-2.5 px-3">التكلفة المعيارية</th>
                    <th className="py-2.5 px-3">مجمل الربح</th>
                    <th className="py-2.5 px-3">هامش الربح %</th>
                    <th className="py-2.5 px-3">التصنيف الهندسي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {itemProfitabilityList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        لا توجد مبيعات أصناف مسجلة في هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    itemProfitabilityList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {item.code}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                          {item.qtySold} قطعة
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-white">
                          {formatCurrency(item.totalRevenue, currency)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400">
                          {formatCurrency(item.totalCost, currency)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-emerald-400">
                          {formatCurrency(item.grossProfit, currency)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums font-bold">
                          {item.marginPercent.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.classification.badgeClass}`}
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
        </div>
      )}

      {/* REPORT 7: BUSINESS INTELLIGENCE & ACTIONABLE ADVISORY */}
      {reportTab === 'business_insights' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>محرك ذكاء الأعمال وترشيد التكاليف (Smart Advisory & Growth Engine)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                توليد أفكار تشغيلية وترويجية مباشرة مستخلصة من واقع حركات المبيعات الفوقية وسلوك العملاء والتكاليف.
              </p>
            </div>
            <div className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
              {businessInsights.length} توصيات قابلة للتنفيذ الفوري
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {businessInsights.map((card) => (
              <div
                key={card.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-slate-700 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase ${
                        card.priority === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {card.priority === 'high' ? 'أولوية قصوى' : 'فرصة نمو مبيعات'}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      عائد متوقع: + {formatCurrency(card.potentialGainMinor, currency)}
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-white">{card.title}</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      if (card.actionType === 'create_promo') {
                        handleApplyPromoAction(
                          card.payload?.promoTitle,
                          card.payload?.promoDiscount
                        );
                      } else if (card.actionType === 'contact_customer') {
                        if (card.payload?.customerPhone) {
                          window.open(
                            `https://wa.me/${card.payload.customerPhone.replace(/[^0-9]/g, '')}`,
                            '_blank'
                          );
                        } else {
                          showNotification('تم تسجيل التنبيه للتواصل مع العميل');
                        }
                      } else {
                        showNotification('تم إرسال التوصية للإدارة لتعديل السعر');
                      }
                    }}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{card.actionLabel}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORT 8: DEAD STOCK RADAR & CUSTOMER PURCHASES */}
      {reportTab === 'dead_stock_velocity' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Hourglass className="w-5 h-5 text-rose-400" />
                <span>رادار المخزون الراكد وسلوكيات شراء العملاء (Dead Stock & Overstock Radar)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                رصد البضاعة المتكدسة على الرفوف، وحساب رأس المال المعطل، وربطها بانقطاع شراء العملاء لتصريفها سريعاً.
              </p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold">
              رأس مال مجمد في بضاعة راكدة: {formatCurrency(deadStockSummary.totalTiedCapitalMinor, currency)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-400">أصناف راكدة لم تبع منذ &gt; 45 يوماً</div>
              <div className="text-lg font-black font-mono text-rose-400 mt-1">
                {deadStockSummary.deadItemsCount} صنف معطل
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                تسبب تجميداً في السيولة النقدية وتآكلاً في الهوامش
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-400">إجمالي رأس المال المجمد</div>
              <div className="text-lg font-black font-mono text-amber-300 mt-1">
                {formatCurrency(deadStockSummary.totalTiedCapitalMinor, currency)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                بحساب (الكمية الحالية بالرف × سعر التكلفة)
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-400">الحل المقترح لإنقاذ السيولة</div>
              <div className="text-xs font-bold text-white mt-1">
                إطلاق عروض تصفية بخصم 20-30%
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5 font-bold">
                استرجاع الكاش أفضل من تلف البضاعة
              </div>
            </div>
          </div>

          {/* Dead Stock Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden mt-4">
            <div className="bg-slate-900 px-3 py-2 text-xs font-bold text-white border-b border-slate-800 flex items-center justify-between">
              <span>جدول تصنيف سرعة حركة المخزون وركود الأصناف ({deadStockAnalysis.length})</span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-3">الرصيد بالمخزن</th>
                    <th className="py-2.5 px-3">رأس المال المجمد</th>
                    <th className="py-2.5 px-3">آخر تاريخ بيع</th>
                    <th className="py-2.5 px-3">أيام الركود</th>
                    <th className="py-2.5 px-3">سرعة الصنف</th>
                    <th className="py-2.5 px-3 text-left">إجراء تصفية فوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {deadStockAnalysis.map((row) => (
                    <tr
                      key={row.item.id}
                      className={`hover:bg-slate-900/40 ${
                        row.velocityClass === 'dead_c' ? 'bg-rose-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{row.item.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {row.item.code} · تصنيف: {row.item.category}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {row.item.currentStock} {row.item.unit}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                        {formatCurrency(row.tiedCapitalMinor, currency)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {row.lastSoldDate}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span
                          className={
                            row.daysIdle >= 45
                              ? 'text-rose-400'
                              : row.daysIdle >= 15
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {row.daysIdle} يوم
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {row.velocityClass === 'dead_c' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            راكد / بضاعة ميتة (C)
                          </span>
                        ) : row.velocityClass === 'medium_b' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            متوسط الحركة (B)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            سريع الحركة (A)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        {row.velocityClass === 'dead_c' && row.item.currentStock > 0 && (
                          <button
                            type="button"
                            onClick={() => handleCreateClearancePromo(row.item)}
                            className="py-1 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-bold text-[10px] cursor-pointer transition-colors"
                          >
                            كود تصفية 25%
                          </button>
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
    </div>
  );
};
