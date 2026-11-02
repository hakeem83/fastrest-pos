import React, { useRef, useState } from 'react';
import {
  BusinessSpecialtyProfile,
  BusinessType,
  RestaurantSettings,
  TenantBusiness,
} from '../types';
import { getSpecialtyProfileLabel, StorageService } from '../services/storage';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  FolderSync,
  Heart,
  Pill,
  PlusCircle,
  RotateCcw,
  Scissors,
  Share2,
  Shirt,
  Smartphone,
  Sparkles,
  Store,
  Trash2,
  Upload,
  UtensilsCrossed,
  Wrench,
  X,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: RestaurantSettings;
  onBusinessSwitched: () => void;
  onRestartOnboarding: () => void;
}

export const BusinessSwitcherModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSettings,
  onBusinessSwitched,
  onRestartOnboarding,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'backup'>('list');
  const [businesses, setBusinesses] = useState<TenantBusiness[]>(() =>
    StorageService.getBusinesses()
  );
  const activeBusinessId = StorageService.getActiveBusinessId();

  // New business form state
  const [newBizName, setNewBizName] = useState('');
  const [newBizBranch, setNewBizBranch] = useState('الفرع الرئيسي');
  const [newBizProfile, setNewBizProfile] = useState<BusinessSpecialtyProfile>('restaurant');
  const [newBizCurrency, setNewBizCurrency] = useState('ج.م');
  const [newBizPhone, setNewBizPhone] = useState('');
  const [newBizAddress, setNewBizAddress] = useState('');
  const [ownerName, setOwnerName] = useState('المالك / المدير العام');
  const [capitalMajor, setCapitalMajor] = useState<number>(100000); // 100,000 EGP

  const [feedbackMsg, setFeedbackMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSwitch = (bizId: string) => {
    if (bizId === activeBusinessId) {
      onClose();
      return;
    }
    const success = StorageService.switchBusiness(bizId);
    if (success) {
      showMsg('تم تبديل النشاط التجاري بنجاح وتحديث كافة السجلات');
      onBusinessSwitched();
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) {
      showMsg('يرجى كتابة اسم المنشأة أو المطعم', 'error');
      return;
    }

    try {
      const mappedType: BusinessType =
        newBizProfile === 'restaurant' ? 'restaurant' : 'retail';
      const created = StorageService.createNewBusiness({
        name: newBizName,
        branchName: newBizBranch,
        businessType: mappedType,
        specialtyProfile: newBizProfile,
        currency: newBizCurrency,
        phone: newBizPhone,
        address: newBizAddress,
        ownerName: ownerName.trim() || undefined,
        initialCapitalMinor: Math.round(Number(capitalMajor || 0) * 100),
      });

      setBusinesses(StorageService.getBusinesses());
      showMsg(`تم إنشاء وتفعيل «${created.name}» بنجاح كنشاط مستقل`);
      onBusinessSwitched();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch {
      showMsg('تعذر إنشاء المنشأة، يرجى المحاولة مرة أخرى', 'error');
    }
  };

  const handleDeleteBusiness = (bizId: string) => {
    if (businesses.length <= 1) {
      showMsg('لا يمكن حذف النشاط التجاري الوحيد في النظام', 'error');
      return;
    }
    const success = StorageService.deleteBusiness(bizId);
    if (success) {
      setBusinesses(StorageService.getBusinesses());
      setConfirmDeleteId(null);
      showMsg('تم حذف المنشأة والبيانات التابعة لها بنجاح');
      onBusinessSwitched();
    }
  };

  const handleExport = (bizId?: string) => {
    try {
      StorageService.exportBusinessBackupFile(bizId);
      showMsg('تم تصدير ملف النسخة الاحتياطية بنجاح بصيغة JSON');
    } catch {
      showMsg('حدث خطأ أثناء تصدير الملف', 'error');
    }
  };

  const handleCopyLink = async (bizId: string, bizName: string) => {
    try {
      const url = StorageService.getDirectBusinessUrl(bizId);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      showMsg(`✅ تم نسخ رابط «${bizName}» المباشر! يمكنك فتحه في أي متصفح`);
    } catch {
      showMsg('تعذر نسخ الرابط تلقائياً', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = StorageService.importBusinessBackupFile(text);
        setBusinesses(StorageService.getBusinesses());
        showMsg(`تم استيراد «${imported.name}» بنجاح وتفعيله كنشاط مستقل`);
        onBusinessSwitched();
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'ملف غير صالح، تأكد من استيراد ملف JSON سليم تم تصديره من FastRest';
        showMsg(msg, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Building2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  إدارة وتبديل المنشآت (Multi-Tenant System)
                </h2>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  فصل تام للبيانات
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تصفح المطاعم والفروع المستقلة أو أنشئ نشاطاً تجارياً جديداً دون التأثير على بياناتك الحالية.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>المنشآت المسجلة ({businesses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ إنشاء نشاط جديد</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderSync className="w-4 h-4" />
            <span>النسخ الاحتياطي والاستيراد</span>
          </button>
        </div>

        {/* Tab 1: Businesses List */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>اختر المطعم أو المنشأة للتبديل الفوري إليها:</span>
              <span className="text-[11px] font-mono text-amber-400">
                النشط حالياً: {currentSettings.restaurantName}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {businesses.map((biz) => {
                const isActive = biz.id === activeBusinessId;
                const isRestaurant = biz.businessType === 'restaurant';

                return (
                  <div
                    key={biz.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl border ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {isRestaurant ? (
                          <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
                        ) : (
                          <Store className="w-5 h-5 stroke-[2.2]" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white">{biz.name}</span>
                          {isActive && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              النشط حالياً
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            {biz.specialtyProfile
                              ? getSpecialtyProfileLabel(biz.specialtyProfile)
                              : isRestaurant
                              ? 'مطعم'
                              : 'تجزئة'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <span>{biz.branchName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-amber-400/90">{biz.currency}</span>
                          {biz.phone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{biz.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(biz.id, biz.name)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                          title="نسخ رابط مباشر لفتح هذا النشاط على كمبيوتر أو هاتف آخر"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExport(biz.id)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                          title="تصدير ملف نسخة احتياطية JSON لهذه المنشأة"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                      {businesses.length > 1 && (
                        <>
                          {confirmDeleteId === biz.id ? (
                            <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-800">
                              <button
                                type="button"
                                onClick={() => handleDeleteBusiness(biz.id)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black rounded-lg cursor-pointer"
                              >
                                تأكيد الحذف
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-1 text-slate-400 hover:text-white text-[11px] cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(biz.id)}
                              className="p-2 bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-900 rounded-xl text-xs transition-colors cursor-pointer"
                              title="حذف هذا النشاط التجاري"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}

                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => handleSwitch(biz.id)}
                          className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>تشغيل الآن</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 px-2 py-1 bg-slate-800/80 rounded-xl">
                          قيد التشغيل
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick action: Exit / restart onboarding for current */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                هل تريد إعادة ضبط بيانات المطعم الحالي من خلال المعالج؟
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRestartOnboarding();
                }}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تشغيل المعالج الأولي</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Create New Business */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateBusiness} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-2">
                تخصص النشاط التجاري والميزات التشغيلية المدمجة:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: 'restaurant',
                      label: 'مطعم ومشويات وكافيه',
                      sub: 'منيو ووصفات وKOT وطاولات',
                      icon: <UtensilsCrossed className="w-4 h-4" />,
                    },
                    {
                      id: 'supermarket',
                      label: 'سوبر ماركت وبقالة',
                      sub: 'ميزان إلكتروني وتعدد عبوات',
                      icon: <Store className="w-4 h-4" />,
                    },
                    {
                      id: 'pet_store',
                      label: 'مستلزمات حيوانات أليفة',
                      sub: 'بيع دراي فود فرط + سجل وتطعيمات',
                      icon: <Heart className="w-4 h-4" />,
                    },
                    {
                      id: 'apparel',
                      label: 'محل ملابس وأحذية',
                      sub: 'مصفوفة مقاسات وألوان للموديل',
                      icon: <Shirt className="w-4 h-4" />,
                    },
                    {
                      id: 'pharmacy',
                      label: 'صيدلية ومستلزمات طبية',
                      sub: 'بيع بالشريط + بدائل ومادة فعالة',
                      icon: <Pill className="w-4 h-4" />,
                    },
                    {
                      id: 'electronics',
                      label: 'موبايلات وإلكترونيات',
                      sub: 'سيريال IMEI + شهادة ضمان بالفاتورة',
                      icon: <Smartphone className="w-4 h-4" />,
                    },
                    {
                      id: 'service_center',
                      label: 'مركز صيانة وورش إصلاح',
                      sub: 'تذاكر صيانة + قطع غيار + عمولة فني',
                      icon: <Wrench className="w-4 h-4" />,
                    },
                    {
                      id: 'beauty_clinic',
                      label: 'بيوتي سنتر وعيادات تجميل',
                      sub: 'حجوزات جلسات + باقات مسبقة الدفع',
                      icon: <Scissors className="w-4 h-4" />,
                    },
                    {
                      id: 'laundry',
                      label: 'مغسلة ودراي كلين',
                      sub: 'استلام قطع بتاج + موعد تسليم وعربون',
                      icon: <Sparkles className="w-4 h-4" />,
                    },
                  ] as const
                ).map((prof) => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => setNewBizProfile(prof.id)}
                    className={`p-2.5 rounded-2xl border text-right space-y-1 transition-all cursor-pointer ${
                      newBizProfile === prof.id
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {prof.icon}
                    <div className="text-xs font-black text-white">{prof.label}</div>
                    <p className="text-[10px] text-slate-400">{prof.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  اسم المطعم / المنشأة الجديدة:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بيتزا وباستا روما"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">اسم الفرع:</label>
                <input
                  type="text"
                  value={newBizBranch}
                  onChange={(e) => setNewBizBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">العملة الرسمية:</label>
                <input
                  type="text"
                  value={newBizCurrency}
                  onChange={(e) => setNewBizCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">اسم المالك المؤسس:</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  رأس المال التأسيسي ({newBizCurrency}):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={capitalMajor}
                  onChange={(e) => setCapitalMajor(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">رقم الهاتف للتواصل:</label>
                <input
                  type="text"
                  value={newBizPhone}
                  onChange={(e) => setNewBizPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-300 block mb-1">العنوان والموقع:</label>
                <input
                  type="text"
                  value={newBizAddress}
                  onChange={(e) => setNewBizAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-amber-400 block">
                ملاحظة حول البيانات واستقلالية النشاط:
              </span>
              <p>
                سيتم حفظ المنشأة الحالية في الذاكرة المحلية كنشاط مستقل، وإنشاء منشأة جديدة تماماً
                بدليل حسابات ومستخدمين جدد وقائمة فواتير فارغة جاهزة للتشغيل.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="py-2.5 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>تأكيد إنشاء المنشأة والبدء فوراً</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Backup & Import */}
        {activeTab === 'backup' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm text-white">
                  تصدير نسخة احتياطية كاملة للمنشأة الحالية
                </h3>
              </div>
              <p className="text-slate-400 text-xs">
                احصل على ملف JSON متكامل يتضمن جميع الحسابات، فواتير المبيعات، سندات الخزينة،
                المخزون، الموردين، العملاء، وحسابات الشركاء والموظفين.
              </p>
              <button
                type="button"
                onClick={() => handleExport()}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف النسخة الاحتياطية ({currentSettings.restaurantName})</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-400" />
                <h3 className="font-black text-sm text-white">
                  استيراد منشأة من ملف خارجي (JSON)
                </h3>
              </div>
              <p className="text-slate-400 text-xs">
                قم برفع أي ملف تم تصديره سابقاً من جهاز آخر لإضافته فوراً إلى قائمة الأنشطة التجارية
                وتشغيله مباشرة.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="business-backup-file-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>اختيار ملف النسخة الاحتياطية (.json)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
