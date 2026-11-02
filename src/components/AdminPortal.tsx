import React, { useState } from 'react';
import {
  AccountCategory,
  AppUser,
  Customer,
  Employee,
  InventoryItem,
  MenuItem,
  Partner,
  RestaurantSettings,
  Shift,
  Supplier,
  Voucher,
} from '../types';
import { getRolePermissions, StorageService } from '../services/storage';
import { CreditSupplierManager } from './CreditSupplierManager';
import { CustomerCreditManager } from './CustomerCreditManager';
import { InventoryManager } from './InventoryManager';
import { RecipeCostingModal } from './RecipeCostingModal';
import { MasterDataModal } from './MasterDataModal';
import { ShiftsHistory } from './ShiftsHistory';
import { AdminSecurityModal } from './AdminSecurityModal';
import { PromotionsManager } from './PromotionsManager';
import { UsersRolesManager } from './UsersRolesManager';
import { PartnersAndStaffLedger } from './PartnersAndStaffLedger';
import { DeveloperDataTools } from './DeveloperDataTools';
import { KitchenAndDriversManager } from './KitchenAndDriversManager';
import { CloudSyncAndCredentialsVault } from './CloudSyncAndCredentialsVault';
import { FinancialReportsCenter } from './FinancialReportsCenter';
import { ErrorCorrectionHub } from './ErrorCorrectionHub';
import { HRManagementSuite } from './HRManagementSuite';
import { SpecialtyOperationsHub } from './SpecialtyOperationsHub';
import { TenantsManager } from './TenantsManager';
import { DesktopInstallModal } from './DesktopInstallModal';
import {
  BarChart3,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  ChefHat,
  Cloud,
  Cpu,
  CreditCard,
  FileSpreadsheet,
  History,
  KeyRound,
  Landmark,
  LogOut,
  MonitorDown,
  Package,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react';

export type AdminTab =
  | 'tenants'
  | 'cloud_vault'
  | 'specialty_hub'
  | 'financial_reports'
  | 'error_correction'
  | 'hr_management'
  | 'users_roles'
  | 'partners_staff'
  | 'customers_credit'
  | 'suppliers_credit'
  | 'promotions'
  | 'kitchen_drivers'
  | 'inventory'
  | 'recipes'
  | 'master_data'
  | 'shifts_history'
  | 'branding'
  | 'dev_tools';

export type AdminCategory =
  | 'tenants'
  | 'finance'
  | 'operations'
  | 'inventory'
  | 'people'
  | 'system';

interface Props {
  settings: RestaurantSettings;
  categories: AccountCategory[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  customers: Customer[];
  menuItems: MenuItem[];
  shifts: Shift[];
  activeShift: Shift | null;
  users?: AppUser[];
  activeUser?: AppUser;
  partners?: Partner[];
  employees?: Employee[];
  vouchers?: Voucher[];
  isOpen: boolean;
  initialTab?: AdminTab;
  onClose: () => void;
  onRefresh: () => void;
  onSettingsUpdated: (newSettings: RestaurantSettings) => void;
  onRestartOnboarding: () => void;
  onOpenBusinessSwitcher?: () => void;
  onVoucherCreated?: (voucher: Voucher) => void;
}

export const AdminPortal: React.FC<Props> = ({
  settings,
  categories,
  inventory,
  suppliers,
  customers,
  menuItems,
  shifts,
  activeShift,
  users = [],
  activeUser,
  partners = [],
  employees = [],
  vouchers = [],
  isOpen,
  initialTab,
  onClose,
  onRefresh,
  onSettingsUpdated,
  onRestartOnboarding,
  onOpenBusinessSwitcher,
  onVoucherCreated,
}) => {
  const currentUser = activeUser || StorageService.getActiveUser();
  const currentPerms = getRolePermissions(
    currentUser.role,
    currentUser.maxExpenseLimitMinor
  );

  // If the current active user is already Partner, Manager, or Accountant, pre-authenticate
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    currentPerms.canAccessAdminVault
  );
  const [unlockedWithMasterPin, setUnlockedWithMasterPin] = useState<boolean>(
    currentUser.role === 'partner' && !StorageService.isProductionBranchLocked()
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Platform-wide tools (Multi-branch switcher, Cloud Credentials Vault, Developer Mock/Wipe tools)
  const canViewPlatformSuperAdminTools =
    currentUser.role === 'partner' || unlockedWithMasterPin;

  const getCategoryForTab = (tab: AdminTab): AdminCategory => {
    if (tab === 'tenants') return 'tenants';
    if (
      tab === 'financial_reports' ||
      tab === 'partners_staff' ||
      tab === 'error_correction'
    )
      return 'finance';
    if (
      tab === 'specialty_hub' ||
      tab === 'kitchen_drivers' ||
      tab === 'shifts_history'
    )
      return 'operations';
    if (tab === 'inventory' || tab === 'recipes' || tab === 'promotions')
      return 'inventory';
    if (
      tab === 'hr_management' ||
      tab === 'customers_credit' ||
      tab === 'suppliers_credit' ||
      tab === 'users_roles'
    )
      return 'people';
    return 'system';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'tenants');
  const [activeCategory, setActiveCategory] = useState<AdminCategory>(() =>
    getCategoryForTab(initialTab || 'tenants')
  );
  const [showDesktopInstall, setShowDesktopInstall] = useState<boolean>(false);

  const handleCategoryClick = (cat: AdminCategory) => {
    setActiveCategory(cat);
    if (cat === 'tenants') setActiveTab('tenants');
    else if (cat === 'finance') setActiveTab('financial_reports');
    else if (cat === 'operations') setActiveTab('specialty_hub');
    else if (cat === 'inventory') setActiveTab('inventory');
    else if (cat === 'people') setActiveTab('hr_management');
    else if (cat === 'system')
      setActiveTab(canViewPlatformSuperAdminTools ? 'cloud_vault' : 'master_data');
  };

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pinInput.trim();
    if (StorageService.verifyAdminPin(trimmed)) {
      setIsAuthenticated(true);
      if (trimmed === '1234' || trimmed === (settings.adminPin || '1234')) {
        setUnlockedWithMasterPin(true);
      } else {
        setUnlockedWithMasterPin(false);
        if (activeTab === 'cloud_vault' || activeTab === 'dev_tools') {
          setActiveTab('shifts_history');
        }
      }
      setPinError('');
      setPinInput('');
    } else {
      setPinError(
        'رمز PIN غير صحيح. أدخل رمز صلاحيتك المعتمد لهذا الفرع.'
      );
      setPinInput('');
    }
  };

  const isRetail = settings.businessType === 'retail';
  const allUsers = users.length > 0 ? users : StorageService.getUsers();
  const allPartners = partners.length > 0 ? partners : StorageService.getPartners();
  const allEmployees =
    employees.length > 0 ? employees : StorageService.getEmployees();
  const allVouchers = vouchers.length > 0 ? vouchers : StorageService.getVouchers();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 max-h-[96vh] flex flex-col">
        {!isAuthenticated ? (
          <div className="py-12 text-center max-w-sm mx-auto space-y-5">
            <div className="inline-flex p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl">
              <Shield className="w-10 h-10 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-1">
                بوابة إدارة الفرع والرقابة المالية
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                أنت مسجل حالياً كـ ({currentUser.name} - {currentPerms.labelAr}) في «{settings.restaurantName} - {settings.branchName}». أدخل رمز الـ PIN الخاص بدورك الوظيفي للمتابعة.
              </p>
            </div>

            {pinError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                {pinError}
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <input
                type="password"
                maxLength={8}
                autoFocus
                required
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-48 mx-auto block text-center bg-slate-950 border border-slate-700 rounded-xl py-3 text-2xl font-mono tracking-widest text-amber-400 focus:outline-hidden focus:border-amber-500"
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  تأكيد ودخول الإدارة
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-white">
                      إدارة الفرع والرقابة المالية ({settings.branchName})
                    </h2>
                    <span
                      className={`text-[10px] border px-2 py-0.5 rounded font-bold ${currentPerms.badgeColor}`}
                    >
                      {currentUser.name} · {currentPerms.labelAr}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {settings.restaurantName} · صلاحيات معزولة حسب الفرع والدور الوظيفي
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDesktopInstall(true)}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="تثبيت التطبيق كبرنامج مستقل على سطح المكتب للكمبيوتر"
                >
                  <MonitorDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">تثبيت سطح المكتب (PWA)</span>
                </button>

                <button
                  type="button"
                  onClick={() => StorageService.exportToExcel()}
                  className="flex items-center gap-1.5 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="تصدير شيت إكسيل لكافة السجلات المالية"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">تصدير Excel</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج للكاشير</span>
                </button>
              </div>
            </div>

            {/* 1. Categorized Top Navigation Bar (6 Balanced Main Modules - Guaranteed to fit on desktop screens) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 mb-3 text-xs font-bold">
              {/* Category 1: Tenants & Multi-Business Hub */}
              <button
                type="button"
                onClick={() => handleCategoryClick('tenants')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeCategory === 'tenants'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">المنشآت والفروع</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-black/20">
                  {StorageService.getBusinesses().length}
                </span>
              </button>

              {/* Category 2: Financial & Reports */}
              <button
                type="button"
                onClick={() => handleCategoryClick('finance')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeCategory === 'finance'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span className="truncate">التقارير والمالية</span>
              </button>

              {/* Category 3: Specialty Verticals & Dispatch */}
              <button
                type="button"
                onClick={() => handleCategoryClick('operations')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeCategory === 'operations'
                    ? 'bg-purple-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="truncate">الأنشطة التخصصية</span>
              </button>

              {/* Category 4: Inventory & Catalog */}
              <button
                type="button"
                onClick={() => handleCategoryClick('inventory')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeCategory === 'inventory'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span className="truncate">المخزون والمنتجات</span>
              </button>

              {/* Category 5: HR, Debt & Customers */}
              <button
                type="button"
                onClick={() => handleCategoryClick('people')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeCategory === 'people'
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">الأفراد والذمم</span>
              </button>

              {/* Category 6: Cloud, System & Dev */}
              <button
                type="button"
                onClick={() => handleCategoryClick('system')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeCategory === 'system'
                    ? 'bg-blue-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Cloud className="w-4 h-4 shrink-0" />
                <span className="truncate">السحابة والنظام</span>
              </button>
            </div>

            {/* 2. Sub-Tabs Ribbon for the Active Category (Always compact, fully visible without cut-off) */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 text-xs font-bold overflow-x-auto">
              {activeCategory === 'tenants' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('tenants')}
                  className="py-1.5 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>دليل المنشآت والفروع وإضافة نشاط جديد ونسخ الروابط</span>
                </button>
              )}

              {activeCategory === 'finance' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('financial_reports')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'financial_reports'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>التقارير المالية والأرباح و COGS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('partners_staff')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'partners_staff'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>الشركاء وحسابات السيولة (الأوعية الـ 6)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('error_correction')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'error_correction'
                        ? 'bg-rose-500 text-white border-rose-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>تصحيح الأخطاء والقيود العكسية</span>
                  </button>
                </>
              )}

              {activeCategory === 'operations' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('specialty_hub')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'specialty_hub'
                        ? 'bg-purple-500 text-slate-950 border-purple-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>الأنشطة التخصصية (أليفة · بيوتي · سوبرماركت · صيدلية · ملابس)</span>
                  </button>
                  {!isRetail && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('kitchen_drivers')}
                      className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                        activeTab === 'kitchen_drivers'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>المطابخ والديسباتش والطيارين</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('shifts_history')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'shifts_history'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>سجل الورديات المقفلة ({shifts.length})</span>
                  </button>
                </>
              )}

              {activeCategory === 'inventory' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'inventory'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>المخزون والمستودعات والتوالف ({inventory.length})</span>
                  </button>
                  {!isRetail && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('recipes')}
                      className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                        activeTab === 'recipes'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>المنيو والوصفات والتكاليف ({menuItems.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('promotions')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'promotions'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>العروض والكوبونات الترويجية</span>
                  </button>
                </>
              )}

              {activeCategory === 'people' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hr_management')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'hr_management'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>الموارد البشرية والرواتب والعمولات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('customers_credit')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'customers_credit'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>العملاء وصلاحيات الآجل ({customers.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('suppliers_credit')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'suppliers_credit'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>الموردين وحسابات الآجل ({suppliers.length})</span>
                  </button>
                  {currentPerms.canManageUsersAndRoles && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('users_roles')}
                      className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                        activeTab === 'users_roles'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>المستخدمين وصلاحيات الـ PIN ({allUsers.length})</span>
                    </button>
                  )}
                </>
              )}

              {activeCategory === 'system' && (
                <>
                  {canViewPlatformSuperAdminTools && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('cloud_vault')}
                      className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                        activeTab === 'cloud_vault'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>المزامنة السحابية والكلمات السرية</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('master_data')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'master_data'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>دليل الحسابات والبيانات الأساسية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('branding')}
                    className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'branding'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>الهوية والطباعة ورمز PIN</span>
                  </button>
                  {canViewPlatformSuperAdminTools && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('dev_tools')}
                      className={`py-1.5 px-3 rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors ${
                        activeTab === 'dev_tools'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>أدوات المطور وتصفير البيانات</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === 'tenants' && (
                <TenantsManager
                  onRefresh={onRefresh}
                  onBusinessSwitched={onRefresh}
                  onRestartOnboarding={onRestartOnboarding}
                  onOpenDesktopInstallModal={() => setShowDesktopInstall(true)}
                />
              )}

              {activeTab === 'cloud_vault' && canViewPlatformSuperAdminTools && (
                <CloudSyncAndCredentialsVault
                  settings={settings}
                  users={allUsers}
                  onRefresh={onRefresh}
                />
              )}

              {activeTab === 'specialty_hub' && (
                <SpecialtyOperationsHub
                  settings={settings}
                  inventory={inventory}
                  onRefresh={onRefresh}
                  onSettingsUpdated={onSettingsUpdated}
                />
              )}

              {activeTab === 'financial_reports' && (
                <FinancialReportsCenter
                  currency={settings.currency}
                  inventory={inventory}
                  menuItems={menuItems}
                  shifts={shifts}
                />
              )}

              {activeTab === 'error_correction' && (
                <ErrorCorrectionHub
                  currency={settings.currency}
                  activeUser={currentUser}
                  inventory={inventory}
                  onRefresh={onRefresh}
                />
              )}

              {activeTab === 'hr_management' && (
                <HRManagementSuite
                  currency={settings.currency}
                  activeUser={currentUser}
                  employees={allEmployees}
                  onRefresh={onRefresh}
                  onVoucherCreated={onVoucherCreated}
                />
              )}

              {activeTab === 'users_roles' && (
                <UsersRolesManager
                  users={allUsers}
                  activeUser={currentUser}
                  settings={settings}
                  onRefresh={onRefresh}
                  onSettingsUpdated={onSettingsUpdated}
                />
              )}

              {activeTab === 'partners_staff' && (
                <PartnersAndStaffLedger
                  partners={allPartners}
                  employees={allEmployees}
                  vouchers={allVouchers}
                  activeShift={activeShift}
                  activeUser={currentUser}
                  currency={settings.currency}
                  onRefresh={onRefresh}
                  onVoucherCreated={onVoucherCreated}
                />
              )}

              {activeTab === 'customers_credit' && (
                <CustomerCreditManager
                  customers={customers}
                  activeShift={activeShift}
                  currency={settings.currency}
                  onRefresh={onRefresh}
                  onVoucherCreated={onVoucherCreated}
                />
              )}

              {activeTab === 'suppliers_credit' && (
                <CreditSupplierManager
                  suppliers={suppliers}
                  activeShift={activeShift}
                  currency={settings.currency}
                  onRefresh={onRefresh}
                  onVoucherCreated={onVoucherCreated}
                />
              )}

              {activeTab === 'promotions' && (
                <PromotionsManager
                  currency={settings.currency}
                  menuItems={menuItems}
                  onRefresh={onRefresh}
                />
              )}

              {activeTab === 'kitchen_drivers' && (
                <KitchenAndDriversManager
                  settings={settings}
                  activeShift={activeShift}
                  onRefresh={onRefresh}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryManager
                  inventory={inventory}
                  currency={settings.currency}
                  isRetail={isRetail}
                  onRefresh={onRefresh}
                />
              )}

              {activeTab === 'recipes' && (
                <RecipeCostingModal
                  menuItems={menuItems}
                  inventory={inventory}
                  currency={settings.currency}
                  onRefresh={onRefresh}
                />
              )}

              {activeTab === 'master_data' && (
                <MasterDataModal categories={categories} onRefresh={onRefresh} />
              )}

              {activeTab === 'shifts_history' && (
                <ShiftsHistory shifts={shifts} currency={settings.currency} />
              )}

              {activeTab === 'branding' && (
                <AdminSecurityModal
                  settings={settings}
                  onSettingsUpdated={onSettingsUpdated}
                  onRefresh={onRefresh}
                />
              )}

              {activeTab === 'dev_tools' && canViewPlatformSuperAdminTools && (
                <DeveloperDataTools
                  settings={settings}
                  onRefresh={onRefresh}
                  onSettingsUpdated={onSettingsUpdated}
                  onRestartOnboarding={onRestartOnboarding}
                />
              )}
            </div>
          </>
        )}

        {showDesktopInstall && (
          <DesktopInstallModal
            onClose={() => setShowDesktopInstall(false)}
            canTriggerDirect={true}
            onTriggerNativeInstall={() => {
              setShowDesktopInstall(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
