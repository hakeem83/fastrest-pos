import React, { useRef, useState } from 'react';
import {
  BusinessSpecialtyProfile,
  BusinessType,
  TenantBusiness,
} from '../types';
import { getSpecialtyProfileLabel, StorageService } from '../services/storage';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  FolderSync,
  Heart,
  HelpCircle,
  Laptop,
  MonitorDown,
  Pill,
  PlusCircle,
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
} from 'lucide-react';

interface Props {
  onRefresh: () => void;
  onBusinessSwitched: () => void;
  onRestartOnboarding: () => void;
  onOpenDesktopInstallModal?: () => void;
}

export const TenantsManager: React.FC<Props> = ({
  onRefresh,
  onBusinessSwitched,
  onRestartOnboarding,
  onOpenDesktopInstallModal,
}) => {
  const [businesses, setBusinesses] = useState<TenantBusiness[]>(() =>
    StorageService.getBusinesses()
  );
  const activeBusinessId = StorageService.getActiveBusinessId();
  const activeBusiness = StorageService.getActiveBusiness();

  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  // Form State
  const [newBizName, setNewBizName] = useState('');
  const [newBizBranch, setNewBizBranch] = useState('الفرع الرئيسي');
  const [newBizProfile, setNewBizProfile] = useState<BusinessSpecialtyProfile>('restaurant');
  const [newBizCurrency, setNewBizCurrency] = useState('ج.م');
  const [newBizPhone, setNewBizPhone] = useState('');
  const [newBizAddress, setNewBizAddress] = useState('');
  const [ownerName, setOwnerName] = useState('المالك / المدير العام');
  const [capitalMajor, setCapitalMajor] = useState<number>(100000);

  const [feedbackMsg, setFeedbackMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleSwitch = (bizId: string) => {
    if (bizId === activeBusinessId) return;
    const success = StorageService.switchBusiness(bizId);
    if (success) {
      setBusinesses(StorageService.getBusinesses());
      showToast('تم تبديل النشاط التجاري بنجاح وتحديث كافة السجلات المحاسبية');
      onBusinessSwitched();
      onRefresh();
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
      showToast(`✅ تم نسخ رابط «${bizName}» المباشر! يمكنك فتحه في أي متصفح أو إرساله لكمبيوتر المنشأة`);
    } catch {
      showToast('تعذر نسخ الرابط تلقائياً، يرجى نسخه يدوياً من شريط العنوان', 'error');
    }
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) {
      showToast('يرجى كتابة اسم المنشأة أو المحل', 'error');
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
      setViewMode('list');
      setNewBizName('');
      setNewBizPhone('');
      setNewBizAddress('');
      showToast(`تم إنشاء وتفعيل «${created.name}» بنجاح كنشاط مستقل معزول 100%`);
      onBusinessSwitched();
      onRefresh();
    } catch {
      showToast('تعذر إنشاء المنشأة، يرجى المحاولة مرة أخرى', 'error');
    }
  };

  const handleDeleteBusiness = (bizId: string) => {
    if (businesses.length <= 1) {
      showToast('لا يمكن حذف النشاط التجاري الوحيد في النظام', 'error');
      return;
    }
    const success = StorageService.deleteBusiness(bizId);
    if (success) {
      setBusinesses(StorageService.getBusinesses());
      setConfirmDeleteId(null);
      showToast('تم حذف المنشأة والبيانات التابعة لها بنجاح');
      onBusinessSwitched();
      onRefresh();
    }
  };

  const handleExport = (bizId?: string) => {
    try {
      StorageService.exportBusinessBackupFile(bizId);
      showToast('تم تصدير ملف النسخة الاحتياطية (.JSON) بنجاح');
    } catch {
      showToast('حدث خطأ أثناء تصدير الملف', 'error');
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
        showToast(`تم استيراد «${imported.name}» بنجاح وتفعيله كنشاط مستقل`);
        onBusinessSwitched();
        onRefresh();
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'ملف غير صالح، تأكد من استيراد ملف JSON سليم تم تصديره من FastRest';
        showToast(msg, 'error');
      }
    };
    reader.readAsText(file);
  };

  const specialtyProfiles: {
    id: BusinessSpecialtyProfile;
    label: string;
    sub: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'restaurant',
      label: 'مطعم وكافيه ومشويات',
      sub: 'صالة وطاولات، مطابخ KDS، ديسباتش، وصفات وتكاليف',
      icon: <UtensilsCrossed className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'supermarket',
      label: 'سوبر ماركت وبقالة',
      sub: 'باركود دولي، باركود موازين إلكترونية، تصنيفات غذائية',
      icon: <Store className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'pet_store',
      label: 'مستلزمات وعيادة حيوانات',
      sub: 'ملفات الحيوانات، مواعيد التطعيمات، دورات أطعمة الحيوانات',
      icon: <Heart className="w-5 h-5 text-rose-400" />,
    },
    {
      id: 'beauty_clinic',
      label: 'صالون تجميل وبيوتي سنتر',
      sub: 'باقات جلسات متعددة، عمولات أخصائيات، حجوزات',
      icon: <Scissors className="w-5 h-5 text-purple-400" />,
    },
    {
      id: 'apparel',
      label: 'ملابس وأحذية وأزياء',
      sub: 'مصفوفة المقاسات والألوان، سياسات الاستبدال',
      icon: <Shirt className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'pharmacy',
      label: 'صيدلية ومستحضرات تجميل',
      sub: 'أرقام التشغيلات، تواريخ انتهاء الصلاحية، الجرعات',
      icon: <Pill className="w-5 h-5 text-teal-400" />,
    },
    {
      id: 'electronics',
      label: 'موبايلات وإلكترونيات',
      sub: 'سيريال IMEI للأجهزة، شهادات الضمان المعتمدة',
      icon: <Smartphone className="w-5 h-5 text-indigo-400" />,
    },
    {
      id: 'service_center',
      label: 'مركز صيانة وورش إصلاح',
      sub: 'تذاكر الصيانة، رسوم الفحص، تتبع قطع الغيار المستبدلة',
      icon: <Wrench className="w-5 h-5 text-orange-400" />,
    },
    {
      id: 'general_retail',
      label: 'تجارة تجزئة عامة',
      sub: 'بيع سريع، جرد المخزون، تقارير الأرباح والكاشير',
      icon: <Store className="w-5 h-5 text-slate-400" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border shadow-lg ${
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

      {/* Hero Control Header */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-500/15 text-amber-400 rounded-2xl border border-amber-500/30 shadow-inner">
              <Building2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  إدارة وتبديل الأنشطة التجارية والفروع (Multi-Tenant Hub)
                </h3>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  {businesses.length} أنشطة مسجلة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                النشاط النشط حالياً:{' '}
                <strong className="text-white font-black">{activeBusiness.name}</strong> (
                {activeBusiness.branchName} ·{' '}
                {getSpecialtyProfileLabel(activeBusiness.specialtyProfile, activeBusiness.businessType)})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {viewMode === 'list' ? (
              <button
                type="button"
                onClick={() => setViewMode('create')}
                className="flex-1 md:flex-none py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ إنشاء نشاط تجاري جديد</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="flex-1 md:flex-none py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>عرض قائمة الأنشطة ({businesses.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="استيراد ملف نسخة احتياطية (.JSON) تم تصديره من جهاز آخر"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>استيراد ملف نشاط</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {onOpenDesktopInstallModal && (
              <button
                type="button"
                onClick={onOpenDesktopInstallModal}
                className="py-2.5 px-3.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="تثبيت كبرنامج كمبيوتر مستقل على سطح المكتب"
              >
                <MonitorDown className="w-4 h-4 text-emerald-400" />
                <span>تثبيت سطح المكتب</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* View Mode 1: Create New Business Form */}
      {viewMode === 'create' && (
        <form
          onSubmit={handleCreateBusiness}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <span>إنشاء وتخصيص نشاط تجاري جديد</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                سيتم إنشاء قاعدة بيانات ومخزون وسجلات محاسبية وورديات معزولة بالكامل دون التأثير على منشآتك الحالية.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
            >
              إلغاء
            </button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                اسم المنشأة أو المحل <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                placeholder="مثال: رويال بيتس، صيدلية السلام، برجر أند كو"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">اسم الفرع</label>
              <input
                type="text"
                value={newBizBranch}
                onChange={(e) => setNewBizBranch(e.target.value)}
                placeholder="مثال: الفرع الرئيسي، فرع التجمع"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">العملة الأساسية</label>
              <input
                type="text"
                value={newBizCurrency}
                onChange={(e) => setNewBizCurrency(e.target.value)}
                placeholder="ج.م أو ر.س أو $"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">رقم الهاتف للتواصل والدليفري</label>
              <input
                type="text"
                value={newBizPhone}
                onChange={(e) => setNewBizPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">العنوان أو الحي</label>
              <input
                type="text"
                value={newBizAddress}
                onChange={(e) => setNewBizAddress(e.target.value)}
                placeholder="شارع عباس العقاد، مدينة نصر"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">اسم المالك ورأس المال التأسيسي</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="اسم المالك"
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                />
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={capitalMajor}
                  onChange={(e) => setCapitalMajor(Number(e.target.value))}
                  placeholder="رأس المال"
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Specialty Profile Selection */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-black text-amber-300">
              اختر نوع النشاط التخصصي لتوليد الإعدادات والخصائص الملائمة له تلقائياً:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {specialtyProfiles.map((p) => {
                const isSelected = newBizProfile === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNewBizProfile(p.id)}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 shrink-0">
                      {p.icon}
                    </div>
                    <div>
                      <div className="font-black text-sm text-white">{p.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {p.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="py-2.5 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>حفظ وتفعيل النشاط فوراً</span>
            </button>
          </div>
        </form>
      )}

      {/* View Mode 2: Registered Businesses Cards */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((biz) => {
              const isActive = biz.id === activeBusinessId;
              const directUrl = StorageService.getDirectBusinessUrl(biz.id);

              return (
                <div
                  key={biz.id}
                  className={`p-4 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-2xl border ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          <Building2 className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-white">{biz.name}</h4>
                            {isActive && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                النشط حالياً
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 font-medium">
                            {biz.branchName} ·{' '}
                            <span className="text-amber-400">
                              {getSpecialtyProfileLabel(biz.specialtyProfile, biz.businessType)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {businesses.length > 1 && (
                        <div>
                          {confirmDeleteId === biz.id ? (
                            <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-800">
                              <button
                                type="button"
                                onClick={() => handleDeleteBusiness(biz.id)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black rounded-lg cursor-pointer"
                              >
                                تأكيد
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(biz.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="حذف هذا النشاط"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-2.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1.5 text-[11px] text-slate-400 font-mono">
                      <div className="flex items-center justify-between">
                        <span>العملة المعتمدة:</span>
                        <span className="text-white font-bold">{biz.currency}</span>
                      </div>
                      {biz.phone && (
                        <div className="flex items-center justify-between">
                          <span>الهاتف:</span>
                          <span className="text-slate-300">{biz.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>معرف النشاط (ID):</span>
                        <span className="text-slate-500 truncate max-w-[120px]">{biz.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => handleSwitch(biz.id)}
                          className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>تشغيل الآن</span>
                        </button>
                      ) : (
                        <div className="flex-1 py-2 px-3 bg-slate-800/80 text-emerald-400 text-center font-bold text-xs rounded-xl border border-slate-700/60">
                          قيد التشغيل كمنشأة نشطة
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyLink(biz.id, biz.name)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs transition-colors cursor-pointer"
                        title="نسخ رابط مباشر لفتح هذا النشاط على كمبيوتر أو هاتف آخر"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExport(biz.id)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs transition-colors cursor-pointer"
                        title="تصدير ملف نسخة احتياطية (.JSON) لنقله على فلاشة USB"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 text-center truncate font-mono">
                      {directUrl}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
              <HelpCircle className="w-5 h-5" />
              <span>كيفية تشغيل وتنزيل التطبيق على كمبيوتر أو هاتف منشأة أخرى:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300 leading-relaxed">
              <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-2xl space-y-1.5">
                <div className="font-black text-white flex items-center gap-2">
                  <span className="w-5 h-5 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-[11px]">
                    1
                  </span>
                  <span>الرابط المباشر للفرع</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  اضغط زر المشاركة (أيقونة الرابط) قرين المنشأة لنسخ الرابط المباشر (المتضمن لمعرف النشاط)، وافتحه في متصفح Chrome أو Edge على كمبيوتر الفرع.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-2xl space-y-1.5">
                <div className="font-black text-white flex items-center gap-2">
                  <span className="w-5 h-5 bg-sky-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-[11px]">
                    2
                  </span>
                  <span>نقل البيانات للأجهزة الأوفلاين</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  إذا كان كمبيوتر المحل بدون إنترنت، اضغط زر التحميل لحفظ ملف المنشأة (<strong>.JSON</strong>) على فلاشة USB، ثم اضغط «استيراد ملف نشاط» على جهاز المحل في ثوانٍ.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-2xl space-y-1.5">
                <div className="font-black text-white flex items-center gap-2">
                  <span className="w-5 h-5 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-[11px]">
                    3
                  </span>
                  <span>التثبيت كبرنامج سطح مكتب</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  من شريط عنوان المتصفح اضغط أيقونة الشاشة [تثبيت FastRest POS] ليظهر أيقونة البرنامج المستقل على سطح المكتب ويعمل أوفلاين للأبد.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
