import { useEffect, useState } from 'react';
import {
  AccountCategory,
  AppUser,
  Customer,
  Employee,
  InventoryItem,
  MenuItem,
  Partner,
  RestaurantSettings,
  SaleOrder,
  Shift,
  Supplier,
  Voucher,
  VoucherType,
} from './types';
import {
  formatCurrency,
  getFinancialContainerLabel,
  getPartyTypeLabel,
  getPaymentMethodLabel,
  getRolePermissions,
  getTodayDateString,
  getVoucherTypeLabel,
  StorageService,
} from './services/storage';
import { initDriveAuth } from './services/googleDrive';
import { OnboardingWizard } from './components/OnboardingWizard';
import { OpenShiftModal } from './components/OpenShiftModal';
import { VoucherModal } from './components/VoucherModal';
import { ShiftSalesModal } from './components/ShiftSalesModal';
import { CloseShiftModal } from './components/CloseShiftModal';
import { OrderPrintMode, PrintPreviewDialog } from './components/PrintPreviewDialog';
import { CashierCreditInvoiceModal } from './components/CashierCreditInvoiceModal';
import { AdminPortal } from './components/AdminPortal';
import { DesktopInstallModal } from './components/DesktopInstallModal';
import { CashierPOSView } from './components/CashierPOSView';
import { ShiftTopMealsChart } from './components/ShiftTopMealsChart';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { BusinessSwitcherModal } from './components/BusinessSwitcherModal';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Briefcase,
  Building2,
  ChefHat,
  CheckCircle2,
  ChevronDown,
  Cloud,
  CloudOff,
  Edit3,
  Eye,
  Landmark,
  Lock,
  MonitorDown,
  Play,
  Printer,
  Receipt,
  Search,
  Shield,
  ShoppingBag,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
} from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<RestaurantSettings>(() =>
    StorageService.getSettings()
  );
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>(() => StorageService.getUsers());
  const [activeUser, setActiveUser] = useState<AppUser>(() =>
    StorageService.getActiveUser()
  );
  const [partners, setPartners] = useState<Partner[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Cashier workspace tabs
  const [cashierTab, setCashierTab] = useState<'pos' | 'orders' | 'vouchers'>('pos');

  // Filters
  const [voucherFilter, setVoucherFilter] = useState<'all' | VoucherType>('all');
  const [voucherSearch, setVoucherSearch] = useState<string>('');
  const [orderSearch, setOrderSearch] = useState<string>('');

  // Modals State
  const [showOpenShiftModal, setShowOpenShiftModal] = useState<boolean>(false);
  const [voucherModalType, setVoucherModalType] = useState<VoucherType | null>(null);
  const [showSalesModal, setShowSalesModal] = useState<boolean>(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState<boolean>(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<Voucher | null>(
    null
  );
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<SaleOrder | null>(
    null
  );
  const [orderPrintModeForModal, setOrderPrintModeForModal] = useState<
    OrderPrintMode | undefined
  >(undefined);
  const [showCreditInvoiceModal, setShowCreditInvoiceModal] = useState<boolean>(false);
  const [showAdminPortal, setShowAdminPortal] = useState<boolean>(false);
  const [showUserSwitcherModal, setShowUserSwitcherModal] = useState<boolean>(false);
  const [showBusinessSwitcherModal, setShowBusinessSwitcherModal] = useState<boolean>(false);

  // Connectivity & PWA Install
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [driveConnected, setDriveConnected] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);
  const [isStandalone] = useState<boolean>(
    typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true)
  );

  const refreshData = () => {
    const s = StorageService.getSettings();
    const c = StorageService.getCategories();
    const sh = StorageService.getShifts();
    const act = StorageService.getActiveShift();
    const inv = StorageService.getInventory();
    const sup = StorageService.getSuppliers();
    const cust = StorageService.getCustomers();
    const menu = StorageService.getMenuItems();
    const usrList = StorageService.getUsers();
    const actUsr = StorageService.getActiveUser();
    const prtList = StorageService.getPartners();
    const empList = StorageService.getEmployees();

    setSettings(s);
    setCategories(c);
    setShifts(sh);
    setActiveShift(act);
    setInventory(inv);
    setSuppliers(sup);
    setCustomers(cust);
    setMenuItems(menu);
    setUsers(usrList);
    setActiveUser(actUsr);
    setPartners(prtList);
    setEmployees(empList);

    if (act) {
      setVouchers(StorageService.getVouchers(act.id));
      setSaleOrders(StorageService.getSaleOrders(act.id));
    } else {
      setVouchers(StorageService.getVouchers());
      setSaleOrders(StorageService.getSaleOrders());
    }
  };

  useEffect(() => {
    refreshData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsub = initDriveAuth(
      () => setDriveConnected(true),
      () => setDriveConnected(false)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      unsub();
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuideModal(true);
    }
  };

  const activeCalc = activeShift ? StorageService.calculateShiftCash(activeShift) : null;
  const isRetail = settings.businessType === 'retail';
  const activePerms = getRolePermissions(
    activeUser.role,
    activeUser.maxExpenseLimitMinor
  );

  const filteredVouchers = vouchers.filter((v) => {
    const matchesType = voucherFilter === 'all' || v.type === voucherFilter;
    const matchesSearch =
      v.recipient.toLowerCase().includes(voucherSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(voucherSearch.toLowerCase()) ||
      v.accountName.toLowerCase().includes(voucherSearch.toLowerCase()) ||
      v.voucherNumber.toLowerCase().includes(voucherSearch.toLowerCase()) ||
      (v.invoiceNo && v.invoiceNo.toLowerCase().includes(voucherSearch.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const filteredOrders = saleOrders.filter((o) => {
    if (!orderSearch.trim()) return true;
    const q = orderSearch.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      o.lines.some((l) => l.menuItemName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. ONBOARDING WIZARD */}
      {!settings.isOnboarded && (
        <OnboardingWizard
          initialSettings={settings}
          onComplete={(newSettings) => {
            setSettings(newSettings);
            refreshData();
          }}
        />
      )}

      {/* 2. CASHIER COUNTER TOP BAR */}
      <header className="no-print bg-slate-900 border-b border-slate-800 px-4 lg:px-8 py-3 sticky top-0 z-30 flex items-center justify-between gap-4 shadow-md">
        {/* Brand & Store Profile with Multi-Tenant Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowBusinessSwitcherModal(true)}
            className="flex items-center gap-3 p-1.5 -m-1.5 hover:bg-slate-800/80 rounded-2xl transition-all cursor-pointer text-right group border border-transparent hover:border-slate-700/60"
            title="اضغط لتبديل المطعم أو إنشاء منشأة تجارية جديدة (Multi-Tenant)"
          >
            {settings.logoBase64 ? (
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden border border-slate-700 shadow-xs">
                <img
                  src={settings.logoBase64}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                {isRetail ? (
                  <Store className="w-5 h-5 stroke-[2.2]" />
                ) : (
                  <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
                )}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white block group-hover:text-amber-300 transition-colors">
                  {settings.restaurantName}
                </span>
                <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-semibold border border-slate-700">
                  {isRetail ? 'محل تجزئة' : 'مطعم وجبات'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-transform group-hover:translate-y-0.5" />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>{settings.branchName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-amber-400">{getTodayDateString()}</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowBusinessSwitcherModal(true)}
            className="hidden lg:flex items-center gap-1.5 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-xl text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
            title="إدارة وتبديل المنشآت (تعدد الأنشطة)"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>الأنشطة ({StorageService.getBusinesses().length})</span>
          </button>
        </div>

        {/* Center: Shift & Active User Role Switcher */}
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <div className="bg-slate-950/70 border border-slate-800 py-1.5 px-3 rounded-xl">
            {activeShift ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-white">
                  الوردية #{activeShift.shiftNumber}
                </span>
              </div>
            ) : (
              <span className="text-slate-400">لا توجد وردية مفتوحة</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowUserSwitcherModal(true)}
            className={`flex items-center gap-2 py-1.5 px-3 rounded-xl border transition-all cursor-pointer ${activePerms.badgeColor}`}
            title="اضغط لتبديل المستخدم الحالي (كاشير / محاسب / مدير / شريك)"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="font-black">{activeUser.name}</span>
            <span className="opacity-75">({activePerms.labelAr})</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowUserSwitcherModal(true)}
            className="sm:hidden flex items-center gap-1 py-1.5 px-2.5 bg-slate-800 text-amber-300 border border-slate-700 rounded-xl text-[11px] font-bold cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{activePerms.labelAr}</span>
          </button>

          <div
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
              isOnline
                ? driveConnected
                  ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isOnline ? (
              <Cloud className="w-3.5 h-3.5" />
            ) : (
              <CloudOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline">
              {isOnline ? (driveConnected ? 'سحابي متصل' : 'أونلاين') : 'أوفلاين محلي'}
            </span>
          </div>

          {!isStandalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <MonitorDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">نسخة سطح المكتب</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAdminPortal(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>بوابة الإدارة والمحاسبة</span>
          </button>

          {activeShift ? (
            <button
              type="button"
              onClick={() => setShowCloseShiftModal(true)}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>تقفيل الوردية</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowOpenShiftModal(true)}
              className="flex items-center gap-1.5 py-1.5 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>فتح وردية جديدة</span>
            </button>
          )}
        </div>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-5 space-y-5">
        {!activeShift || !activeCalc ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center max-w-lg mx-auto my-12 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Play className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">لا توجد وردية كاشير مفتوحة</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              لبدء بيع أطباق المنيو وتسجيل سندات القبض والصرف ومعاينة الفواتير للطباعة، قم بفتح
              وردية جديدة وتحديد عهدة الكاشير الافتتاحية.
            </p>
            <button
              type="button"
              onClick={() => setShowOpenShiftModal(true)}
              className="py-3 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>فتح وردية كاشير الآن</span>
            </button>
          </div>
        ) : (
          <>
            {/* A. SHIFT TREASURY & SALES KPI STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[11px] text-slate-400 block">عهدة بداية الوردية</span>
                <strong className="text-base font-black font-mono text-white">
                  {formatCurrency(activeCalc.openingCustody, settings.currency)}
                </strong>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">مبيعات الكاش النقدية</span>
                  {activePerms.canEditShiftSalesManually && (
                    <button
                      type="button"
                      onClick={() => setShowSalesModal(true)}
                      className="text-slate-500 hover:text-amber-400 cursor-pointer"
                      title="تعديل يدوي لإجماليات المبيعات (للمحاسب والمدير فقط)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <strong className="text-base font-black font-mono text-emerald-400">
                  {formatCurrency(activeCalc.cashSales, settings.currency)}
                </strong>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[11px] text-slate-400 block">
                  إلكتروني (فيزا / إنستاباي / محفظة)
                </span>
                <strong className="text-base font-black font-mono text-sky-400">
                  {formatCurrency(activeCalc.totalElectronicSales, settings.currency)}
                </strong>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[11px] text-slate-400 block">مبيعات آجلة (عملاء)</span>
                <strong className="text-base font-black font-mono text-purple-400">
                  {formatCurrency(activeCalc.creditSales, settings.currency)}
                </strong>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[11px] text-slate-400 block">مصروفات وسداد موردين</span>
                <strong className="text-base font-black font-mono text-rose-400">
                  {formatCurrency(activeCalc.totalExpenses, settings.currency)}
                </strong>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5">
                <span className="text-[11px] text-amber-300 font-bold block">
                  صافي النقدية بالدرج الآن
                </span>
                <strong className="text-lg font-black font-mono text-amber-400">
                  {formatCurrency(activeCalc.expectedCashInDrawer, settings.currency)}
                </strong>
              </div>
            </div>

            {/* B. QUICK TREASURY VOUCHER & NAVIGATION BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3">
              {/* Workspace Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setCashierTab('pos')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    cashierTab === 'pos'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>نقطة بيع المنيو (POS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCashierTab('orders')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    cashierTab === 'orders'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>فواتير مبيعات الوردية ({saleOrders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCashierTab('vouchers')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    cashierTab === 'vouchers'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>سندات الخزينة والمصروفات ({vouchers.length})</span>
                </button>
              </div>

              {/* Quick Voucher Issuance Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVoucherModalType('expense')}
                  className="flex items-center gap-1.5 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>سند صرف مصروف</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVoucherModalType('staff_advance')}
                  className="flex items-center gap-1.5 py-2 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>سلفة / راتب موظف</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVoucherModalType('partner_drawing')}
                  className="flex items-center gap-1.5 py-2 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Landmark className="w-4 h-4" />
                  <span>مسحوبات/إيداع شريك</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVoucherModalType('receipt')}
                  className="flex items-center gap-1.5 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>سند قبض نقدية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreditInvoiceModal(true)}
                  className="flex items-center gap-1.5 py-2 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>إثبات توريد آجل</span>
                </button>
              </div>
            </div>

            {/* C. TAB 1: POS MENU SELLING */}
            {cashierTab === 'pos' && (
              <CashierPOSView
                activeShift={activeShift}
                settings={settings}
                menuItems={menuItems}
                inventory={inventory}
                customers={customers}
                onOrderCompleted={(newOrder, shouldPrint, mode) => {
                  refreshData();
                  if (shouldPrint) {
                    setOrderPrintModeForModal(mode);
                    setSelectedOrderForPrint(newOrder);
                  }
                }}
                onVoucherCreated={(newVoucher, shouldPrint) => {
                  refreshData();
                  if (shouldPrint) {
                    setSelectedVoucherForPrint(newVoucher);
                  }
                }}
                onRefresh={refreshData}
              />
            )}

            {/* D. TAB 2: SHIFT SALES ORDERS & RECHARTS TOP MEALS DASHBOARD */}
            {cashierTab === 'orders' && (
              <div className="space-y-5">
                {/* Recharts Dashboard for Top-Selling Meals in Current Shift */}
                <ShiftTopMealsChart orders={saleOrders} currency={settings.currency} />

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-white">
                        سجل فواتير مبيعات الوردية #{activeShift.shiftNumber}
                      </h3>
                      <p className="text-xs text-slate-400">
                        اضغط على &quot;معاينة وطباعة&quot; لأي فاتورة لفتح نافذة المعاينة القياسية قبل
                        الطباعة الفعلية
                      </p>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="بحث برقم الفاتورة، العميل، أو الصنف..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">رقم الفاتورة</th>
                          <th className="py-3 px-4">الوقت</th>
                          <th className="py-3 px-4">الأصناف المباعة</th>
                          <th className="py-3 px-4">طريقة الدفع</th>
                          <th className="py-3 px-4">العميل</th>
                          <th className="py-3 px-4">صافي الفاتورة</th>
                          <th className="py-3 px-4 text-left">معاينة وطباعة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {filteredOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-950/60">
                            <td className="py-3 px-4">
                              <div className="font-mono font-bold text-amber-400">
                                {ord.orderNumber}
                              </div>
                              <div className="mt-0.5">
                                <span className="inline-block text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-950 border border-slate-800 text-slate-300">
                                  {ord.orderType === 'dine_in' && `🍽️ صالة [${ord.tableNumber || 1}]`}
                                  {ord.orderType === 'takeaway' && `🛍️ تيك أواي #${ord.dailySequenceNumber || 1}`}
                                  {ord.orderType === 'delivery' && `🛵 دليفري ${ord.deliveryDriverName ? `(${ord.deliveryDriverName})` : ''}`}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {ord.date} · {ord.time}
                            </td>
                            <td className="py-3 px-4 text-slate-200">
                              {ord.lines.map((l) => `${l.menuItemName} (×${l.qty})`).join(' ، ')}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-bold text-slate-200">
                                {getPaymentMethodLabel(ord.paymentMethod)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-300">
                              <div>{ord.customerName || 'عميل نقدي مباشر'}</div>
                              {ord.customerPhone && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {ord.customerPhone}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono font-black text-emerald-400">
                              <div>{formatCurrency(ord.totalAmount, settings.currency)}</div>
                              {ord.couponCode && (
                                <span className="inline-block mt-0.5 text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans font-bold">
                                  كوبون: {ord.couponCode}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-left">
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderPrintModeForModal('customer_invoice');
                                    setSelectedOrderForPrint(ord);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-xl font-bold transition-all cursor-pointer text-xs"
                                  title="معاينة وطباعة فاتورة العميل"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>فاتورة</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderPrintModeForModal('kitchen_kot');
                                    setSelectedOrderForPrint(ord);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl font-bold transition-all cursor-pointer text-xs"
                                  title="معاينة وطباعة بون تشغيل المطبخ (KOT)"
                                >
                                  <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                                  <span>KOT</span>
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

            {/* E. TAB 3: SHIFT VOUCHERS */}
            {cashierTab === 'vouchers' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white">
                      دفتر سندات الخزينة للوردية #{activeShift.shiftNumber}
                    </h3>
                    <p className="text-xs text-slate-400">
                      اضغط على &quot;معاينة وطباعة&quot; لأي سند لعرضه في نافذة المعاينة القياسية
                      واختيار مقاس الورق (A4/A5 أو حراري 80mm) قبل الطباعة
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={voucherFilter}
                      onChange={(e) => setVoucherFilter(e.target.value as 'all' | VoucherType)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="all">كل أنواع السندات</option>
                      <option value="expense">سندات صرف مصروفات</option>
                      <option value="supplier_payment">سندات سداد موردين</option>
                      <option value="staff_advance">سندات سلف ورواتب الموظفين</option>
                      <option value="partner_drawing">مسحوبات جاري الشركاء</option>
                      <option value="receipt">سندات قبض نقدية</option>
                      <option value="customer_collection">سندات تحصيل عملاء آجل</option>
                      <option value="partner_deposit">إيداعات وتمويل الشركاء</option>
                      <option value="staff_custody_settlement">رد وتسوية عهدة موظف</option>
                      <option value="credit_purchase">فواتير مشتريات آجلة</option>
                    </select>

                    <div className="relative w-64">
                      <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={voucherSearch}
                        onChange={(e) => setVoucherSearch(e.target.value)}
                        placeholder="بحث برقم السند أو المستفيد..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3">رقم السند</th>
                        <th className="py-3 px-3">النوع</th>
                        <th className="py-3 px-3">الطرف والحساب</th>
                        <th className="py-3 px-3">الوعاء النقدي</th>
                        <th className="py-3 px-3">المستفيد / البيان</th>
                        <th className="py-3 px-3">المنفذ والمعتمد</th>
                        <th className="py-3 px-3">المبلغ</th>
                        <th className="py-3 px-3 text-left">معاينة وطباعة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {filteredVouchers.map((v) => {
                        const isReceipt =
                          v.type === 'receipt' ||
                          v.type === 'customer_collection' ||
                          v.type === 'partner_deposit' ||
                          v.type === 'staff_custody_settlement';
                        return (
                          <tr key={v.id} className="hover:bg-slate-950/60">
                            <td className="py-3 px-3 font-mono font-bold text-amber-400">
                              <div>{v.voucherNumber}</div>
                              <div className="text-[10px] text-slate-500">
                                {v.date} · {v.time}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                  isReceipt
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : v.type === 'credit_purchase'
                                    ? 'bg-indigo-500/15 text-indigo-300'
                                    : v.type === 'partner_drawing'
                                    ? 'bg-purple-500/15 text-purple-300'
                                    : 'bg-rose-500/15 text-rose-300'
                                }`}
                              >
                                {getVoucherTypeLabel(v.type)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div className="font-bold text-white">
                                {getPartyTypeLabel(v.partyType)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                [{v.accountCode}] {v.accountName}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-bold text-sky-300">
                                {getFinancialContainerLabel(v.financialContainer)}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-white">{v.recipient}</div>
                              <div className="text-[11px] text-slate-400">
                                {v.description}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[11px]">
                              <div className="text-slate-300">{v.cashierName}</div>
                              {v.approvedByUserName && (
                                <div className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>اعتماد: {v.approvedByUserName}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono font-black text-white">
                              {formatCurrency(v.amount, settings.currency)}
                            </td>
                            <td className="py-3 px-3 text-left">
                              <button
                                type="button"
                                onClick={() => setSelectedVoucherForPrint(v)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-xl font-bold transition-all cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>معاينة وطباعة</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALS */}
      {showUserSwitcherModal && (
        <UserSwitcherModal
          users={users}
          activeUser={activeUser}
          currency={settings.currency}
          onClose={() => setShowUserSwitcherModal(false)}
          onUserSwitched={(switchedUser) => {
            setActiveUser(switchedUser);
            refreshData();
          }}
        />
      )}

      {showOpenShiftModal && (
        <OpenShiftModal
          settings={settings}
          onClose={() => setShowOpenShiftModal(false)}
          onShiftOpened={() => {
            setShowOpenShiftModal(false);
            refreshData();
          }}
        />
      )}

      {voucherModalType && activeShift && (
        <VoucherModal
          shiftId={activeShift.id}
          cashierName={activeUser.name || activeShift.cashierName}
          activeUser={activeUser}
          initialType={voucherModalType}
          categories={categories}
          suppliers={suppliers}
          customers={customers}
          partners={partners}
          employees={employees}
          currency={settings.currency}
          onClose={() => setVoucherModalType(null)}
          onSuccess={(newVoucher, shouldPrint) => {
            setVoucherModalType(null);
            refreshData();
            if (shouldPrint) setSelectedVoucherForPrint(newVoucher);
          }}
        />
      )}

      {showSalesModal && activeShift && (
        <ShiftSalesModal
          shift={activeShift}
          currency={settings.currency}
          onClose={() => setShowSalesModal(false)}
          onUpdated={refreshData}
        />
      )}

      {showCloseShiftModal && activeShift && (
        <CloseShiftModal
          shift={activeShift}
          currency={settings.currency}
          activeUser={activeUser}
          settings={settings}
          onClose={() => setShowCloseShiftModal(false)}
          onShiftClosed={() => {
            setShowCloseShiftModal(false);
            refreshData();
          }}
        />
      )}

      {/* 5. STANDARDIZED PRINT PREVIEW DIALOG (For both Vouchers and Sale Invoices) */}
      {(selectedVoucherForPrint || selectedOrderForPrint) && (
        <PrintPreviewDialog
          voucher={selectedVoucherForPrint}
          order={selectedOrderForPrint}
          settings={settings}
          initialFormat={selectedOrderForPrint ? 'thermal' : 'standard'}
          initialDocMode={orderPrintModeForModal}
          onClose={() => {
            setSelectedVoucherForPrint(null);
            setSelectedOrderForPrint(null);
            setOrderPrintModeForModal(undefined);
          }}
        />
      )}

      {showCreditInvoiceModal && activeShift && (
        <CashierCreditInvoiceModal
          activeShift={activeShift}
          settings={settings}
          suppliers={suppliers}
          inventory={inventory}
          onClose={() => setShowCreditInvoiceModal(false)}
          onSuccess={(newVoucher, shouldPrint) => {
            setShowCreditInvoiceModal(false);
            refreshData();
            if (shouldPrint) setSelectedVoucherForPrint(newVoucher);
          }}
          onSupplierCreated={refreshData}
        />
      )}

      {showAdminPortal && (
        <AdminPortal
          settings={settings}
          categories={categories}
          inventory={inventory}
          suppliers={suppliers}
          customers={customers}
          menuItems={menuItems}
          shifts={shifts}
          activeShift={activeShift}
          users={users}
          activeUser={activeUser}
          partners={partners}
          employees={employees}
          vouchers={StorageService.getVouchers()}
          isOpen={showAdminPortal}
          onClose={() => setShowAdminPortal(false)}
          onRefresh={refreshData}
          onVoucherCreated={(newVoucher) => {
            refreshData();
            setSelectedVoucherForPrint(newVoucher);
          }}
          onSettingsUpdated={(newSettings) => {
            setSettings(newSettings);
            refreshData();
          }}
          onRestartOnboarding={() => {
            setShowAdminPortal(false);
            StorageService.resetToOnboarding();
            refreshData();
          }}
          onOpenBusinessSwitcher={() => {
            setShowAdminPortal(false);
            setShowBusinessSwitcherModal(true);
          }}
        />
      )}

      {showInstallGuideModal && (
        <DesktopInstallModal
          onClose={() => setShowInstallGuideModal(false)}
          canTriggerDirect={Boolean(deferredPrompt)}
          onTriggerNativeInstall={handleInstallClick}
        />
      )}

      {showBusinessSwitcherModal && (
        <BusinessSwitcherModal
          isOpen={showBusinessSwitcherModal}
          currentSettings={settings}
          onClose={() => setShowBusinessSwitcherModal(false)}
          onBusinessSwitched={() => {
            refreshData();
          }}
          onRestartOnboarding={() => {
            setShowBusinessSwitcherModal(false);
            StorageService.resetToOnboarding();
            refreshData();
          }}
        />
      )}
    </div>
  );
}
