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
import {
  Bike,
  BookOpen,
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
  Package,
  RotateCcw,
  Shield,
  ShieldCheck,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react';

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
  initialTab?:
    | 'cloud_vault'
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
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    | 'cloud_vault'
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
    | 'dev_tools'
  >(initialTab || 'cloud_vault');

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (StorageService.verifyAdminPin(pinInput)) {
      setIsAuthenticated(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError(
        'رمز PIN غير صحيح. أدخل رمز الشريك (1234) أو المدير (3333) أو المحاسب (2222).'
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
                بوابة الإدارة والرقابة المالية (Executive Vault)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                أنت مسجل حالياً كـ ({currentUser.name} - {currentPerms.labelAr}). للدخول إلى بوابة الإدارة والمحاسبة، أدخل رمز PIN المحاسب (2222) أو المدير (3333) أو الشريك المالك (1234).
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
                      مظلة الإدارة والرقابة المالية (Admin & Accounting Vault)
                    </h2>
                    <span
                      className={`text-[10px] border px-2 py-0.5 rounded font-bold ${currentPerms.badgeColor}`}
                    >
                      {currentUser.name} · {currentPerms.labelAr}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {settings.restaurantName} · إدارة الصلاحيات وحسابات الشركاء والموظفين والموردين والعملاء
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onOpenBusinessSwitcher && (
                  <button
                    type="button"
                    onClick={onOpenBusinessSwitcher}
                    className="flex items-center gap-1.5 py-1.5 px-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    title="التبديل بين المطاعم والأنشطة أو إنشاء منشأة جديدة"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">الأنشطة ({StorageService.getBusinesses().length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('cloud_vault')}
                  className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                    activeTab === 'cloud_vault'
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
                  }`}
                  title="مركز المزامنة السحابية للفروع وخزينة الكلمات السرية"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">السحابة والكلمات السرية</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dev_tools')}
                  className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                    activeTab === 'dev_tools'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                  }`}
                  title="أدوات المطور: تبديل ببيانات تجريبية أو تصفير البيانات"
                >
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">أدوات المطور</span>
                </button>

                <button
                  type="button"
                  onClick={onRestartOnboarding}
                  className="flex items-center gap-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">إعادة التهيئة</span>
                </button>

                <button
                  type="button"
                  onClick={() => StorageService.exportToExcel()}
                  className="flex items-center gap-1 py-1.5 px-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تصدير Excel</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>قفل وخروج للكاشير</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-4 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab('cloud_vault')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap border ${
                  activeTab === 'cloud_vault'
                    ? 'bg-sky-500 text-slate-950 font-black border-sky-400'
                    : 'bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20'
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span>المزامنة السحابية والكلمات السرية</span>
              </button>

              <button
                onClick={() => setActiveTab('users_roles')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'users_roles'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>المستخدمين والصلاحيات ({allUsers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('partners_staff')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'partners_staff'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>الشركاء والموظفين والأوعية النقدية</span>
              </button>

              <button
                onClick={() => setActiveTab('customers_credit')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'customers_credit'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>العملاء وصلاحيات الآجل ({customers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('suppliers_credit')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'suppliers_credit'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>الموردين والمشتريات الآجلة ({suppliers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('promotions')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'promotions'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>العروض والكوبونات</span>
              </button>

              {!isRetail && (
                <button
                  onClick={() => setActiveTab('kitchen_drivers')}
                  className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'kitchen_drivers'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>أقسام المطبخ والطيارين</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'inventory'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>المخزون والتكاليف ({inventory.length})</span>
              </button>

              {!isRetail && (
                <button
                  onClick={() => setActiveTab('recipes')}
                  className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'recipes'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span>المنيو والوصفات ({menuItems.length})</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('master_data')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'master_data'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>دليل الحسابات</span>
              </button>

              <button
                onClick={() => setActiveTab('shifts_history')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'shifts_history'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>سجل الورديات ({shifts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('branding')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'branding'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>الهوية والطباعة ورمز PIN</span>
              </button>

              <button
                onClick={() => setActiveTab('dev_tools')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap border ${
                  activeTab === 'dev_tools'
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>أدوات المطور والبيانات (Mock & Wipe)</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeTab === 'cloud_vault' && (
                <CloudSyncAndCredentialsVault
                  settings={settings}
                  users={allUsers}
                  onRefresh={onRefresh}
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
                />
              )}

              {activeTab === 'dev_tools' && (
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
      </div>
    </div>
  );
};
