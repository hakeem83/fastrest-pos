import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { AppUser, RestaurantSettings } from '../types';
import { formatCurrency, getRolePermissions, StorageService } from '../services/storage';
import { CloudBusinessDoc, CloudSyncService } from '../services/firebaseSync';
import {
  Building2,
  Check,
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';

interface Props {
  settings: RestaurantSettings;
  users: AppUser[];
  onRefresh: () => void;
}

const PRESET_FIVE_SHOPS: Array<{
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

export const CloudSyncAndCredentialsVault: React.FC<Props> = ({
  settings,
  users,
  onRefresh,
}) => {
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudDocs, setCloudDocs] = useState<CloudBusinessDoc[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(() =>
    CloudSyncService.isAutoSyncEnabled()
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() =>
    CloudSyncService.getLastSyncTime()
  );
  const [showSecrets, setShowSecrets] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fbInfo = CloudSyncService.getFirebaseConfigInfo();
  const activeBusinessId = StorageService.getActiveBusinessId();
  const localBusinesses = StorageService.getBusinesses();

  useEffect(() => {
    const unsubAuth = CloudSyncService.subscribeAuth((user) => {
      setCloudUser(user);
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
        setCloudDocs(docs);
      },
      (err) => {
        setStatusMessage({
          type: 'error',
          text: `تنبيه من قاعدة البيانات السحابية: ${err.message}`,
        });
      }
    );
    return () => unsubDocs();
  }, [cloudUser]);

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGoogleSignIn = async () => {
    setStatusMessage(null);
    try {
      const user = await CloudSyncService.signInWithGoogle();
      setStatusMessage({
        type: 'success',
        text: `تم ربط الحساب السحابي بنجاح (${user.email})`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text:
          error instanceof Error
            ? `تعذر تسجيل الدخول السحابي: ${error.message}`
            : 'تعذر تسجيل الدخول السحابي',
      });
    }
  };

  const handleGoogleSignOut = async () => {
    await CloudSyncService.signOutCloud();
    setStatusMessage({
      type: 'info',
      text: 'تم تسجيل الخروج من السحابة. النظام يعمل محلياً كالمعتاد.',
    });
  };

  const handleSyncActiveNow = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const synced = await CloudSyncService.syncActiveBusinessToCloud();
      setLastSyncTime(CloudSyncService.getLastSyncTime());
      setStatusMessage({
        type: 'success',
        text: `تم رفع بيانات (${synced.businessName} - ${synced.branchName}) إلى السحابة بنجاح!`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'فشلت عملية المزامنة السحابية',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAllLocal = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const count = await CloudSyncService.syncAllLocalBusinessesToCloud();
      setLastSyncTime(CloudSyncService.getLastSyncTime());
      setStatusMessage({
        type: 'success',
        text: `تمت مزامنة ورفع جميع الفروع والمنشآت المحلية (${count} منشأة) إلى السحابة بنجاح!`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'فشلت مزامنة جميع الفروع',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreBranch = (docItem: CloudBusinessDoc) => {
    try {
      CloudSyncService.restoreCloudBusinessToLocal(docItem, true);
      onRefresh();
      setStatusMessage({
        type: 'success',
        text: `تم سحب وتفعيل بيانات (${docItem.businessName} - ${docItem.branchName}) على هذا الجهاز بنجاح!`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'تعذر استعادة الفرع من السحابة',
      });
    }
  };

  const handleDeleteCloudBranch = async (businessId: string) => {
    try {
      await CloudSyncService.deleteCloudBusiness(businessId);
      setConfirmDeleteId(null);
      setStatusMessage({
        type: 'info',
        text: 'تم حذف النسخة السحابية للفرع (البيانات المحلية لم تتأثر).',
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'تعذر الحذف من السحابة',
      });
    }
  };

  const handleToggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    CloudSyncService.setAutoSyncEnabled(next);
  };

  const handleCreatePresetFiveShops = () => {
    const currentBizId = StorageService.getActiveBusinessId();
    const existingList = StorageService.getBusinesses();
    let createdCount = 0;

    for (const preset of PRESET_FIVE_SHOPS) {
      const alreadyExists = existingList.some(
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
          ownerName: 'أ. محمد حكيم',
          ownerPhone: preset.phone,
        });
        createdCount++;
      }
    }

    // Switch back to the original business so we don't jar the user unexpectedly
    if (currentBizId) {
      StorageService.switchBusiness(currentBizId);
    }
    onRefresh();

    setStatusMessage({
      type: 'success',
      text:
        createdCount > 0
          ? `تم تجهيز وإنشاء (${createdCount}) فروع وأنشطة جديدة بنجاح (مطعم فرع 1 و2، مطعم 2، سوبرماركت، ملابس، صيدلية)! يمكنك التبديل بينها أو رفعها للسحابة.`
          : 'جميع الفروع والأنشطة الستة مجهزة وموجودة بالفعل في قائمة الأنشطة لديك!',
    });
  };

  const formatTimestamp = (ts: unknown): string => {
    if (!ts) return 'غير محدد';
    if (typeof ts === 'string') {
      return new Date(ts).toLocaleString('ar-EG');
    }
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate().toLocaleString('ar-EG');
    }
    return 'الآن';
  };

  return (
    <div className="space-y-6 text-right">
      {/* Status Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            إخفاء
          </button>
        </div>
      )}

      {/* SECTION 1: CLOUD SYNC DASHBOARD */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>مركز المزامنة السحابية للفروع (Firebase Cloud Firestore)</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                  Offline-First + Auto Cloud Sync
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                يعمل الكاشير محلياً بدون إنترنت 100%، وعند الاتصال يقوم بمزامنة الفروع والمبيعات والمخزون في قاعدة البيانات السحابية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cloudUser ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-right">
                  <div className="text-[11px] font-bold text-white">
                    {cloudUser.displayName || 'حساب الإدارة السحابي'}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    {cloudUser.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  className="mr-2 p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  title="تسجيل الخروج من السحابة"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول بحساب Google لتفعيل السحابة</span>
              </button>
            )}
          </div>
        </div>

        {/* Cloud Actions Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white mb-1 flex items-center justify-between">
                <span>مزامنة الفرع المفتوح حالياً</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {settings.restaurantName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                رفع نسخة فورية من مبيعات ومخزون وحسابات ({settings.branchName}) إلى السحابة.
              </p>
            </div>
            <button
              type="button"
              disabled={!cloudUser || isSyncing}
              onClick={handleSyncActiveNow}
              className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              <span>رفع الفرع الحالي للسحابة الآن</span>
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white mb-1 flex items-center justify-between">
                <span>مزامنة كل الأنشطة والفروع ({localBusinesses.length})</span>
                <span className="text-[10px] text-sky-400 font-bold">شامل كل المحلات</span>
              </div>
              <p className="text-[11px] text-slate-400">
                رفع جميع المنشآت المسجلة على هذا الجهاز دفعة واحدة إلى قاعدة البيانات السحابية.
              </p>
            </div>
            <button
              type="button"
              disabled={!cloudUser || isSyncing}
              onClick={handleSyncAllLocal}
              className="w-full py-2.5 px-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span>مزامنة جميع الفروع ({localBusinesses.length}) للسحابة</span>
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white mb-1 flex items-center justify-between">
                <span>تجهيز الأنشطة والفروع الـ 6 بضغطة واحدة</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                إنشاء هيكل (مطعم 1 بفرعيه + مطعم 2 + سوبرماركت + ملابس + صيدلية) جاهزة للعمل.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreatePresetFiveShops}
              className="w-full py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>إنشاء وتجهيز الفروع الـ 6 تلقائياً</span>
            </button>
          </div>
        </div>

        {/* Auto-sync toggle & last sync info */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={handleToggleAutoSync}
              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
            />
            <span className="font-semibold text-slate-200">
              تفعيل المزامنة التلقائية في الخلفية عند توفر الإنترنت
            </span>
          </label>
          <div>
            <span>آخر مزامنة سحابية: </span>
            <span className="font-mono text-amber-400">
              {lastSyncTime ? new Date(lastSyncTime).toLocaleString('ar-EG') : 'لم تتم المزامنة بعد'}
            </span>
          </div>
        </div>

        {/* Cloud Synced Branches Table */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-black text-slate-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <span>الفروع والأنشطة المحفوظة في السحابة حالياً ({cloudDocs.length})</span>
          </h4>

          {!cloudUser ? (
            <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400">
              قم بتسجيل الدخول بحساب Google أعلاه لعرض الفروع المحفوظة في السحابة أو استعادتها على أي جهاز.
            </div>
          ) : cloudDocs.length === 0 ? (
            <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400">
              لا توجد فروع مرفوعة في السحابة بعد. اضغط على «رفع الفرع الحالي للسحابة الآن» لحفظ أول نسخة سحابية.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cloudDocs.map((docItem) => {
                const isCurrent = docItem.businessId === activeBusinessId;
                return (
                  <div
                    key={docItem.businessId}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? 'bg-amber-500/5 border-amber-500/40'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg border ${
                            docItem.businessType === 'retail'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}
                        >
                          {docItem.businessType === 'retail' ? (
                            <Store className="w-4 h-4" />
                          ) : (
                            <UtensilsCrossed className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">
                              {docItem.businessName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-black">
                                الفرع النشط
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {docItem.branchName} ·{' '}
                            <span className="font-mono text-[10px] text-slate-500">
                              {docItem.businessId}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        {docItem.businessType === 'retail' ? 'محل تجزئة' : 'مطعم'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">إجمالي المبيعات</span>
                        <span className="font-black text-emerald-400">
                          {formatCurrency(docItem.totalRevenueMinor, docItem.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">عدد الفواتير</span>
                        <span className="font-bold text-white">{docItem.ordersCount} فاتورة</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">الأصناف بالمخزن</span>
                        <span className="font-bold text-amber-300">
                          {docItem.inventoryItemsCount} صنف
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-slate-400">
                      <span>آخر تحديث: {formatTimestamp(docItem.updatedAt)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRestoreBranch(docItem)}
                          className="py-1.5 px-2.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <CloudDownload className="w-3.5 h-3.5" />
                          <span>سحب وفتح الفرع</span>
                        </button>

                        {confirmDeleteId === docItem.businessId ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCloudBranch(docItem.businessId)}
                            className="py-1.5 px-2.5 bg-rose-600 text-white rounded-lg font-bold cursor-pointer"
                          >
                            تأكيد الحذف
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(docItem.businessId)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg cursor-pointer"
                            title="حذف النسخة من السحابة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: CREDENTIALS & SECRET KEYS VAULT */}
      <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                خزينة الكلمات السرية ومفاتيح الإدارة والربط السحابي (Master Credentials Vault)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                جميع أكواد الدخول السرية (PIN) ومفاتيح إدارة قاعدة البيانات السحابية ومستودع GitHub محفوظة هنا للرجوع إليها في أي وقت.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSecrets(!showSecrets)}
            className="py-2 px-3.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {showSecrets ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>إخفاء الكلمات السرية</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>إظهار جميع الكلمات السرية والمفاتيح</span>
              </>
            )}
          </button>
        </div>

        {/* 1. POS Users & Admin PIN Codes */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-amber-400 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>أولاً: رموز الدخول السرية (PIN) لبوابة الإدارة والمستخدمين</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {users.map((u) => {
              const perms = getRolePermissions(u.role, u.maxExpenseLimitMinor);
              return (
                <div
                  key={u.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{u.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-bold ${perms.badgeColor}`}
                    >
                      {perms.labelAr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-slate-400">رمز PIN السري:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-amber-400 tracking-widest">
                        {showSecrets ? u.pin : '••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(u.id, u.pin)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                        title="نسخ الرمز"
                      >
                        {copiedKey === u.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{u.notes}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-semibold">
                الرمز الرئيسي لبوابة الإدارة العليا (Master Admin Vault PIN):
              </span>
              <span className="font-mono font-black text-amber-400 text-sm">
                {showSecrets ? settings.adminPin || '1234' : '••••'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              رمز الطوارئ لإعادة الضبط وتصفير البيانات في أدوات المطور:{' '}
              <strong className="font-mono text-rose-400">1234</strong>
            </span>
          </div>
        </div>

        {/* 2. Cloud & GitHub Technical Keys */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black text-sky-400 flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>ثانياً: مفاتيح قاعدة البيانات السحابية (Firebase) ومستودع GitHub</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-slate-400 block text-[11px]">
                معرّف المشروع السحابي (Firebase Project ID)
              </span>
              <div className="flex items-center justify-between font-mono text-white bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                <span>{fbInfo.projectId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy('projectId', fbInfo.projectId)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  {copiedKey === 'projectId' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-slate-400 block text-[11px]">
                معرّف قاعدة البيانات (Firestore Database ID)
              </span>
              <div className="flex items-center justify-between font-mono text-white bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 overflow-x-auto">
                <span className="truncate ml-2">{fbInfo.firestoreDatabaseId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy('dbId', fbInfo.firestoreDatabaseId)}
                  className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                >
                  {copiedKey === 'dbId' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-slate-400 block text-[11px]">
                مفتاح الواجهة البرمجية السحابي (Firebase Web API Key)
              </span>
              <div className="flex items-center justify-between font-mono text-amber-300 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                <span className="truncate ml-2">
                  {showSecrets ? fbInfo.apiKeyFull : fbInfo.apiKeyMasked}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('apiKey', fbInfo.apiKeyFull)}
                  className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                >
                  {copiedKey === 'apiKey' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-slate-400 block text-[11px]">
                مستودع الكود المصدري (GitHub Repository)
              </span>
              <div className="flex items-center justify-between font-mono text-sky-300 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                <span className="truncate ml-2">https://github.com/hakeem83/fastrest-pos</span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy('github', 'https://github.com/hakeem83/fastrest-pos')
                  }
                  className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                >
                  {copiedKey === 'github' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-400">
            <span>
              البريد الإلكتروني المعتمد للمالك الأعلى (Super Admin Email):{' '}
              <strong className="text-white font-mono">magwwad@gmail.com</strong>
            </span>
            <a
              href={fbInfo.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold"
            >
              <span>فتح لوحة تحكم Firebase Firestore</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
