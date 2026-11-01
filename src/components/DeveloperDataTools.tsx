import React, { useState } from 'react';
import { BusinessType, RestaurantSettings } from '../types';
import { StorageService } from '../services/storage';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  FileSpreadsheet,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';

interface Props {
  settings: RestaurantSettings;
  onRefresh: () => void;
  onSettingsUpdated: (newSettings: RestaurantSettings) => void;
  onRestartOnboarding: () => void;
}

export const DeveloperDataTools: React.FC<Props> = ({
  settings,
  onRefresh,
  onSettingsUpdated,
  onRestartOnboarding,
}) => {
  // Mock data type selection
  const [mockType, setMockType] = useState<BusinessType>(settings.businessType || 'restaurant');

  // Wipe mode selection
  const [wipeMode, setWipeMode] = useState<'operational_only' | 'complete_reset'>(
    'operational_only'
  );

  // Confirmation Modals State
  const [confirmModalType, setConfirmModalType] = useState<'mock' | 'wipe' | null>(null);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Real-time count of current business data
  const currentOrders = StorageService.getSaleOrders().length;
  const currentVouchers = StorageService.getVouchers().length;
  const currentShifts = StorageService.getShifts().length;
  const currentInventory = StorageService.getInventory().length;
  const currentMenu = StorageService.getMenuItems().length;
  const currentCustomers = StorageService.getCustomers().length;
  const currentSuppliers = StorageService.getSuppliers().length;

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDownloadBackup = () => {
    try {
      StorageService.exportBusinessBackupFile();
      showMsg('تم تنزيل ملف النسخة الاحتياطية بنجاح بصيغة JSON');
    } catch {
      showMsg('تعذر تنزيل ملف النسخة الاحتياطية', 'error');
    }
  };

  const handleExecuteMockLoad = () => {
    if (typedConfirmation.trim() !== 'تجربة' && typedConfirmation.trim().toLowerCase() !== 'mock') {
      showMsg('يرجى كتابة كلمة "تجربة" في حقل التأكيد بدقة', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      StorageService.loadMockDemoData(mockType);
      const newSettings = StorageService.getSettings();
      onSettingsUpdated(newSettings);
      onRefresh();
      setConfirmModalType(null);
      setTypedConfirmation('');
      showMsg(`تم تحميل البيانات التجريبية (${mockType === 'restaurant' ? 'مطعم' : 'تجزئة'}) بنجاح!`);
    } catch {
      showMsg('حدث خطأ أثناء تحميل البيانات التجريبية', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteWipe = () => {
    if (typedConfirmation.trim() !== 'مسح' && typedConfirmation.trim().toLowerCase() !== 'wipe') {
      showMsg('يرجى كتابة كلمة "مسح" في حقل التأكيد بدقة', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      StorageService.wipeCurrentBusinessData(wipeMode);
      const newSettings = StorageService.getSettings();
      onSettingsUpdated(newSettings);
      onRefresh();
      setConfirmModalType(null);
      setTypedConfirmation('');
      const modeLabel =
        wipeMode === 'operational_only'
          ? 'تم تصفير كافة الحركات التشغيلية والمالية مع الاحتفاظ بالأصناف'
          : 'تم مسح وتصفير كافة بيانات المنشأة تماماً والبدء من الصفر';
      showMsg(modeLabel);
    } catch {
      showMsg('حدث خطأ أثناء تصفير البيانات', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Top Banner & Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border font-bold text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Cpu className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">
                أدوات المطور والتحكم في البيانات التجريبية (Dev & Mock Tools)
              </h3>
              <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                منطقة حساسة
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تتيح لك شحن المنشأة ببيانات تجريبية كاملة للاختبار أو تصفير كافة الحركات للبدء من الصفر،
              مع حماية كاملة لبيانات الإنتاج.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadBackup}
          className="self-start sm:self-auto py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs shrink-0"
          title="حفظ نسخة احتياطية كاملة للمنشأة الحالية على جهازك بصيغة JSON"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>تنزيل نسخة احتياطية أولاً (JSON)</span>
        </button>
      </div>

      {/* Current Business Stats Overview */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-slate-300 font-bold text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <span>الحالة الحالية للمنشأة النشطة:</span>
            <span className="text-white font-black">«{settings.restaurantName}»</span>
          </div>
          <span className="text-[11px] text-slate-400">
            الفرع: {settings.branchName} · العملة: {settings.currency}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-0.5">فواتير البيع</span>
            <span className="text-sm font-black text-amber-400 font-mono">{currentOrders}</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-0.5">سندات الخزينة</span>
            <span className="text-sm font-black text-emerald-400 font-mono">{currentVouchers}</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-0.5">الورديات</span>
            <span className="text-sm font-black text-sky-400 font-mono">{currentShifts}</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-0.5">خامات المخزون</span>
            <span className="text-sm font-black text-white font-mono">{currentInventory}</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-0.5">أطباق المنيو</span>
            <span className="text-sm font-black text-white font-mono">{currentMenu}</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-0.5">العملاء</span>
            <span className="text-sm font-black text-white font-mono">{currentCustomers}</span>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block mb-0.5">الموردين</span>
            <span className="text-sm font-black text-white font-mono">{currentSuppliers}</span>
          </div>
        </div>
      </div>

      {/* Main Two Action Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Load Rich Mock Data */}
        <div className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-amber-400">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
              <h4 className="font-black text-sm text-white">
                1. تبديل ببيانات تجريبية جاهزة (Load Mock Data)
              </h4>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              استبدال بيانات النشاط الحالي ببيانات تجريبية غنية ومتكاملة تشمل:
              <br />
              • منيو أطباق ووصفات مربوطة بالمكونات وحساب التكلفة المعيارية.
              <br />
              • مخزون واقعي، موردين وعملاء آجل، وردية مفتوحة مع مبيعات وسندات.
              <br />
              • شركاء وموظفين بحساباتهم الجارية وسلفهم وعهدهم.
            </p>

            <div className="pt-2">
              <label className="font-bold text-slate-300 block mb-2">نوع النشاط التجريبي:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMockType('restaurant')}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    mockType === 'restaurant'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4 shrink-0" />
                  <span className="text-[11px]">مطعم ومشويات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMockType('retail')}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    mockType === 'retail'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Store className="w-4 h-4 shrink-0" />
                  <span className="text-[11px]">سوبر ماركت وتجزئة</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfirmModalType('mock');
              setTypedConfirmation('');
            }}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تحميل واستبدال البيانات التجريبية الآن</span>
          </button>
        </div>

        {/* Card 2: Wipe Current Restaurant Data */}
        <div className="bg-slate-950 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-rose-400">
              <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
              <h4 className="font-black text-sm text-white">
                2. مسح وتصفير البيانات للبدء من الصفر (Data Wipe)
              </h4>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              تصفير ومسح الحركات المالية والتشغيلية للمطعم للبدء كمنشأة حقيقية نظيفة خالية من
              فواتير الاختبار مع خيار الاحتفاظ ببطاقات الأصناف والمنيو:
            </p>

            <div className="space-y-2 pt-1">
              <label
                className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  wipeMode === 'operational_only'
                    ? 'bg-amber-500/10 border-amber-500 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="wipeMode"
                  checked={wipeMode === 'operational_only'}
                  onChange={() => setWipeMode('operational_only')}
                  className="mt-0.5 accent-amber-500"
                />
                <div>
                  <span className="font-bold block text-white text-[11px]">
                    تصفير الحركات والعمليات فقط (موصى به للإنتاج)
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    يمسح كل الفواتير والسندات والورديات، مع الاحتفاظ بأصناف المنيو والمخزون والمستخدمين.
                  </span>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  wipeMode === 'complete_reset'
                    ? 'bg-rose-500/10 border-rose-500 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="wipeMode"
                  checked={wipeMode === 'complete_reset'}
                  onChange={() => setWipeMode('complete_reset')}
                  className="mt-0.5 accent-rose-500"
                />
                <div>
                  <span className="font-bold block text-rose-300 text-[11px]">
                    مسح شامل وتصفير كامل (Factory Reset)
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    يمسح كل شيء تماماً (المنيو، الخامات، الحسابات، والفواتير) لتبدأ من صفحة بيضاء كلياً.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfirmModalType('wipe');
              setTypedConfirmation('');
            }}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>تنفيذ التصفير والمسح الآن</span>
          </button>
        </div>
      </div>

      {/* Safety Note & Wizard Shortcut */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-white block">
              هل تريد إعادة تشغيل معالج المنشأة الأولي (Onboarding Wizard)؟
            </span>
            <span className="text-[11px] text-slate-400">
              يمكنك إعادة فتح المعالج لتعديل اسم النشاط ونوعه والعملة بدون مسح الحسابات.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRestartOnboarding}
          className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl font-bold cursor-pointer transition-colors whitespace-nowrap"
        >
          إعادة تشغيل المعالج الأولي
        </button>
      </div>

      {/* Confirmation Modal */}
      {confirmModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-2xl ${
                    confirmModalType === 'wipe'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <AlertOctagon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    {confirmModalType === 'wipe'
                      ? 'تحذير أمان: تأكيد مسح بيانات المطعم'
                      : 'تأكيد استبدال البيانات ببيانات تجريبية'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    المنشأة: {settings.restaurantName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalType(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`p-3.5 rounded-2xl text-xs space-y-2 border ${
                confirmModalType === 'wipe'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <span className="font-bold block">
                {confirmModalType === 'wipe'
                  ? 'تنبيه خطير: هذه العملية ستقوم بمسح الحركات ولن يمكن التراجع عنها إلا عبر ملف النسخة الاحتياطية!'
                  : 'سيتم استبدال الفواتير والسندات والمخزون الحالي ببيانات تجريبية جديدة تماماً.'}
              </span>
              <p className="text-[11px] opacity-90">
                إذا كانت لديك بيانات فعلية ترغب بالاحتفاظ بها، يرجى التأكد من تنزيل ملف النسخة
                الاحتياطية أولاً قبل المتابعة.
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1 text-xs">
                للتأكيد، اكتب كلمة{' '}
                <span className="text-amber-400 font-mono font-black">
                  «{confirmModalType === 'wipe' ? 'مسح' : 'تجربة'}»
                </span>{' '}
                في الحقل أدناه:
              </label>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={confirmModalType === 'wipe' ? 'اكتب: مسح' : 'اكتب: تجربة'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-black text-center text-sm focus:border-amber-500"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalType(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                إلغاء التراجع
              </button>

              {confirmModalType === 'wipe' ? (
                <button
                  type="button"
                  disabled={isProcessing || typedConfirmation.trim() !== 'مسح'}
                  onClick={handleExecuteWipe}
                  className={`flex-1 py-2.5 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    typedConfirmation.trim() === 'مسح'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد المسح النهائي</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing || typedConfirmation.trim() !== 'تجربة'}
                  onClick={handleExecuteMockLoad}
                  className={`flex-1 py-2.5 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    typedConfirmation.trim() === 'تجربة'
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>تأكيد تحميل البيانات</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
