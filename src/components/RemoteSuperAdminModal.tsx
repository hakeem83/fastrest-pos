import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AppUser,
  BusinessBackupBundle,
  InventoryItem,
  MenuItem,
  Shift,
} from '../types';
import {
  formatCurrency,
  getPaymentMethodLabel,
  getRolePermissions,
  getVoucherTypeLabel,
  StorageService,
} from '../services/storage';
import { CloudBusinessDoc, CloudSyncService } from '../services/firebaseSync';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  Copy,
  CreditCard,
  DollarSign,
  Edit3,
  Eye,
  Globe,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  LogOut,
  Package,
  Radio,
  Receipt,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Unlock,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefreshLocal: () => void;
}

const PRESET_SIX_BRANCHES: Array<{
  name: string;
  branchName: string;
  businessType: 'restaurant' | 'retail';
  phone: string;
  address: string;
}> = [
  {
    name: 'مطعم ومشويات الشرق الأصيل',
    branchName: 'الفرع الأول - مدينة نصر',
    businessType: 'restaurant',
    phone: '01001234561',
    address: 'شارع عباس العقاد - مدينة نصر',
  },
  {
    name: 'مطعم ومشويات الشرق الأصيل',
    branchName: 'الفرع الثاني - التجمع الخامس',
    businessType: 'restaurant',
    phone: '01001234562',
    address: 'شارع التسعين الشمالي - التجمع الخامس',
  },
  {
    name: 'مطعم وكافيه السرايا الشامية',
    branchName: 'الفرع الرئيسي - المهندسين',
    businessType: 'restaurant',
    phone: '01001234563',
    address: 'شارع جامعة الدول العربية - المهندسين',
  },
  {
    name: 'سوبر ماركت البركة المتكامل',
    branchName: 'فرع التجزئة والتموين',
    businessType: 'retail',
    phone: '01001234564',
    address: 'الحي الثامن - المنطقة المركزية',
  },
  {
    name: 'أتيليه ومول أناقة حواء والطفل',
    branchName: 'فرع الملابس النسائية والأطفالي',
    businessType: 'retail',
    phone: '01001234565',
    address: 'مول سيتي ستارز - الدور الثاني',
  },
  {
    name: 'صيدلية الشفاء العاجل',
    branchName: 'فرع الأدوية ومستحضرات التجميل',
    businessType: 'retail',
    phone: '01001234566',
    address: 'ميدان الحصري - 6 أكتوبر',
  },
];

// Helper to calculate shift drawer cash purely from a branch's bundle without touching localStorage
function calculateRemoteShiftDrawer(bundle: BusinessBackupBundle, shift: Shift) {
  const vouchers = (bundle.vouchers || []).filter((v) => v.shiftId === shift.id);
  const drawerVouchers = vouchers.filter(
    (v) => !v.financialContainer || v.financialContainer === 'shift_drawer'
  );

  const totalReceipts = drawerVouchers
    .filter(
      (v) =>
        v.type === 'receipt' ||
        v.type === 'customer_collection' ||
        v.type === 'partner_deposit' ||
        v.type === 'staff_custody_settlement'
    )
    .reduce((s, v) => s + (v.amount || 0), 0);

  const totalExpenses = drawerVouchers
    .filter(
      (v) =>
        v.type === 'expense' ||
        v.type === 'supplier_payment' ||
        v.type === 'partner_drawing' ||
        v.type === 'staff_advance'
    )
    .reduce((s, v) => s + (v.amount || 0), 0);

  const cashSales = shift.cashSales || 0;
  const electronicSales =
    (shift.visaSales || 0) + (shift.instapaySales || 0) + (shift.ewalletSales || 0);
  const creditSales = shift.creditSales || 0;
  const expectedCashInDrawer =
    (shift.openingCustody || 0) + cashSales + totalReceipts - totalExpenses;

  return {
    openingCustody: shift.openingCustody || 0,
    cashSales,
    electronicSales,
    creditSales,
    totalReceipts,
    totalExpenses,
    expectedCashInDrawer,
  };
}

export const RemoteSuperAdminModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onRefreshLocal,
}) => {
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudDocs, setCloudDocs] = useState<CloudBusinessDoc[]>([]);
  const [pinVerified, setPinVerified] = useState<boolean>(() => {
    if (StorageService.isProductionBranchLocked()) return false;
    const activeUsr = StorageService.getActiveUser();
    return activeUsr.role === 'partner';
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Main Views: 'radar' (all branches overview) vs 'inspector' (single branch remote control)
  const [mainTab, setMainTab] = useState<'radar' | 'inspector'>('radar');
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<
    'live_shift' | 'menu_inventory' | 'pins_settings' | 'debts'
  >('live_shift');

  // Editable draft bundle for remote control
  const [draftBundle, setDraftBundle] = useState<BusinessBackupBundle | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [itemSearch, setItemSearch] = useState<string>('');
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedBranchLinkId, setCopiedBranchLinkId] = useState<string | null>(null);
  const [lockedBranchId, setLockedBranchIdState] = useState<string | null>(() =>
    StorageService.getLockedBranchId()
  );
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const getProductionBaseUrl = () => {
    if (
      typeof window !== 'undefined' &&
      !window.location.origin.includes('ais-dev-')
    ) {
      return `${window.location.origin}${window.location.pathname}`;
    }
    return 'https://ais-pre-l3snrurformehjombrnprs-789700516395.europe-west2.run.app/';
  };

  const handleCopyLockedBranchUrl = (docItem: CloudBusinessDoc) => {
    const base = getProductionBaseUrl().replace(/\/$/, '');
    const url = `${base}/?branch=${encodeURIComponent(docItem.businessId)}`;
    navigator.clipboard.writeText(url);
    setCopiedBranchLinkId(docItem.businessId);
    setTimeout(() => setCopiedBranchLinkId(null), 3000);
    showNotice(
      `تم نسخ الرابط المستقل والمقفل لفرع «${docItem.businessName} - ${docItem.branchName}»! عند فتحه سيرى الموظفون هذا الفرع فقط بدون AI Studio.`,
      'info'
    );
  };

  const handleLockDeviceToBranch = (docItem: CloudBusinessDoc) => {
    CloudSyncService.restoreCloudBusinessToLocal(docItem, true);
    StorageService.setLockedBranchId(docItem.businessId);
    setLockedBranchIdState(docItem.businessId);
    onRefreshLocal();
    showNotice(
      `تم قفل هذا الجهاز في وضع الإنتاج على «${docItem.businessName} - ${docItem.branchName}» فقط! اختفت جميع المنشآت الأخرى وأدوات المطور عن الموظفين.`,
      'success'
    );
  };

  const handleUnlockDevice = () => {
    StorageService.setLockedBranchId(null);
    setLockedBranchIdState(null);
    onRefreshLocal();
    showNotice(
      'تم فك قفل الفرع على هذا الجهاز واستعادة وضع الأدمين العام متعدد المنشآت!',
      'info'
    );
  };

  useEffect(() => {
    const unsubAuth = CloudSyncService.subscribeAuth((user) => {
      setCloudUser(user);
      if (
        user?.email?.toLowerCase() === 'magwwad@gmail.com' &&
        !StorageService.isProductionBranchLocked()
      ) {
        setPinVerified(true);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!cloudUser) {
      setCloudDocs([]);
      return;
    }
    const unsubDocs = CloudSyncService.subscribeCloudBusinesses(
      (docs) => {
        const sorted = [...docs].sort((a, b) =>
          a.businessName.localeCompare(b.businessName, 'ar')
        );
        setCloudDocs(sorted);
        if (!selectedBizId && sorted.length > 0) {
          setSelectedBizId(sorted[0].businessId);
        }
      },
      (err) => {
        showNotice(`تنبيه قراءة السحابة: ${err.message}`, 'error');
      }
    );
    return () => unsubDocs();
  }, [cloudUser, selectedBizId]);

  // Whenever selectedBizId changes (or cloudDocs updates when no unsaved changes exist), load its bundle into draftBundle
  const selectedCloudDoc =
    cloudDocs.find((d) => d.businessId === selectedBizId) || cloudDocs[0] || null;

  useEffect(() => {
    if (selectedCloudDoc && !hasUnsavedChanges) {
      setDraftBundle(JSON.parse(JSON.stringify(selectedCloudDoc.bundle)));
    }
  }, [selectedCloudDoc, hasUnsavedChanges]);

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = StorageService.getSettings();
    if (
      pinInput.trim() === '1234' ||
      pinInput.trim() === (s.adminPin || '1234')
    ) {
      setPinVerified(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('رمز PIN غير صحيح. هذه البوابة للأدمين العام فقط (الرمز الماستر 1234).');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsBusy(true);
    try {
      const user = await CloudSyncService.signInWithGoogle();
      showNotice(`مرحباً بك في غرفة القيادة السحابية: ${user.email}`, 'success');
    } catch (err) {
      showNotice(
        err instanceof Error ? err.message : 'تعذر تسجيل الدخول بحساب Google',
        'error'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSyncAllLocalToCloud = async () => {
    if (!cloudUser) {
      showNotice('يرجى تسجيل الدخول بحساب Google أولاً لرفع الفروع للسحابة', 'error');
      return;
    }
    setIsBusy(true);
    try {
      const count = await CloudSyncService.syncAllLocalBusinessesToCloud();
      showNotice(`تم رفع ومزامنة (${count}) فروع إلى السحابة المركزية بنجاح!`, 'success');
    } catch (err) {
      showNotice(
        err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الفروع للسحابة',
        'error'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSeedAndPushSixBranches = async () => {
    if (!cloudUser) {
      showNotice('يرجى تسجيل الدخول بحساب Google أولاً لتجهيز ورفع الفروع الـ 6', 'error');
      return;
    }
    setIsBusy(true);
    try {
      const existing = StorageService.getBusinesses();
      const originalActiveId = StorageService.getActiveBusinessId();

      for (const preset of PRESET_SIX_BRANCHES) {
        const alreadyExists = existing.some(
          (b) => b.name === preset.name && b.branchName === preset.branchName
        );
        if (!alreadyExists) {
          StorageService.createNewBusiness({
            name: preset.name,
            branchName: preset.branchName,
            businessType: preset.businessType,
            currency: 'ج.م',
            phone: preset.phone,
            address: preset.address,
            ownerName: 'الأدمين العام (المالك)',
            initialCapitalMinor: 25000000,
          });
          StorageService.loadMockDemoData(preset.businessType);
          const s = StorageService.getSettings();
          StorageService.saveSettings({
            ...s,
            restaurantName: preset.name,
            branchName: preset.branchName,
            businessType: preset.businessType,
            phone: preset.phone,
            address: preset.address,
          });
        }
      }

      if (originalActiveId) {
        StorageService.switchBusiness(originalActiveId);
      }
      onRefreshLocal();

      const syncedCount = await CloudSyncService.syncAllLocalBusinessesToCloud();
      showNotice(
        `تم تجهيز الفروع الـ 6 بالكامل ورفع (${syncedCount}) منشآت إلى غرفة القيادة السحابية!`,
        'success'
      );
    } catch (err) {
      showNotice(
        err instanceof Error ? err.message : 'تعذر تجهيز ورفع الفروع الـ 6',
        'error'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handlePushRemoteChanges = async () => {
    if (!selectedCloudDoc || !draftBundle) return;
    setIsBusy(true);
    try {
      await CloudSyncService.updateRemoteBranchBundle(selectedCloudDoc, draftBundle);
      setHasUnsavedChanges(false);
      onRefreshLocal();
      showNotice(
        `تم حفظ وإرسال التعديلات عن بُعد إلى «${draftBundle.settings.restaurantName} - ${draftBundle.settings.branchName}» بنجاح!`,
        'success'
      );
    } catch (err) {
      showNotice(
        err instanceof Error ? err.message : 'تعذر إرسال التعديلات إلى الفرع في السحابة',
        'error'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handlePullBranchToLocalPOS = (docItem: CloudBusinessDoc) => {
    try {
      CloudSyncService.restoreCloudBusinessToLocal(docItem, true);
      onRefreshLocal();
      showNotice(
        `تم سحب بيانات «${docItem.businessName} - ${docItem.branchName}» وتفعيلها على هذا الجهاز بنجاح!`,
        'success'
      );
    } catch (err) {
      showNotice(
        err instanceof Error ? err.message : 'تعذر سحب الفرع لهذا الجهاز',
        'error'
      );
    }
  };

  const handleCopyDirectAdminLink = () => {
    const base = getProductionBaseUrl().replace(/\/$/, '');
    const url = `${base}/?mode=remote-admin`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
    showNotice('تم نسخ رابط الإنتاج المستقل لغرفة قيادة الأدمين العام (بدون AI Studio)!', 'info');
  };

  // Consolidated KPIs across all cloud branches
  const consolidatedStats = cloudDocs.reduce(
    (acc, docItem) => {
      const b = docItem.bundle;
      const openShift = (b?.shifts || []).find((s) => s.status === 'open');
      const drawerCash = openShift ? calculateRemoteShiftDrawer(b, openShift).expectedCashInDrawer : 0;
      const lowStockCount = (b?.inventory || []).filter(
        (i) => i.currentStock <= i.minStockAlert
      ).length;
      const customerDebt = (b?.customers || []).reduce(
        (s, c) => s + (c.currentDebt || 0),
        0
      );
      const supplierDebt = (b?.suppliers || []).reduce(
        (s, sup) => s + (sup.creditBalance || 0),
        0
      );

      return {
        totalRevenueMinor: acc.totalRevenueMinor + (docItem.totalRevenueMinor || 0),
        totalOrders: acc.totalOrders + (docItem.ordersCount || 0),
        openShifts: acc.openShifts + (openShift ? 1 : 0),
        totalDrawerCashMinor: acc.totalDrawerCashMinor + drawerCash,
        totalLowStockAlerts: acc.totalLowStockAlerts + lowStockCount,
        totalCustomerDebtMinor: acc.totalCustomerDebtMinor + customerDebt,
        totalSupplierDebtMinor: acc.totalSupplierDebtMinor + supplierDebt,
      };
    },
    {
      totalRevenueMinor: 0,
      totalOrders: 0,
      openShifts: 0,
      totalDrawerCashMinor: 0,
      totalLowStockAlerts: 0,
      totalCustomerDebtMinor: 0,
      totalSupplierDebtMinor: 0,
    }
  );

  // Helpers to mutate draftBundle cleanly
  const updateDraftMenuPrice = (itemId: string, newPriceMajor: number) => {
    if (!draftBundle) return;
    const priceMinor = Math.max(0, Math.round(newPriceMajor * 100));
    const updatedMenu: MenuItem[] = (draftBundle.menuItems || []).map((m) =>
      m.id === itemId ? { ...m, sellingPrice: priceMinor } : m
    );
    setDraftBundle({ ...draftBundle, menuItems: updatedMenu });
    setHasUnsavedChanges(true);
  };

  const toggleDraftMenuActive = (itemId: string) => {
    if (!draftBundle) return;
    const updatedMenu: MenuItem[] = (draftBundle.menuItems || []).map((m) =>
      m.id === itemId ? { ...m, active: m.active === false ? true : false } : m
    );
    setDraftBundle({ ...draftBundle, menuItems: updatedMenu });
    setHasUnsavedChanges(true);
  };

  const updateDraftInventoryItem = (
    itemId: string,
    field: 'currentStock' | 'salePriceMajor' | 'unitCostMajor',
    val: number
  ) => {
    if (!draftBundle) return;
    const updatedInv: InventoryItem[] = (draftBundle.inventory || []).map((inv) => {
      if (inv.id !== itemId) return inv;
      if (field === 'currentStock') {
        return { ...inv, currentStock: Math.max(0, val) };
      }
      if (field === 'salePriceMajor') {
        return { ...inv, salePrice: Math.max(0, Math.round(val * 100)) };
      }
      return { ...inv, unitCost: Math.max(0, Math.round(val * 100)) };
    });
    setDraftBundle({ ...draftBundle, inventory: updatedInv });
    setHasUnsavedChanges(true);
  };

  const updateDraftUserPinOrLimit = (
    userId: string,
    field: 'pin' | 'maxExpenseMajor' | 'isActive',
    value: string | number | boolean
  ) => {
    if (!draftBundle) return;
    const updatedUsers: AppUser[] = (draftBundle.users || []).map((u) => {
      if (u.id !== userId) return u;
      if (field === 'pin') {
        return { ...u, pin: String(value).slice(0, 8) };
      }
      if (field === 'maxExpenseMajor') {
        return {
          ...u,
          maxExpenseLimitMinor: Math.max(0, Math.round(Number(value) * 100)),
        };
      }
      return { ...u, isActive: Boolean(value) };
    });
    setDraftBundle({ ...draftBundle, users: updatedUsers });
    setHasUnsavedChanges(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-7xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 max-h-[96vh] flex flex-col">
        {!pinVerified ? (
          <div className="py-14 text-center max-w-md mx-auto space-y-5">
            <div className="inline-flex p-4 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-2xl">
              <Globe className="w-11 h-11 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-1">
                غرفة القيادة المركزية للإدارة عن بُعد (Super Admin)
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                هذه البوابة مخصصة للمالك والأدمين العام لمراقبة وإدارة كافة المطاعم والمحلات
                والفروع عن بُعد عبر السحابة. أدخل الرمز السري الماستر (1234) أو سجل الدخول بحساب الأدمين.
              </p>
            </div>

            {pinError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold">
                {pinError}
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={8}
                autoFocus
                required
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-48 mx-auto block text-center bg-slate-950 border border-slate-700 rounded-xl py-3 text-2xl font-mono tracking-widest text-sky-400 focus:outline-hidden focus:border-sky-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                >
                  دخول غرفة القيادة عن بُعد
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* TOP COMMAND HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/15 text-sky-400 rounded-2xl border border-sky-500/30 relative">
                  <Globe className="w-6 h-6 stroke-[2.2]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white">
                      غرفة القيادة المركزية للأدمين العام (Remote Super Admin Portal)
                    </h2>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Radio className="w-3 h-3 text-emerald-400" />
                      <span>متصل بـ Firestore لحظياً</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    مراقبة المبيعات والخزائن والورديات وتعديل الأسعار والـ PIN لجميع الفروع عن بُعد من هاتفك أو حاسوبك الشخصي
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDirectAdminLink}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="انسخ رابط الدخول المباشر لفتحه من هاتفك أو اللابتوب في أي وقت"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">تم نسخ رابط الأدمين المباشر</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>نسخ رابط الموبايل المباشر</span>
                    </>
                  )}
                </button>

                {cloudUser ? (
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-mono text-sky-300 font-bold">
                      {cloudUser.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => CloudSyncService.signOutCloud()}
                      className="text-rose-400 hover:text-rose-300 mr-1 cursor-pointer"
                      title="تسجيل الخروج السحابي"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>تسجيل دخول الأدمين (Google)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                  title="العودة لشاشة البرنامج"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PRODUCTION BRANCH LOCK BANNER */}
            <div className="mb-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                {lockedBranchId ? (
                  <div className="p-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl">
                    <Lock className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-xl">
                    <Unlock className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <span className="font-black text-white block">
                    {lockedBranchId
                      ? `وضع الإنتاج المقفل نشط على هذا الجهاز (Branch Lock: ${lockedBranchId})`
                      : 'هذا الجهاز في وضع الأدمين العام المفتوح (يرى كل المنشآت الـ 6)'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {lockedBranchId
                      ? 'الموظفون على هذا الجهاز لا يرون أي فرع آخر ولا يرون أزرار تبديل الأنشطة أو أدوات المطور.'
                      : 'يمكنك نسخ «رابط الفرع المقفل» لأي محل بالأسفل، أو قفل هذا الجهاز على فرع واحد لتجربة وضع الإنتاج.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {lockedBranchId ? (
                  <button
                    type="button"
                    onClick={handleUnlockDevice}
                    className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>فك قفل الفرع (وضع الأدمين العام)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const activeId = StorageService.getActiveBusinessId();
                      StorageService.setLockedBranchId(activeId);
                      setLockedBranchIdState(activeId);
                      onRefreshLocal();
                      showNotice(
                        'تم تفعيل وضع قفل الإنتاج على الفرع الحالي! أغلق هذه النافذة لترى كيف يبدو النظام لموظفي الفرع.',
                        'success'
                      );
                    }}
                    className="py-1.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>قفل هذا الجهاز على الفرع الحالي فقط</span>
                  </button>
                )}
              </div>
            </div>

            {/* STATUS BANNER */}
            {feedback && (
              <div
                className={`mb-4 p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : feedback.type === 'error'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{feedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* NAVIGATION BAR BETWEEN CONSOLIDATED RADAR & SINGLE BRANCH REMOTE INSPECTOR */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMainTab('radar')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    mainTab === 'radar'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>1. الرادار المجمع لكل الفروع ({cloudDocs.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMainTab('inspector')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    mainTab === 'inspector'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>
                    2. الفحص والتحكم عن بُعد في فرع محدد
                    {selectedCloudDoc ? ` (${selectedCloudDoc.businessName})` : ''}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSeedAndPushSixBranches}
                  disabled={isBusy || !cloudUser}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تجهيز ورفع الفروع الـ 6 للسحابة</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncAllLocalToCloud}
                  disabled={isBusy || !cloudUser}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>مزامنة الفروع المحلية الآن</span>
                </button>
              </div>
            </div>

            {/* BODY CONTENT */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-5">
              {!cloudUser ? (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-10 text-center max-w-lg mx-auto my-8 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
                    <Cloud className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-white">
                    سجل الدخول بحساب الأدمين العام لعرض بيانات الفروع السحابية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    بمجرد تسجيل الدخول بحساب Google المالك (`magwwad@gmail.com`)، ستظهر لك كافة
                    المطاعم والمحلات المتصلة بالسحابة لحظياً مع إمكانية تعديل الأسعار والأصناف
                    ورموز PIN عن بُعد.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isBusy}
                    className="py-3 px-6 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول بحساب Google الآن</span>
                  </button>
                </div>
              ) : mainTab === 'radar' ? (
                <>
                  {/* CONSOLIDATED KPI STRIP ACROSS ALL SHOPS */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>إجمالي الفروع بالسحابة</span>
                        <Building2 className="w-4 h-4 text-sky-400" />
                      </div>
                      <strong className="text-lg font-black font-mono text-white">
                        {cloudDocs.length} فروع
                      </strong>
                      <span className="block text-[10px] text-emerald-400 mt-0.5">
                        {consolidatedStats.openShifts} وردية مفتوحة الآن
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>إجمالي مبيعات كل الفروع</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <strong className="text-lg font-black font-mono text-emerald-400">
                        {formatCurrency(consolidatedStats.totalRevenueMinor, 'ج.م')}
                      </strong>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        عبر {consolidatedStats.totalOrders} فاتورة مبيعات
                      </span>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold mb-1">
                        <span>النقدية بالدرج الآن (مجمع)</span>
                        <Wallet className="w-4 h-4 text-amber-400" />
                      </div>
                      <strong className="text-lg font-black font-mono text-amber-400">
                        {formatCurrency(consolidatedStats.totalDrawerCashMinor, 'ج.م')}
                      </strong>
                      <span className="block text-[10px] text-amber-200/80 mt-0.5">
                        في الورديات المفتوحة حالياً
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>مديونيات العملاء (لنا)</span>
                        <CreditCard className="w-4 h-4 text-purple-400" />
                      </div>
                      <strong className="text-lg font-black font-mono text-purple-400">
                        {formatCurrency(consolidatedStats.totalCustomerDebtMinor, 'ج.م')}
                      </strong>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        إجمالي الآجل بجميع الفروع
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>مستحقات الموردين (علينا)</span>
                        <Truck className="w-4 h-4 text-rose-400" />
                      </div>
                      <strong className="text-lg font-black font-mono text-rose-400">
                        {formatCurrency(consolidatedStats.totalSupplierDebtMinor, 'ج.م')}
                      </strong>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        إجمالي ذمم الموردين
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>نواقص المخزون الحرجة</span>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      </div>
                      <strong className="text-lg font-black font-mono text-amber-400">
                        {consolidatedStats.totalLowStockAlerts} صنف
                      </strong>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        تحت حد الطلب عبر الفروع
                      </span>
                    </div>
                  </div>

                  {/* ALL BRANCHES GRID */}
                  {cloudDocs.length === 0 ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                      <p className="text-sm font-bold text-slate-300">
                        لا توجد فروع مرفوعة على السحابة حتى الآن.
                      </p>
                      <p className="text-xs text-slate-400">
                        اضغط على زر «تجهيز ورفع الفروع الـ 6 للسحابة» بالأعلى لإنشاء ومزامنة الـ 6
                        فروع (المطعمين بفرعيهما + السوبر ماركت + محل الملابس + الصيدلية) دفعة واحدة!
                      </p>
                      <button
                        type="button"
                        onClick={handleSeedAndPushSixBranches}
                        disabled={isBusy}
                        className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>تجهيز ورفع الفروع الـ 6 للسحابة الآن</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cloudDocs.map((docItem) => {
                        const b = docItem.bundle;
                        const isRest = docItem.businessType === 'restaurant';
                        const openShift = (b?.shifts || []).find((s) => s.status === 'open');
                        const shiftCalc = openShift
                          ? calculateRemoteShiftDrawer(b, openShift)
                          : null;
                        const lowStock = (b?.inventory || []).filter(
                          (i) => i.currentStock <= i.minStockAlert
                        );
                        const menuCount = (b?.menuItems || []).length;

                        return (
                          <div
                            key={docItem.businessId}
                            className="bg-slate-950 border border-slate-800 hover:border-sky-500/40 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all shadow-md"
                          >
                            <div className="space-y-3">
                              {/* Branch Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`p-2.5 rounded-xl border ${
                                      isRest
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                        : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                                    }`}
                                  >
                                    {isRest ? (
                                      <UtensilsCrossed className="w-5 h-5" />
                                    ) : (
                                      <Store className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-black text-white">
                                      {docItem.businessName}
                                    </h3>
                                    <span className="text-xs text-slate-400 block">
                                      {docItem.branchName}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                    openShift
                                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                      : 'bg-slate-900 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  {openShift
                                    ? `وردية #${openShift.shiftNumber} نشطة`
                                    : 'الوردية مغلقة'}
                                </span>
                              </div>

                              {/* Live Metrics Box */}
                              <div className="grid grid-cols-2 gap-2 bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">
                                    إجمالي المبيعات المعتمدة
                                  </span>
                                  <strong className="font-mono font-black text-emerald-400 text-sm">
                                    {formatCurrency(
                                      docItem.totalRevenueMinor,
                                      docItem.currency
                                    )}
                                  </strong>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-400 block">
                                    النقدية بالدرج الآن
                                  </span>
                                  <strong className="font-mono font-black text-amber-400 text-sm">
                                    {shiftCalc
                                      ? formatCurrency(
                                          shiftCalc.expectedCashInDrawer,
                                          docItem.currency
                                        )
                                      : '0.00 ج.م'}
                                  </strong>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-400 block">
                                    عدد الفواتير والأصناف
                                  </span>
                                  <strong className="font-mono font-bold text-white text-xs">
                                    {docItem.ordersCount} فاتورة · {menuCount + docItem.inventoryItemsCount} صنف
                                  </strong>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-400 block">
                                    تنبيهات نواقص المخزن
                                  </span>
                                  <strong
                                    className={`font-mono font-bold text-xs ${
                                      lowStock.length > 0
                                        ? 'text-rose-400'
                                        : 'text-emerald-400'
                                    }`}
                                  >
                                    {lowStock.length > 0
                                      ? `${lowStock.length} أصناف ناقصة`
                                      : 'المخزون آمن'}
                                  </strong>
                                </div>
                              </div>

                              {openShift && (
                                <div className="flex items-center justify-between text-[11px] bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
                                  <span className="text-slate-400">
                                    الكاشير المستلم:{' '}
                                    <strong className="text-white">
                                      {openShift.cashierName}
                                    </strong>
                                  </span>
                                  <span className="font-mono text-slate-400">
                                    فتحت: {openShift.openedAt}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Card Footer Actions */}
                            <div className="space-y-2 pt-2 border-t border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedBizId(docItem.businessId);
                                    setHasUnsavedChanges(false);
                                    setDraftBundle(
                                      JSON.parse(JSON.stringify(docItem.bundle))
                                    );
                                    setMainTab('inspector');
                                  }}
                                  className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>فحص وتحكم عن بُعد</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handlePullBranchToLocalPOS(docItem)}
                                  className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="سحب بيانات هذا الفرع وتشغيلها محلياً على هذا الجهاز"
                                >
                                  <CloudDownload className="w-3.5 h-3.5 text-amber-400" />
                                  <span>تشغيل هنا</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopyLockedBranchUrl(docItem)}
                                  className="flex-1 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                  title="انسخ رابط الإنتاج المستقل والمقفل على هذا الفرع فقط لإرساله لمدير الفرع أو الكاشير"
                                >
                                  {copiedBranchLinkId === docItem.businessId ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-300">تم نسخ رابط الفرع المقفل</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                                      <span>رابط الإنتاج المقفل للفرع</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleLockDeviceToBranch(docItem)}
                                  className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                                    lockedBranchId === docItem.businessId
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                                  }`}
                                  title="قفل هذا الجهاز ليعمل على هذا الفرع فقط (وضع الإنتاج)"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>
                                    {lockedBranchId === docItem.businessId ? 'مقفل عليه' : 'قفل الجهاز'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* TAB 2: REMOTE BRANCH INSPECTOR & LIVE CONTROLLER */
                selectedCloudDoc &&
                draftBundle && (
                  <div className="space-y-4">
                    {/* Branch Selector & Remote Push Bar */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-xs font-bold text-slate-400">
                          الفرع قيد الفحص والتحكم عن بُعد:
                        </label>
                        <select
                          value={selectedCloudDoc.businessId}
                          onChange={(e) => {
                            setSelectedBizId(e.target.value);
                            setHasUnsavedChanges(false);
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-amber-300"
                        >
                          {cloudDocs.map((d) => (
                            <option key={d.businessId} value={d.businessId}>
                              {d.businessName} — {d.branchName} (
                              {d.businessType === 'restaurant' ? 'مطعم' : 'تجزئة'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasUnsavedChanges && (
                          <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold animate-pulse">
                            يوجد تعديلات غير محفوظة لهذا الفرع
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handlePushRemoteChanges}
                          disabled={isBusy}
                          className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            hasUnsavedChanges
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Save className="w-4 h-4" />
                          <span>حفظ وإرسال التعديلات للفرع عبر السحابة</span>
                        </button>
                      </div>
                    </div>

                    {/* Inspector Sub-Tabs */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
                      <button
                        type="button"
                        onClick={() => setInspectorTab('live_shift')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          inspectorTab === 'live_shift'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>
                          الخزينة والوردية والفواتير (
                          {(draftBundle.saleOrders || []).length})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectorTab('menu_inventory')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          inspectorTab === 'menu_inventory'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>تعديل الأسعار والمنيو والمخزون عن بُعد</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectorTab('pins_settings')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          inspectorTab === 'pins_settings'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>إدارة رموز PIN والصلاحيات وإعدادات الفرع</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectorTab('debts')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          inspectorTab === 'debts'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>مديونيات العملاء والموردين بالفرع</span>
                      </button>
                    </div>

                    {/* SUB-TAB 1: LIVE SHIFT, CASH DRAWER, INVOICES & VOUCHERS */}
                    {inspectorTab === 'live_shift' && (
                      <div className="space-y-4">
                        {(() => {
                          const openShift = (draftBundle.shifts || []).find(
                            (s) => s.status === 'open'
                          );
                          const calc = openShift
                            ? calculateRemoteShiftDrawer(draftBundle, openShift)
                            : null;
                          return (
                            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-white">
                                  حالة الخزينة والوردية الحالية في ({draftBundle.settings.branchName})
                                </h4>
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                    openShift
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}
                                >
                                  {openShift
                                    ? `وردية مفتوحة #${openShift.shiftNumber} — الكاشير: ${openShift.cashierName}`
                                    : 'لا توجد وردية مفتوحة حالياً في هذا الفرع'}
                                </span>
                              </div>

                              {calc && (
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                    <span className="text-slate-400 block text-[11px]">
                                      عهدة بداية الوردية
                                    </span>
                                    <strong className="font-mono text-white text-sm">
                                      {formatCurrency(
                                        calc.openingCustody,
                                        draftBundle.settings.currency
                                      )}
                                    </strong>
                                  </div>
                                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                    <span className="text-slate-400 block text-[11px]">
                                      مبيعات الكاش النقدية
                                    </span>
                                    <strong className="font-mono text-emerald-400 text-sm">
                                      {formatCurrency(
                                        calc.cashSales,
                                        draftBundle.settings.currency
                                      )}
                                    </strong>
                                  </div>
                                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                    <span className="text-slate-400 block text-[11px]">
                                      إلكتروني (فيزا / محفظة)
                                    </span>
                                    <strong className="font-mono text-sky-400 text-sm">
                                      {formatCurrency(
                                        calc.electronicSales,
                                        draftBundle.settings.currency
                                      )}
                                    </strong>
                                  </div>
                                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                    <span className="text-slate-400 block text-[11px]">
                                      مصروفات وسندات صرف
                                    </span>
                                    <strong className="font-mono text-rose-400 text-sm">
                                      {formatCurrency(
                                        calc.totalExpenses,
                                        draftBundle.settings.currency
                                      )}
                                    </strong>
                                  </div>
                                  <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                                    <span className="text-amber-300 font-bold block text-[11px]">
                                      المتوقع بالدرج الآن
                                    </span>
                                    <strong className="font-mono text-amber-400 text-base font-black">
                                      {formatCurrency(
                                        calc.expectedCashInDrawer,
                                        draftBundle.settings.currency
                                      )}
                                    </strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Recent Invoices & Vouchers Side by Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Recent Sale Orders */}
                          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                            <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                              <ShoppingBag className="w-4 h-4" />
                              <span>
                                أحدث فواتير المبيعات بالفرع (
                                {(draftBundle.saleOrders || []).length})
                              </span>
                            </h4>
                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/70 text-xs">
                              {(draftBundle.saleOrders || []).slice(0, 25).map((ord) => (
                                <div
                                  key={ord.id}
                                  className="py-2.5 flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-amber-300">
                                        {ord.orderNumber}
                                      </span>
                                      <span className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                        {getPaymentMethodLabel(ord.paymentMethod)}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {ord.date} {ord.time}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {ord.lines
                                        .map((l) => `${l.menuItemName} ×${l.qty}`)
                                        .join(' ، ')}
                                    </p>
                                  </div>
                                  <strong className="font-mono font-black text-emerald-400 shrink-0">
                                    {formatCurrency(
                                      ord.totalAmount,
                                      draftBundle.settings.currency
                                    )}
                                  </strong>
                                </div>
                              ))}
                              {(draftBundle.saleOrders || []).length === 0 && (
                                <p className="text-slate-500 py-6 text-center">
                                  لا توجد فواتير مسجلة في هذا الفرع بعد
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Recent Vouchers */}
                          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                            <h4 className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                              <Receipt className="w-4 h-4" />
                              <span>
                                أحدث سندات الخزينة والمصروفات (
                                {(draftBundle.vouchers || []).length})
                              </span>
                            </h4>
                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/70 text-xs">
                              {(draftBundle.vouchers || []).slice(0, 25).map((v) => (
                                <div
                                  key={v.id}
                                  className="py-2.5 flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-sky-300">
                                        {v.voucherNumber}
                                      </span>
                                      <span className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                        {getVoucherTypeLabel(v.type)}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {v.recipient} — {v.description}
                                    </p>
                                  </div>
                                  <strong className="font-mono font-black text-white shrink-0">
                                    {formatCurrency(
                                      v.amount,
                                      draftBundle.settings.currency
                                    )}
                                  </strong>
                                </div>
                              ))}
                              {(draftBundle.vouchers || []).length === 0 && (
                                <p className="text-slate-500 py-6 text-center">
                                  لا توجد سندات مسجلة في هذا الفرع بعد
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 2: REMOTE MENU & INVENTORY PRICE / STOCK EDITOR */}
                    {inspectorTab === 'menu_inventory' && (
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-black text-white">
                              تعديل أسعار الأصناف وأرصدة المخزون عن بُعد ({draftBundle.settings.branchName})
                            </h4>
                            <p className="text-xs text-slate-400">
                              أي تعديل في السعر أو الرصيد هنا يمكنك حفظه وإرساله فوراً للفرع عبر السحابة بضغطة زر
                            </p>
                          </div>

                          <div className="relative w-64">
                            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={itemSearch}
                              onChange={(e) => setItemSearch(e.target.value)}
                              placeholder="بحث باسم الصنف أو الكود..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white"
                            />
                          </div>
                        </div>

                        {/* Restaurant Menu Items Table (if restaurant) */}
                        {draftBundle.settings.businessType === 'restaurant' && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-black text-amber-400">
                              أصناف المنيو والوجبات ({(draftBundle.menuItems || []).length})
                            </h5>
                            <div className="overflow-x-auto max-h-64">
                              <table className="w-full text-right text-xs">
                                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                                  <tr>
                                    <th className="py-2.5 px-3">الكود</th>
                                    <th className="py-2.5 px-3">اسم الصنف</th>
                                    <th className="py-2.5 px-3">القسم</th>
                                    <th className="py-2.5 px-3">سعر البيع ({draftBundle.settings.currency})</th>
                                    <th className="py-2.5 px-3">الحالة بالفرع</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                  {(draftBundle.menuItems || [])
                                    .filter(
                                      (m) =>
                                        !itemSearch.trim() ||
                                        m.name.includes(itemSearch) ||
                                        m.code.includes(itemSearch)
                                    )
                                    .map((item) => (
                                      <tr key={item.id} className="hover:bg-slate-900/50">
                                        <td className="py-2 px-3 font-mono text-amber-400">
                                          {item.code}
                                        </td>
                                        <td className="py-2 px-3 font-bold text-white">
                                          {item.name}
                                        </td>
                                        <td className="py-2 px-3 text-slate-400">
                                          {item.category}
                                        </td>
                                        <td className="py-2 px-3">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={Number((item.sellingPrice / 100).toFixed(2))}
                                            onChange={(e) =>
                                              updateDraftMenuPrice(
                                                item.id,
                                                Number(e.target.value)
                                              )
                                            }
                                            className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 font-mono font-bold text-emerald-400"
                                          />
                                        </td>
                                        <td className="py-2 px-3">
                                          <button
                                            type="button"
                                            onClick={() => toggleDraftMenuActive(item.id)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                                              item.active !== false
                                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                            }`}
                                          >
                                            {item.active !== false ? 'متاح للبيع' : 'موقوف مؤقتاً'}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Inventory Items Table */}
                        <div className="space-y-2 pt-2">
                          <h5 className="text-xs font-black text-sky-400">
                            أصناف المخزن والمنتجات ({(draftBundle.inventory || []).length})
                          </h5>
                          <div className="overflow-x-auto max-h-72">
                            <table className="w-full text-right text-xs">
                              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                                <tr>
                                  <th className="py-2.5 px-3">الكود</th>
                                  <th className="py-2.5 px-3">الصنف</th>
                                  <th className="py-2.5 px-3">الرصيد الحالي</th>
                                  <th className="py-2.5 px-3">تكلفة الوحدة</th>
                                  <th className="py-2.5 px-3">سعر البيع للجمهور</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {(draftBundle.inventory || [])
                                  .filter(
                                    (inv) =>
                                      !itemSearch.trim() ||
                                      inv.name.includes(itemSearch) ||
                                      inv.code.includes(itemSearch)
                                  )
                                  .map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-900/50">
                                      <td className="py-2 px-3 font-mono text-sky-400">
                                        {inv.code}
                                      </td>
                                      <td className="py-2 px-3 font-bold text-white">
                                        {inv.name}{' '}
                                        <span className="text-[10px] text-slate-400">
                                          ({inv.unit})
                                        </span>
                                      </td>
                                      <td className="py-2 px-3">
                                        <input
                                          type="number"
                                          step="0.5"
                                          value={inv.currentStock}
                                          onChange={(e) =>
                                            updateDraftInventoryItem(
                                              inv.id,
                                              'currentStock',
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono font-bold text-white"
                                        />
                                      </td>
                                      <td className="py-2 px-3">
                                        <input
                                          type="number"
                                          step="0.5"
                                          value={Number((inv.unitCost / 100).toFixed(2))}
                                          onChange={(e) =>
                                            updateDraftInventoryItem(
                                              inv.id,
                                              'unitCostMajor',
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-slate-300"
                                        />
                                      </td>
                                      <td className="py-2 px-3">
                                        <input
                                          type="number"
                                          step="0.5"
                                          value={Number(
                                            ((inv.salePrice || inv.unitCost) / 100).toFixed(2)
                                          )}
                                          onChange={(e) =>
                                            updateDraftInventoryItem(
                                              inv.id,
                                              'salePriceMajor',
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono font-bold text-emerald-400"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 3: REMOTE PINs & BRANCH SETTINGS */}
                    {inspectorTab === 'pins_settings' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Staff PINs & Expense Limits */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-amber-400" />
                            <span>تعديل رموز PIN وسقف الصرف لموظفي الفرع عن بُعد</span>
                          </h4>
                          <div className="space-y-2.5">
                            {(draftBundle.users || []).map((u) => {
                              const perms = getRolePermissions(u.role, u.maxExpenseLimitMinor);
                              return (
                                <div
                                  key={u.id}
                                  className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                                >
                                  <div>
                                    <div className="font-black text-white">{u.name}</div>
                                    <span className="text-[11px] text-slate-400">
                                      {perms.labelAr}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-0.5">
                                        رمز الدخول PIN
                                      </label>
                                      <input
                                        type="text"
                                        maxLength={8}
                                        value={u.pin}
                                        onChange={(e) =>
                                          updateDraftUserPinOrLimit(
                                            u.id,
                                            'pin',
                                            e.target.value
                                          )
                                        }
                                        className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 font-mono font-black text-amber-400 text-center"
                                      />
                                    </div>

                                    {u.role === 'cashier' && (
                                      <div>
                                        <label className="text-[10px] text-slate-400 block mb-0.5">
                                          سقف الصرف المباشر
                                        </label>
                                        <input
                                          type="number"
                                          step="50"
                                          value={Math.round(
                                            (u.maxExpenseLimitMinor ?? 50000) / 100
                                          )}
                                          onChange={(e) =>
                                            updateDraftUserPinOrLimit(
                                              u.id,
                                              'maxExpenseMajor',
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 font-mono text-white"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Branch Settings & Receipt Message */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-sky-400" />
                            <span>إعدادات الفرع ورسالة الفاتورة المطبوعة</span>
                          </h4>

                          <div className="space-y-3">
                            <div>
                              <label className="text-slate-400 font-bold block mb-1">
                                اسم المنشأة:
                              </label>
                              <input
                                type="text"
                                value={draftBundle.settings.restaurantName}
                                onChange={(e) => {
                                  setDraftBundle({
                                    ...draftBundle,
                                    settings: {
                                      ...draftBundle.settings,
                                      restaurantName: e.target.value,
                                    },
                                  });
                                  setHasUnsavedChanges(true);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                              />
                            </div>

                            <div>
                              <label className="text-slate-400 font-bold block mb-1">
                                اسم الفرع:
                              </label>
                              <input
                                type="text"
                                value={draftBundle.settings.branchName}
                                onChange={(e) => {
                                  setDraftBundle({
                                    ...draftBundle,
                                    settings: {
                                      ...draftBundle.settings,
                                      branchName: e.target.value,
                                    },
                                  });
                                  setHasUnsavedChanges(true);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                              />
                            </div>

                            <div>
                              <label className="text-slate-400 font-bold block mb-1">
                                الرمز السري الماستر لبوابة إدارة الفرع (Admin PIN):
                              </label>
                              <input
                                type="text"
                                maxLength={8}
                                value={draftBundle.settings.adminPin || '1234'}
                                onChange={(e) => {
                                  setDraftBundle({
                                    ...draftBundle,
                                    settings: {
                                      ...draftBundle.settings,
                                      adminPin: e.target.value,
                                    },
                                  });
                                  setHasUnsavedChanges(true);
                                }}
                                className="w-40 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-mono font-black text-amber-400"
                              />
                            </div>

                            <div>
                              <label className="text-slate-400 font-bold block mb-1">
                                رسالة أسفل الفاتورة المطبوعة (إعلان أو عرض ترويجي للعملاء):
                              </label>
                              <input
                                type="text"
                                value={draftBundle.settings.footerNote}
                                onChange={(e) => {
                                  setDraftBundle({
                                    ...draftBundle,
                                    settings: {
                                      ...draftBundle.settings,
                                      footerNote: e.target.value,
                                    },
                                  });
                                  setHasUnsavedChanges(true);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 4: CUSTOMERS & SUPPLIERS CREDIT LEDGER */}
                    {inspectorTab === 'debts' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                          <h4 className="text-sm font-black text-purple-400">
                            حسابات ومديونيات العملاء الآجل ({(draftBundle.customers || []).length})
                          </h4>
                          <div className="divide-y divide-slate-800/70 max-h-72 overflow-y-auto">
                            {(draftBundle.customers || []).map((c) => (
                              <div
                                key={c.id}
                                className="py-2.5 flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-bold text-white">{c.name}</div>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {c.phone}
                                  </span>
                                </div>
                                <strong className="font-mono font-black text-purple-400">
                                  {formatCurrency(
                                    c.currentDebt,
                                    draftBundle.settings.currency
                                  )}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                          <h4 className="text-sm font-black text-rose-400">
                            أرصدة ومستحقات الموردين ({(draftBundle.suppliers || []).length})
                          </h4>
                          <div className="divide-y divide-slate-800/70 max-h-72 overflow-y-auto">
                            {(draftBundle.suppliers || []).map((s) => (
                              <div
                                key={s.id}
                                className="py-2.5 flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-bold text-white">{s.name}</div>
                                  <span className="text-[11px] text-slate-400">
                                    {s.supplyCategory} · {s.phone}
                                  </span>
                                </div>
                                <strong className="font-mono font-black text-rose-400">
                                  {formatCurrency(
                                    s.creditBalance,
                                    draftBundle.settings.currency
                                  )}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
