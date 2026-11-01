import React, { useEffect, useState } from 'react';
import { RestaurantSettings, SaleOrder, Voucher } from '../types';
import {
  formatCurrency,
  getOrderStatusLabel,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  StorageService,
} from '../services/storage';
import {
  AlertTriangle,
  Bike,
  ChefHat,
  CheckSquare,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  Printer,
  Receipt,
  ScrollText,
  Square,
  Stamp,
  UtensilsCrossed,
  X,
} from 'lucide-react';

export type PrintPaperFormat = 'thermal' | 'standard';
export type PrintCopyLabel = 'original' | 'archive' | 'duplicate';
export type OrderPrintMode = 'customer_invoice' | 'kitchen_kot';

interface PrintPreviewDialogProps {
  voucher?: Voucher | null;
  order?: SaleOrder | null;
  settings: RestaurantSettings;
  initialFormat?: PrintPaperFormat;
  initialDocMode?: OrderPrintMode;
  onClose: () => void;
}

export const PrintPreviewDialog: React.FC<PrintPreviewDialogProps> = ({
  voucher,
  order,
  settings,
  initialFormat,
  initialDocMode,
  onClose,
}) => {
  const isVoucher = Boolean(voucher);
  const isOrder = Boolean(order);

  const [orderPrintMode, setOrderPrintMode] = useState<OrderPrintMode>(
    initialDocMode || 'customer_invoice'
  );
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [paperFormat, setPaperFormat] = useState<PrintPaperFormat>(
    initialFormat || (isOrder ? 'thermal' : 'standard')
  );
  const [copyType, setCopyType] = useState<PrintCopyLabel>('original');
  const [zoomLevel, setZoomLevel] = useState<'90' | '100' | '115'>('100');
  const [showSignatures, setShowSignatures] = useState<boolean>(
    isVoucher || (order?.paymentMethod === 'credit' ? true : false)
  );
  const [showHeaderMeta, setShowHeaderMeta] = useState<boolean>(true);
  const [showVerificationStamp, setShowVerificationStamp] = useState<boolean>(true);

  useEffect(() => {
    setPaperFormat(initialFormat || (isOrder ? 'thermal' : 'standard'));
    setShowSignatures(isVoucher || (order?.paymentMethod === 'credit' ? true : false));
    if (initialDocMode) {
      setOrderPrintMode(initialDocMode);
    }
  }, [voucher, order, initialFormat, initialDocMode, isOrder, isVoucher]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!voucher && !order) return null;

  const distinctStations = order
    ? Array.from(
        new Set(
          order.lines
            .map((l) => l.kitchenStationName)
            .filter((name): name is string => Boolean(name))
        )
      )
    : [];

  const handleTriggerSystemPrint = () => {
    if (order) {
      StorageService.markKOTPrinted(order.id);
    }
    window.print();
  };

  const copyBadgeText =
    copyType === 'original'
      ? isOrder
        ? orderPrintMode === 'kitchen_kot'
          ? 'بون أصلي للمطبخ'
          : 'نسخة أصلية للعميل'
        : 'نسخة أصلية للمستلم'
      : copyType === 'archive'
      ? 'نسخة أرشيف المحاسبة والخزينة'
      : 'نسخة طبق الأصل';

  // Document Metadata for Voucher
  const getVoucherMeta = (v: Voucher) => {
    const isCredit = v.type === 'credit_purchase';
    const isSupplierPayment = v.type === 'supplier_payment';
    const isCustomerCollection = v.type === 'customer_collection';
    const isExpense =
      v.type === 'expense' ||
      isSupplierPayment ||
      v.type === 'partner_drawing' ||
      v.type === 'staff_advance';

    let title = 'سند صرف نقدي';
    let subtitle = 'Cash Payment Voucher';

    if (isCredit) {
      title = 'سند إثبات استلام توريد / فاتورة بالآجل';
      subtitle = 'Credit Purchase Voucher (Non-Cash)';
    } else if (isSupplierPayment) {
      title = 'سند صرف سداد دفعة لمورد آجل';
      subtitle = 'Supplier Payment Voucher';
    } else if (isCustomerCollection) {
      title = 'سند قبض تحصيل دفعة من عميل آجل';
      subtitle = 'Customer Debt Collection Voucher';
    } else if (v.type === 'partner_drawing') {
      title = 'سند صرف مسحوبات شريك (جاري الشريك)';
      subtitle = 'Partner Drawing Voucher';
    } else if (v.type === 'partner_deposit') {
      title = 'سند قبض إيداع وتمويل من شريك';
      subtitle = 'Partner Capital/Current Deposit Voucher';
    } else if (v.type === 'staff_advance') {
      title = 'سند صرف سلفة / راتب موظف أو عامل';
      subtitle = 'Staff Salary / Advance Voucher';
    } else if (v.type === 'staff_custody_settlement') {
      title = 'سند قبض رد وتسوية عهدة موظف';
      subtitle = 'Staff Custody Settlement Voucher';
    } else if (v.type === 'receipt') {
      title = 'سند قبض نقدية';
      subtitle = 'Cash Receipt Voucher';
    }

    return { isCredit, isSupplierPayment, isCustomerCollection, isExpense, title, subtitle };
  };

  const docNumber = voucher
    ? voucher.voucherNumber
    : order
    ? orderPrintMode === 'kitchen_kot'
      ? `KOT #${order.dailySequenceNumber || 1}`
      : order.orderNumber
    : '';
  const docAmount = voucher ? voucher.amount : order ? order.totalAmount : 0;
  const docTypeLabel = voucher
    ? 'سند خزينة / محاسبة'
    : orderPrintMode === 'kitchen_kot'
    ? 'بون تشغيل المطبخ (KOT)'
    : 'فاتورة مبيعات كاشير';

  const zoomScaleClass =
    zoomLevel === '90'
      ? 'scale-95 origin-top'
      : zoomLevel === '115'
      ? 'scale-105 origin-top'
      : 'scale-100 origin-top';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md overflow-hidden">
      {/* 1. TOP STANDARDIZED PRINT STUDIO TOOLBAR (Hidden in actual system print) */}
      <div className="no-print bg-slate-900 border-b border-slate-800 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl shrink-0">
        {/* Right: Document Info & Preview Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            {orderPrintMode === 'kitchen_kot' ? (
              <ChefHat className="w-5 h-5 text-amber-400" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white">
                معاينة المستند قبل الطباعة
              </h2>
              <span className="text-[11px] bg-slate-800 text-amber-400 border border-slate-700 px-2 py-0.5 rounded font-semibold">
                {docTypeLabel}
              </span>
              <span className="text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                {docNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {orderPrintMode === 'kitchen_kot' ? (
                <span className="text-amber-300 font-semibold">
                  بون المطبخ لتشغيل وتحضير الطلبات · بدون أسعار أو مبالغ مالية
                </span>
              ) : (
                <>
                  تحقق من شكل المستند ومقاس الورق والبيانات قبل فتح نافذة الطباعة · الإجمالي:{' '}
                  <strong className="font-mono text-white">
                    {formatCurrency(docAmount, settings.currency)}
                  </strong>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Center: Mode switcher, Stations, Paper Size & Copy Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Order Mode Switcher (KOT vs Customer Invoice) */}
          {isOrder && (
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setOrderPrintMode('customer_invoice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderPrintMode === 'customer_invoice'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>فاتورة العميل</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderPrintMode('kitchen_kot')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderPrintMode === 'kitchen_kot'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>بون المطبخ (KOT)</span>
              </button>
            </div>
          )}

          {/* Kitchen Station Filter when in KOT mode */}
          {isOrder && orderPrintMode === 'kitchen_kot' && distinctStations.length > 0 && (
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-amber-400 text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-hidden cursor-pointer"
              title="توجيه بون لطابعة قسم معين"
            >
              <option value="all">🔥 كافة الأقسام ({distinctStations.length})</option>
              {distinctStations.map((st) => (
                <option key={st} value={st}>
                  قسم: {st}
                </option>
              ))}
            </select>
          )}

          {/* Paper Format Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPaperFormat('thermal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                paperFormat === 'thermal'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>رول حراري 80mm</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperFormat('standard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                paperFormat === 'standard'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ورق قياسي A4 / A5</span>
            </button>
          </div>

          {/* Copy Label Selector */}
          <select
            value={copyType}
            onChange={(e) => setCopyType(e.target.value as PrintCopyLabel)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-hidden focus:border-amber-500 cursor-pointer"
            title="نوع النسخة"
          >
            <option value="original">
              {orderPrintMode === 'kitchen_kot' ? 'بون أصلي للمطبخ' : 'نسخة أصلية (للعميل / المستلم)'}
            </option>
            <option value="archive">نسخة أرشيف المحاسبة</option>
            <option value="duplicate">نسخة طبق الأصل</option>
          </select>

          {/* Zoom Controls */}
          <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel('90')}
              className={`px-2 py-1 rounded-lg font-mono cursor-pointer ${
                zoomLevel === '90' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400'
              }`}
              title="تصغير العرض"
            >
              <Minimize2 className="w-3.5 h-3.5 inline ml-1" />
              90%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel('100')}
              className={`px-2 py-1 rounded-lg font-mono cursor-pointer ${
                zoomLevel === '100' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400'
              }`}
              title="الحجم الطبيعي"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel('115')}
              className={`px-2 py-1 rounded-lg font-mono cursor-pointer ${
                zoomLevel === '115' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400'
              }`}
              title="تكبير العرض"
            >
              <Maximize2 className="w-3.5 h-3.5 inline ml-1" />
              115%
            </button>
          </div>
        </div>

        {/* Left: Primary System Print & Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTriggerSystemPrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.4]" />
            <span>طباعة الآن (Ctrl + P)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="إغلاق المعاينة (Esc)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">إغلاق</span>
          </button>
        </div>
      </div>

      {/* 2. SECONDARY DISPLAY OPTIONS BAR (Hidden in actual system print) */}
      <div className="no-print bg-slate-900/70 border-b border-slate-800/80 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <ScrollText className="w-3.5 h-3.5 text-amber-400" />
            خيارات عناصر الورقة:
          </span>

          <button
            type="button"
            onClick={() => setShowSignatures((v) => !v)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
          >
            {showSignatures ? (
              <CheckSquare className="w-4 h-4 text-amber-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>إظهار خانات التوقيع والاعتماد</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHeaderMeta((v) => !v)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
          >
            {showHeaderMeta ? (
              <CheckSquare className="w-4 h-4 text-amber-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>إظهار العنوان والبيانات الضريبية</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVerificationStamp((v) => !v)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
          >
            {showVerificationStamp ? (
              <CheckSquare className="w-4 h-4 text-amber-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>إظهار ختم المراجعة والباركود النصي</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400">
          المقاس المحدد:{' '}
          <strong className="text-amber-400">
            {paperFormat === 'thermal'
              ? 'طابعة إيصالات حرارية (80mm Roll)'
              : 'طابعة مكتبية قياسية (A4 / A5)'}
          </strong>
        </div>
      </div>

      {/* 3. SCROLLABLE LIVE PAPER PREVIEW WORKSPACE */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        <div
          className={`transition-transform duration-200 ${zoomScaleClass} ${
            paperFormat === 'thermal' ? 'w-full max-w-[360px]' : 'w-full max-w-2xl'
          }`}
        >
          {/* Paper Sheet Container (#printable-voucher is targeted by @media print) */}
          <div
            id="printable-voucher"
            className={`bg-white text-slate-950 shadow-2xl transition-all ${
              paperFormat === 'thermal'
                ? 'p-4 border-t-4 border-b-4 border-dashed border-slate-400 rounded-xs text-xs'
                : 'p-7 border-2 border-slate-900 rounded-lg text-sm'
            }`}
          >
            {/* ================= CASE A: TREASURY / ACCOUNTING VOUCHER ================= */}
            {voucher &&
              (() => {
                const meta = getVoucherMeta(voucher);
                return (
                  <div>
                    {/* Header */}
                    <div
                      className={`text-center pb-3 mb-3 ${
                        paperFormat === 'thermal'
                          ? 'border-b-2 border-dashed border-slate-800'
                          : 'border-b-2 border-slate-900 pb-4 mb-4'
                      }`}
                    >
                      {settings.logoBase64 && (
                        <img
                          src={settings.logoBase64}
                          alt="Logo"
                          className={`${
                            paperFormat === 'thermal' ? 'w-12 h-12' : 'w-16 h-16'
                          } object-contain mx-auto mb-1.5`}
                        />
                      )}
                      <h1
                        className={`${
                          paperFormat === 'thermal' ? 'text-base' : 'text-2xl'
                        } font-black tracking-tight text-slate-950`}
                      >
                        {settings.restaurantName}
                      </h1>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        {settings.branchName} · هاتف: {settings.phone}
                      </p>
                      {showHeaderMeta && (
                        <p className="text-[10px] text-slate-500">
                          {settings.address}
                          {settings.taxNumber ? ` · س.ت / ضريبي: ${settings.taxNumber}` : ''}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                        <span
                          className={`inline-block px-3 py-1 bg-slate-900 text-white font-bold rounded ${
                            paperFormat === 'thermal' ? 'text-xs' : 'text-sm'
                          }`}
                        >
                          {meta.title}
                        </span>
                        <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-400 text-slate-800 font-semibold text-[10px] rounded">
                          {copyBadgeText}
                        </span>
                      </div>
                      {paperFormat === 'standard' && (
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          {meta.subtitle}
                        </div>
                      )}
                    </div>

                    {/* Metadata Grid */}
                    <div
                      className={`grid grid-cols-2 gap-2.5 mb-4 pb-3 border-b border-dashed border-slate-400 ${
                        paperFormat === 'thermal' ? 'text-[11px]' : 'text-xs sm:text-sm'
                      }`}
                    >
                      <div>
                        <span className="text-slate-500 block text-[10px]">رقم السند:</span>
                        <strong className="font-mono font-bold text-slate-950 text-sm">
                          {voucher.voucherNumber}
                        </strong>
                      </div>
                      <div className="text-left">
                        <span className="text-slate-500 block text-[10px]">التاريخ والوقت:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {voucher.date} · {voucher.time}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">بند الحساب:</span>
                        <span className="font-bold text-slate-900">
                          [{voucher.accountCode}] {voucher.accountName}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-slate-500 block text-[10px]">مسؤول الخزينة:</span>
                        <span className="font-semibold text-slate-900">{voucher.cashierName}</span>
                      </div>
                    </div>

                    {/* Amount Highlight Box */}
                    <div className="bg-slate-50 border-2 border-slate-900 rounded-lg p-3 text-center mb-4">
                      <span className="text-[11px] text-slate-600 font-semibold block mb-0.5">
                        {meta.isCredit
                          ? 'قيمة الفاتورة المثبتة بالآجل (غير نقدية):'
                          : meta.isExpense
                          ? 'المبلغ المنصرف رقماً:'
                          : 'المبلغ المقبوض رقماً:'}
                      </span>
                      <div
                        className={`${
                          paperFormat === 'thermal' ? 'text-2xl' : 'text-3xl'
                        } font-black font-mono-numbers text-slate-950`}
                      >
                        {formatCurrency(voucher.amount, settings.currency)}
                      </div>
                      {meta.isCredit && (
                        <span className="text-[10px] font-bold text-slate-700 block mt-1">
                          تنبيه: تم قيد المبلغ على حساب المورد بالآجل ولم يخرج كاش من الخزينة.
                        </span>
                      )}
                    </div>

                    {/* Voucher Details Table */}
                    <div
                      className={`space-y-2.5 mb-5 pb-4 border-b border-dashed border-slate-400 ${
                        paperFormat === 'thermal' ? 'text-xs' : 'text-sm'
                      }`}
                    >
                      {voucher.invoiceNo && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-500 shrink-0 text-xs font-semibold">
                            رقم فاتورة المورد:
                          </span>
                          <span className="font-mono font-bold text-slate-950 border-b border-dotted border-slate-400 flex-1 text-right pb-0.5">
                            {voucher.invoiceNo}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-500 shrink-0 text-xs font-semibold">
                          {meta.isCredit
                            ? 'المورد المسلّم:'
                            : meta.isExpense
                            ? 'يُصرف إلى السيد/ة:'
                            : 'مستلم من السيد/ة:'}
                        </span>
                        <span className="font-bold text-slate-950 border-b border-dotted border-slate-400 flex-1 text-right pb-0.5">
                          {voucher.recipient || 'غير محدد'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-500 shrink-0 text-xs font-semibold">
                          وذلك مقابل (البيان):
                        </span>
                        <span className="text-slate-900 font-medium border-b border-dotted border-slate-400 flex-1 text-right pb-0.5">
                          {voucher.description || 'معاملة خزينة معتمدة'}
                        </span>
                      </div>
                    </div>

                    {/* Optional Signatures Block */}
                    {showSignatures && (
                      <div
                        className={`grid ${
                          paperFormat === 'thermal' ? 'grid-cols-2 gap-3' : 'grid-cols-3 gap-4'
                        } pt-1 pb-3 text-center text-[11px]`}
                      >
                        <div className="space-y-6">
                          <span className="text-slate-700 font-bold block">توقيع المستلم</span>
                          <div className="border-t border-slate-800 pt-1 text-slate-500">
                            (....................)
                          </div>
                        </div>
                        <div className="space-y-6">
                          <span className="text-slate-700 font-bold block">أمين الخزينة</span>
                          <div className="border-t border-slate-800 pt-1 text-slate-800 font-semibold">
                            {voucher.cashierName}
                          </div>
                        </div>
                        {paperFormat === 'standard' && (
                          <div className="space-y-6">
                            <span className="text-slate-700 font-bold block">اعتماد الإدارة</span>
                            <div className="border-t border-slate-800 pt-1 text-slate-500">
                              (....................)
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verification Stamp & Footer */}
                    {showVerificationStamp && (
                      <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold">
                          <Stamp className="w-3 h-3" />
                          مستند رسمي صادر من النظام
                        </span>
                        <span className="font-mono tracking-widest">*{voucher.voucherNumber}*</span>
                      </div>
                    )}

                    <div className="mt-2 text-center text-[10px] text-slate-500 pt-1">
                      {settings.footerNote} · FastRest POS
                    </div>
                  </div>
                );
              })()}

            {/* ================= CASE B: POS SALE INVOICE OR KITCHEN ORDER TICKET (KOT) ================= */}
            {order &&
              (() => {
                const isCredit = order.paymentMethod === 'credit';
                const isKOT = orderPrintMode === 'kitchen_kot';

                // In KOT mode, filter lines by selected kitchen station if specified
                const filteredLines =
                  isKOT && stationFilter !== 'all'
                    ? order.lines.filter((l) => l.kitchenStationName === stationFilter)
                    : order.lines;

                // Group lines by station for organized kitchen tickets
                const stationGroups: { [station: string]: typeof filteredLines } = {};
                for (const line of filteredLines) {
                  const stationKey = line.kitchenStationName || 'القسم العام / المطبخ الرئيسي';
                  if (!stationGroups[stationKey]) {
                    stationGroups[stationKey] = [];
                  }
                  stationGroups[stationKey].push(line);
                }

                // ---------------- 1. KITCHEN ORDER TICKET (KOT) VIEW ----------------
                if (isKOT) {
                  return (
                    <div className="text-slate-950 font-sans">
                      {/* KOT Header */}
                      <div
                        className={`text-center pb-2.5 mb-2.5 ${
                          paperFormat === 'thermal'
                            ? 'border-b-2 border-black'
                            : 'border-b-2 border-slate-900 pb-3 mb-3'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5 font-black text-sm mb-0.5">
                          <ChefHat className="w-4 h-4" />
                          <span>{settings.restaurantName}</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black">
                          بون تشغيل وتحضير المطبخ (KOT)
                        </h1>
                        <p className="text-[11px] font-mono font-bold text-slate-700">
                          {stationFilter === 'all'
                            ? 'تشغيل شامل لكافة الأقسام'
                            : `مخصص لقسم: [ ${stationFilter} ]`}
                        </p>

                        {/* Reprint indicator if ticket was printed before */}
                        {order.kotPrintCount && order.kotPrintCount > 0 ? (
                          <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 border border-amber-500 text-amber-950 text-[11px] font-black rounded-sm">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            <span>⚠️ إعادة طباعة للمطبخ (بون #{order.kotPrintCount + 1})</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Prominent High-Contrast Order Type Badge */}
                      <div className="bg-black text-white p-2.5 rounded-sm mb-3 text-center">
                        {order.orderType === 'dine_in' && (
                          <div>
                            <span className="text-[11px] font-bold text-amber-300 block">
                              🍽️ طلب صالة محلي (Dine-In)
                            </span>
                            <div className="text-2xl sm:text-3xl font-black mt-0.5 tracking-wider">
                              طاولة رقم [{order.tableNumber || 1}]
                            </div>
                            {order.tableGuests ? (
                              <span className="text-xs text-slate-200 block font-semibold mt-0.5">
                                عدد الأفراد: {order.tableGuests} فرد
                              </span>
                            ) : null}
                          </div>
                        )}

                        {order.orderType === 'takeaway' && (
                          <div>
                            <span className="text-[11px] font-bold text-amber-300 block">
                              🛍️ طلب تيك أواي سفري (Takeaway)
                            </span>
                            <div className="text-2xl sm:text-3xl font-black mt-0.5 tracking-wider">
                              رقم النداء: #{order.dailySequenceNumber || order.orderNumber.slice(-3)}
                            </div>
                          </div>
                        )}

                        {order.orderType === 'delivery' && (
                          <div>
                            <span className="text-[11px] font-bold text-amber-300 block">
                              🛵 طلب دليفري وتوصيل خارجي (Delivery)
                            </span>
                            <div className="text-xl sm:text-2xl font-black mt-0.5">
                              الطيار: {order.deliveryDriverName || 'جارِ التعيين'}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ticket Meta Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs border-b border-black pb-2 mb-3">
                        <div>
                          <span className="text-slate-600 block text-[10px]">رقم الطلب والمسلسل:</span>
                          <strong className="font-mono text-black font-bold">
                            #{order.dailySequenceNumber || 1} · {order.orderNumber}
                          </strong>
                        </div>
                        <div className="text-left">
                          <span className="text-slate-600 block text-[10px]">وقت استلام الطلب:</span>
                          <strong className="font-mono text-black font-bold">
                            {order.time} · {order.date}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-600 block text-[10px]">الكاشير:</span>
                          <span className="font-bold text-slate-900">{order.cashierName}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-slate-600 block text-[10px]">حالة الدفع:</span>
                          <span
                            className={`font-bold ${
                              order.paymentStatus === 'paid' ? 'text-black' : 'text-amber-800'
                            }`}
                          >
                            {order.paymentStatus === 'paid' ? '✓ مدفوع بالكامل' : '⏳ معلق (دفع لاحق)'}
                          </span>
                        </div>
                      </div>

                      {/* Items Grouped by Kitchen Station */}
                      <div className="space-y-4 mb-3">
                        {Object.entries(stationGroups).map(([stationTitle, items]) => (
                          <div
                            key={stationTitle}
                            className="border-2 border-black rounded-sm overflow-hidden"
                          >
                            <div className="bg-slate-200 px-2 py-1 border-b border-black flex justify-between items-center text-xs font-black">
                              <span>🔥 قسم: {stationTitle}</span>
                              <span className="font-mono">
                                إجمالي الأصناف: {items.reduce((s, it) => s + it.qty, 0)}
                              </span>
                            </div>

                            <div className="divide-y divide-black">
                              {items.map((line, idx) => (
                                <div key={idx} className="p-2 bg-white">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-black text-sm sm:text-base text-black flex-1">
                                      {line.menuItemName}
                                    </span>
                                    <span className="font-mono font-black text-xl sm:text-2xl text-black bg-slate-100 px-2.5 py-0.5 border border-black rounded-xs">
                                      {line.qty}×
                                    </span>
                                  </div>

                                  {/* Kitchen Preparation Note Callout */}
                                  {line.notes && (
                                    <div className="mt-1.5 p-1.5 bg-amber-100 border border-amber-600 text-amber-950 text-xs font-black rounded-xs flex items-start gap-1">
                                      <span className="shrink-0 font-bold">⚠️ ملاحظة:</span>
                                      <span>{line.notes}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* General Order Notes Callout */}
                      {order.notes && (
                        <div className="mb-3 p-2 bg-slate-100 border-2 border-black rounded-sm">
                          <span className="font-black text-xs block text-black mb-0.5">
                            📌 ملاحظة عامة على الطلب:
                          </span>
                          <p className="text-xs font-bold text-slate-900">{order.notes}</p>
                        </div>
                      )}

                      {/* Delivery Address & Customer Info (for packaging/delivery) */}
                      {order.orderType === 'delivery' && (
                        <div className="mb-3 p-2 border border-black rounded-sm bg-slate-50 text-xs space-y-1">
                          <div className="font-black text-black">بيانات العميل والتوصيل:</div>
                          <div>
                            <span className="text-slate-600">العميل:</span>{' '}
                            <strong>{order.customerName || 'عميل خارجي'}</strong>
                            {order.deliveryPhone && (
                              <span className="font-mono mr-2">({order.deliveryPhone})</span>
                            )}
                          </div>
                          {order.deliveryAddress && (
                            <div>
                              <span className="text-slate-600">العنوان:</span>{' '}
                              <strong>{order.deliveryAddress}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* KOT Footer (NO PRICES!) */}
                      <div className="border-t border-black pt-2 text-center text-[10px] text-slate-700 font-semibold">
                        وقت الطباعة: {order.kotPrintTime || new Date().toLocaleTimeString('ar-EG')} ·
                        يرجى تسليم الطلب ساخناً وبجودة عالية
                      </div>
                    </div>
                  );
                }

                // ---------------- 2. CUSTOMER SALE INVOICE VIEW ----------------
                return (
                  <div>
                    {/* Store Header */}
                    <div
                      className={`text-center pb-3 mb-3 ${
                        paperFormat === 'thermal'
                          ? 'border-b-2 border-dashed border-slate-800'
                          : 'border-b-2 border-slate-900 pb-4 mb-4'
                      }`}
                    >
                      {settings.logoBase64 && (
                        <img
                          src={settings.logoBase64}
                          alt="Logo"
                          className={`${
                            paperFormat === 'thermal' ? 'w-12 h-12' : 'w-16 h-16'
                          } object-contain mx-auto mb-1.5`}
                        />
                      )}
                      <h1
                        className={`${
                          paperFormat === 'thermal' ? 'text-lg' : 'text-2xl'
                        } font-black text-slate-950`}
                      >
                        {settings.restaurantName}
                      </h1>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {settings.branchName} · هاتف: {settings.phone}
                      </p>
                      {showHeaderMeta && (
                        <p className="text-[10px] text-slate-500">
                          {settings.address}
                          {settings.taxNumber ? ` · س.ت / ضريبي: ${settings.taxNumber}` : ''}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                        <span
                          className={`inline-block px-3 py-0.5 bg-slate-900 text-white font-bold rounded ${
                            paperFormat === 'thermal' ? 'text-xs' : 'text-sm'
                          }`}
                        >
                          فاتورة مبيعات - {getPaymentMethodLabel(order.paymentMethod)}
                        </span>
                        <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-400 text-slate-800 font-semibold text-[10px] rounded">
                          {copyBadgeText}
                        </span>
                      </div>
                    </div>

                    {/* Order Type & Table / Delivery Details Callout */}
                    <div className="mb-2.5 p-2 bg-slate-100 border border-slate-400 rounded-sm flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        {order.orderType === 'dine_in' && (
                          <>
                            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              طلب صالة - طاولة رقم [{order.tableNumber || 1}]
                              {order.tableGuests ? ` (${order.tableGuests} أفراد)` : ''}
                            </span>
                          </>
                        )}
                        {order.orderType === 'takeaway' && (
                          <>
                            <Receipt className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              طلب تيك أواي (سفري) - نداء رقم: #{order.dailySequenceNumber || order.orderNumber.slice(-3)}
                            </span>
                          </>
                        )}
                        {order.orderType === 'delivery' && (
                          <>
                            <Bike className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              دليفري وتوصيل · الطيار: {order.deliveryDriverName || 'غير معين'}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-700">
                        مسلسل اليوم: #{order.dailySequenceNumber || 1}
                      </span>
                    </div>

                    {/* Order Metadata */}
                    <div
                      className={`grid grid-cols-2 gap-2 mb-3 pb-2.5 border-b border-dashed border-slate-400 ${
                        paperFormat === 'thermal' ? 'text-[11px]' : 'text-xs sm:text-sm'
                      }`}
                    >
                      <div>
                        <span className="text-slate-500">رقم الفاتورة: </span>
                        <strong className="font-mono font-bold text-slate-950">
                          {order.orderNumber}
                        </strong>
                      </div>
                      <div className="text-left">
                        <span className="font-mono text-slate-800 font-semibold">
                          {order.date} · {order.time}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">الكاشير: </span>
                        <span className="font-semibold text-slate-900">{order.cashierName}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-slate-500">طريقة الدفع: </span>
                        <strong className="text-slate-950">
                          {getPaymentMethodLabel(order.paymentMethod)}
                        </strong>
                      </div>
                    </div>

                    {/* Customer & Delivery Destination Box */}
                    {(order.customerName || order.deliveryAddress) && (
                      <div className="mb-3 p-2.5 bg-slate-50 border border-slate-300 rounded text-xs space-y-1">
                        {order.customerName && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 font-semibold">العميل:</span>
                            <div className="text-right">
                              <strong className="text-slate-950 block">{order.customerName}</strong>
                              {(order.customerPhone || order.deliveryPhone) && (
                                <span className="text-[10px] font-mono text-slate-600 block">
                                  هاتف: {order.customerPhone || order.deliveryPhone}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {order.deliveryAddress && (
                          <div className="border-t border-slate-200 pt-1 text-slate-700">
                            <span className="font-semibold">عنوان التوصيل:</span>{' '}
                            <span>{order.deliveryAddress}</span>
                          </div>
                        )}
                        {isCredit && order.customerBalanceAfter !== undefined && (
                          <div className="flex justify-between border-t border-slate-300 pt-1">
                            <span className="text-slate-700 font-medium">
                              إجمالي مديونية العميل بعد الفاتورة:
                            </span>
                            <strong className="font-mono font-bold text-slate-950">
                              {formatCurrency(order.customerBalanceAfter, settings.currency)}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Line Items Table */}
                    <table
                      className={`w-full text-right mb-3 border-b-2 border-slate-900 pb-2 ${
                        paperFormat === 'thermal' ? 'text-[11px]' : 'text-xs sm:text-sm'
                      }`}
                    >
                      <thead>
                        <tr className="border-b-2 border-slate-800 text-slate-700 bg-slate-50">
                          <th className="py-1.5 px-1">الصنف / الوجبة</th>
                          <th className="py-1.5 px-1 text-center">الكمية</th>
                          <th className="py-1.5 px-1">سعر الوحدة</th>
                          <th className="py-1.5 px-1 text-left">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dotted divide-slate-300">
                        {order.lines.map((line, i) => (
                          <tr key={i}>
                            <td className="py-2 px-1 font-bold text-slate-950">
                              {line.menuItemName}
                              {line.notes && (
                                <span className="block text-[10px] text-amber-800 font-normal">
                                  ({line.notes})
                                </span>
                              )}
                              {paperFormat === 'standard' && line.code && (
                                <span className="block text-[10px] font-mono text-slate-500">
                                  {line.code}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-1 text-center font-mono font-bold text-slate-900">
                              {line.qty}
                            </td>
                            <td className="py-2 px-1 font-mono text-slate-800">
                              {(line.unitPrice / 100).toFixed(2)}
                            </td>
                            <td className="py-2 px-1 text-left font-mono font-black text-slate-950">
                              {(line.totalPrice / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals Summary */}
                    <div className="space-y-1.5 text-xs mb-3">
                      <div className="flex justify-between text-slate-600">
                        <span>عدد الأصناف ({order.lines.length}):</span>
                        <span className="font-mono font-bold">
                          إجمالي القطع: {order.lines.reduce((s, l) => s + l.qty, 0)}
                        </span>
                      </div>

                      {order.discount > 0 && (
                        <>
                          <div className="flex justify-between text-slate-700">
                            <span>الإجمالي الفرعي قبل الخصم:</span>
                            <span className="font-mono">
                              {formatCurrency(order.subtotal, settings.currency)}
                            </span>
                          </div>
                          {order.couponCode && (
                            <div className="p-1.5 bg-emerald-50 border border-emerald-300 rounded text-[11px] text-emerald-900 font-semibold space-y-0.5">
                              <div className="flex justify-between">
                                <span>العرض التسويقي المطبق:</span>
                                <span className="font-mono font-bold">كود: {order.couponCode}</span>
                              </div>
                              {order.promotionTitle && (
                                <div className="text-[10px] text-emerald-700">
                                  {order.promotionTitle}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex justify-between text-slate-800 font-semibold">
                            <span>إجمالي الخصم الممنوح:</span>
                            <span className="font-mono text-emerald-700 font-bold">
                              -{formatCurrency(order.discount, settings.currency)}
                            </span>
                          </div>
                        </>
                      )}

                      {order.deliveryFee && order.deliveryFee > 0 ? (
                        <div className="flex justify-between text-slate-800">
                          <span>خدمة التوصيل (دليفري):</span>
                          <span className="font-mono font-bold">
                            +{formatCurrency(order.deliveryFee, settings.currency)}
                          </span>
                        </div>
                      ) : null}

                      <div className="flex justify-between items-center bg-slate-100 border-2 border-slate-900 p-2.5 rounded font-black text-sm">
                        <span>صافي الإجمالي المطلوب:</span>
                        <span className="font-mono text-base sm:text-lg">
                          {formatCurrency(order.totalAmount, settings.currency)}
                        </span>
                      </div>

                      {order.paymentRef && (
                        <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                          <span>رقم مرجع العملية الإلكترونية:</span>
                          <span className="font-mono font-bold">{order.paymentRef}</span>
                        </div>
                      )}
                      {order.notes && (
                        <div className="p-2 bg-slate-50 border border-slate-300 rounded text-[11px] text-slate-700">
                          <strong>ملاحظات الطلب:</strong> {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Signatures (Credit or when toggled on) */}
                    {showSignatures && (
                      <div className="mt-4 pt-3 border-t border-dashed border-slate-400 text-center space-y-4">
                        {isCredit && (
                          <p className="text-[10px] font-bold text-slate-800">
                            أقر أنا العميل الموضح أعلاه باستلام الأصناف بحالة جيدة وقيد القيمة بالآجل على حسابي
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-[11px]">
                          <div className="space-y-6">
                            <span className="block text-slate-600 font-bold">
                              توقيع العميل / المستلم
                            </span>
                            <div className="border-t border-slate-800 pt-1">
                              (......................)
                            </div>
                          </div>
                          <div className="space-y-6">
                            <span className="block text-slate-600 font-bold">توقيع الكاشير</span>
                            <div className="border-t border-slate-800 pt-1 font-semibold">
                              {order.cashierName}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Verification Stamp & Barcode Footer */}
                    {showVerificationStamp && (
                      <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold">
                          <Stamp className="w-3 h-3" />
                          فاتورة معتمدة · FastRest POS
                        </span>
                        <span className="font-mono tracking-widest">*{order.orderNumber}*</span>
                      </div>
                    )}

                    <div className="mt-2 text-center text-[10px] text-slate-500 pt-1">
                      {settings.footerNote} · شكراً لزيارتكم
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    </div>
  );
};
